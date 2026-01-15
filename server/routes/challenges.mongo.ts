import { getCollection } from "../config/mongo";
import { ObjectId } from "mongodb";
import { AuthRequest } from "../utils/auth";
import type { RequestHandler } from "express";

const PISTON_API_URL = "https://emkc.org/api/v2/piston";
const CODE_EXECUTION_TIMEOUT = 10000; // increase to 10s
const MAX_CODE_LENGTH = 50000;

const SUPPORTED_LANGUAGES: Record<string, any> = {
  python: { name: "Python", version: "3.10.0", piston: "python" },
  java: { name: "Java", version: "15.0.2", piston: "java" },
  cpp: { name: "C++", version: "g++ 9.4.0", piston: "cpp" },
  javascript: {
    name: "JavaScript",
    version: "16.14.0",
    piston: "nodejs",
  },
  go: { name: "Go", version: "1.16.2", piston: "go" },
  csharp: { name: "C#", version: ".NET 5.0", piston: "csharp" },
  rust: { name: "Rust", version: "1.68.2", piston: "rust" },
};

export const getDailyChallenge: RequestHandler = async (req, res) => {
  console.debug("getDailyChallenge called", {
    url: req.url,
    method: req.method,
    headers: req.headers,
  });
  try {
    const challenges = await getCollection("challenges");
    const today = new Date();
    const start = new Date(today.toISOString().slice(0, 10));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const challenge = await challenges.findOne({
      is_daily: true,
      is_active: true,
      publish_date: { $gte: start, $lt: end },
    });

    if (!challenge) {
      console.debug("No daily challenge found for today, attempting fallback");
      // fallback: return any active daily challenge (last available)
      const fallback = await challenges.findOne({
        is_daily: true,
        is_active: true,
      });
      if (fallback) {
        return res.json({
          success: true,
          message: "Daily challenge retrieved (fallback - latest active daily)",
          data: { challenge: fallback },
        });
      }

      return res.status(404).json({
        success: false,
        message: "No daily challenge available for today",
      });
    }

    res.json({
      success: true,
      message: "Daily challenge retrieved successfully",
      data: { challenge },
    });
  } catch (e: any) {
    console.error("Daily challenge (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const getChallengesList: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(
      50,
      Math.max(1, parseInt(req.query.per_page as string) || 20),
    );
    const difficulty = (req.query.difficulty as string) || "";
    const search = (req.query.search as string) || "";

    const filter: any = { is_active: true };
    if (["easy", "medium", "hard"].includes(difficulty))
      filter.difficulty = difficulty;
    if (search)
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];

    const challengesCol = await getCollection("challenges");
    const total = await challengesCol.countDocuments(filter);

    const items = await challengesCol
      .find(filter)
      .sort({ publish_date: -1, _id: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray();

    // solved_count from submissions
    const submissions = await getCollection("submissions");
    const ids = items.map((c: any) => c._id.toString());
    const solvedAgg = await submissions
      .aggregate([
        { $match: { challenge_id: { $in: ids }, status: "accepted" } },
        { $group: { _id: "$challenge_id", count: { $sum: 1 } } },
      ])
      .toArray();
    const solvedMap = new Map(solvedAgg.map((d: any) => [d._id, d.count]));
    items.forEach(
      (c: any) => (c.solved_count = solvedMap.get(c._id.toString()) || 0),
    );

    res.json({
      success: true,
      message: "Challenges retrieved successfully",
      data: {
        items,
        pagination: {
          current_page: page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
          has_more: page * perPage < total,
        },
      },
    });
  } catch (e: any) {
    console.error("Challenges list (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const getChallenge: RequestHandler = async (req, res) => {
  try {
    const id = (req.query.id as string) || "";
    const challenges = await getCollection("challenges");

    const filter: any = { $or: [{ id }] };
    try {
      if (ObjectId.isValid(id)) {
        const oid = new ObjectId(id);
        filter.$or.unshift({ _id: oid });
      }
    } catch {}

    const challenge = await challenges.findOne(filter);
    if (!challenge)
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });

    res.json({
      success: true,
      message: "Challenge retrieved successfully",
      data: { challenge, user_solved: false },
    });
  } catch (e: any) {
    console.error("Get challenge (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const runCode: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    const { language, code, input } = req.body || {};

    if (!language || !code || input === undefined)
      return res.status(400).json({
        success: false,
        message: "language, code, and input are required",
      });
    if (!SUPPORTED_LANGUAGES[language])
      return res
        .status(400)
        .json({ success: false, message: "Unsupported programming language" });
    if (code.length > MAX_CODE_LENGTH)
      return res
        .status(400)
        .json({ success: false, message: "Code is too long" });

    const result = await executeCode(code, language, input);
    res.json({
      success: true,
      message: "Code executed successfully",
      data: result,
    });
  } catch (e: any) {
    console.error("Run code (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const submitCode: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    const { challenge_id, language, code } = req.body || {};
    if (!challenge_id || !language || !code)
      return res.status(400).json({
        success: false,
        message: "Challenge ID, language, and code are required",
      });
    if (!SUPPORTED_LANGUAGES[language])
      return res
        .status(400)
        .json({ success: false, message: "Unsupported programming language" });
    if (code.length > MAX_CODE_LENGTH)
      return res
        .status(400)
        .json({ success: false, message: "Code is too long" });

    const challenges = await getCollection("challenges");
    let filter: any = { $or: [{ id: String(challenge_id) }] };
    try {
      if (ObjectId.isValid(String(challenge_id))) {
        filter.$or.unshift({ _id: new ObjectId(String(challenge_id)) });
      }
    } catch {}
    const challenge = await challenges.findOne(filter);
    if (!challenge)
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });

    const getPointsForChallenge = (c: any) => {
      if (typeof c.points === "number" && !Number.isNaN(c.points))
        return c.points;
      const diff = String(c.difficulty || "").toLowerCase();
      if (diff === "easy") return 25;
      if (diff === "medium") return 50;
      if (diff === "hard") return 100;
      return 25;
    };

    const challengeKey = (challenge._id || challenge.id).toString();
    const submissionsEarly = await getCollection("submissions");
    const lastAccepted = await submissionsEarly
      .find({
        user_id: req.user.username,
        challenge_id: challengeKey,
        status: "accepted",
      })
      .sort({ submitted_at: -1 })
      .limit(1)
      .toArray();
    if (lastAccepted.length) {
      return res.json({
        success: true,
        message: "Already solved",
        data: {
          submission_id: lastAccepted[0]._id.toString(),
          status: "accepted",
          score: lastAccepted[0].score || getPointsForChallenge(challenge),
          execution_time: lastAccepted[0].execution_time || 0,
          memory_used: lastAccepted[0].memory_used || 0,
          test_results: lastAccepted[0].test_results || [],
          error_message: null,
          alreadyAccepted: true,
        },
      });
    }

    const test_cases = challenge.test_cases || [];
    const results = await executeCodeWithTestCases(
      code,
      language,
      test_cases,
      challenge.time_limit,
      challenge.memory_limit,
    );

    const passed = results.test_results.filter(
      (r: any) => r.status === "passed",
    );
    const status =
      passed.length === test_cases.length
        ? "accepted"
        : results.status !== "success"
          ? results.status
          : "wrong_answer";

    const submissions = await getCollection("submissions");
    const prevBestDoc = await submissions
      .find({
        user_id: req.user.username,
        challenge_id: challengeKey,
        status: "accepted",
      })
      .sort({ score: -1 })
      .limit(1)
      .toArray();
    const prevBest = (prevBestDoc[0]?.score as number) || 0;
    const attemptScore =
      status === "accepted" ? getPointsForChallenge(challenge) : 0;
    const bestNow = Math.max(prevBest, attemptScore);
    const delta = Math.max(0, bestNow - prevBest);
    const alreadyAccepted = prevBest > 0;
    const score = attemptScore;

    const inserted = await submissions.insertOne({
      user_id: req.user.username,
      challenge_id: challengeKey,
      challenge_title: challenge.title,
      difficulty: challenge.difficulty || null,
      language,
      code,
      status,
      execution_time: results.execution_time,
      memory_used: results.memory_used,
      test_results: results.test_results,
      score,
      error_message: results.error_message,
      submitted_at: new Date(),
    });

    // Update user stats (points, streak, challenges_solved)
    const usersCol = await getCollection("users");
    const userDoc = await usersCol.findOne({ username: req.user.username });
    if (userDoc) {
      const now = new Date();
      let streakUpdate: any = {};
      if (status === "accepted") {
        const last = userDoc.last_activity
          ? new Date(userDoc.last_activity)
          : null;

        // Use IST (Asia/Kolkata) for day boundaries so streaks align with user's expected local day
        const formatDateInIST = (d: Date) =>
          new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
            d,
          ); // YYYY-MM-DD

        const todayStr = formatDateInIST(now);
        const yesterdayStr = formatDateInIST(
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
        );
        const lastStr = last ? formatDateInIST(last) : null;

        const sameDay = lastStr && lastStr === todayStr;
        const prevDay = lastStr && lastStr === yesterdayStr;

        if (!sameDay) {
          streakUpdate.streak_days = prevDay
            ? (userDoc.streak_days || 0) + 1
            : 1;
        }
      }

      const update: any = {
        $set: {
          last_activity: now,
          updated_at: now,
          ...(streakUpdate.streak_days !== undefined
            ? { streak_days: streakUpdate.streak_days }
            : {}),
        },
      };
      if (delta > 0) update.$inc = { ...(update.$inc || {}), points: delta };

      // Increment challenges_solved only when first time accepted for this challenge
      if (!alreadyAccepted && status === "accepted") {
        update.$inc = { ...(update.$inc || {}), challenges_solved: 1 };
      }

      await usersCol.updateOne({ _id: userDoc._id }, update);
    }

    res.json({
      success: true,
      message: "Code submitted and evaluated successfully",
      data: {
        submission_id: inserted.insertedId.toString(),
        status,
        score,
        execution_time: results.execution_time,
        memory_used: results.memory_used,
        test_results: results.test_results,
        error_message: results.error_message,
        alreadyAccepted,
        bestPoints: bestNow,
      },
    });
  } catch (e: any) {
    console.error("Submit code (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const getSupportedLanguages: RequestHandler = (_req, res) => {
  res.json({
    success: true,
    message: "Supported languages retrieved successfully",
    data: { languages: SUPPORTED_LANGUAGES },
  });
};

// Get latest submission for current user & challenge
export const getLatestSubmission: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const challengeId = (req.query.challenge_id as string) || "";
    if (!challengeId)
      return res
        .status(400)
        .json({ success: false, message: "challenge_id is required" });

    const submissions = await getCollection("submissions");
    const docs = await submissions
      .find({ user_id: user.username, challenge_id: String(challengeId) })
      .sort({ submitted_at: -1 })
      .limit(1)
      .toArray();
    if (!docs || docs.length === 0)
      return res.json({ success: false, message: "No submissions found" });
    const s = docs[0];
    return res.json({
      success: true,
      message: "Latest submission retrieved",
      data: {
        submission_id: s._id?.toString?.() || s._id,
        status: s.status,
        score: s.score,
        execution_time: s.execution_time,
        memory_used: s.memory_used,
        test_results: s.test_results || [],
        error_message: s.error_message || null,
        code: s.code || null,
      },
    });
  } catch (e: any) {
    console.error("Get latest submission error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

function normalizeStdin(s: string): string {
  if (typeof s !== "string") return "";
  // Convert common escaped sequences into real characters
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

async function executeCode(code: string, language: string, input: string) {
  const lang = SUPPORTED_LANGUAGES[language];
  const fileName =
    language === "python"
      ? "main.py"
      : language === "java"
        ? "Main.java"
        : language === "cpp"
          ? "main.cpp"
          : language === "javascript"
            ? "index.js"
            : language === "go"
              ? "main.go"
              : language === "csharp"
                ? "Program.cs"
                : language === "rust"
                  ? "main.rs"
                  : "main.txt";
  const payload = {
    language: lang.piston,
    version: lang.version,
    files: [{ name: fileName, content: code }],
    stdin: normalizeStdin(input),
    compile_timeout: 15000,
    run_timeout: CODE_EXECUTION_TIMEOUT,
    args: [],
  } as any;

  let lastError: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(`${PISTON_API_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        lastError = new Error(
          `Piston error ${resp.status}: ${text || resp.statusText}`,
        );
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      const result = await resp.json();

      let status = "success";
      let error_message: string | null = null;
      if (result.compile && result.compile.code !== 0) {
        status = "compilation_error";
        error_message = result.compile.stderr;
      } else if (result.run && result.run.code !== 0) {
        status = "runtime_error";
        error_message = result.run.stderr;
      }

      return {
        output: result.run?.stdout || "",
        error: error_message,
        execution_time: Number(result.run?.time || 0),
        memory_used: 0,
        status,
      };
    } catch (e: any) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return {
    output: "",
    error: lastError?.message || "Code execution service unavailable",
    execution_time: 0,
    memory_used: 0,
    status: "service_unavailable",
  };
}

async function executeCodeWithTestCases(
  code: string,
  language: string,
  test_cases: Array<{ input: string; output: string }>,
  _time_limit: number,
  _memory_limit: number,
) {
  const results: any = {
    test_results: [],
    execution_time: 0,
    memory_used: 0,
    status: "success",
    error_message: null,
  };

  for (let i = 0; i < test_cases.length; i++) {
    const tc = test_cases[i];
    try {
      const result = await executeCode(
        code,
        language,
        normalizeStdin(tc.input),
      );
      const passed = String(result.output).trim() === String(tc.output).trim();
      results.test_results.push({
        test_case: i + 1,
        input: tc.input,
        expected_output: tc.output,
        actual_output: result.output,
        status: passed ? "passed" : "failed",
        execution_time: result.execution_time,
        error: result.error,
      });
      results.execution_time = Math.max(
        results.execution_time,
        result.execution_time,
      );
      if (result.status !== "success") {
        results.status = result.status;
        results.error_message = result.error;
        break;
      }
    } catch (e: any) {
      results.status = "service_unavailable";
      results.error_message = e?.message || String(e);
      break;
    }
  }

  return results;
}

export const getLeaderboard: RequestHandler = async (req, res) => {
  try {
    const usersCol = await getCollection("users");
    // fetch top users by points (limit 100)
    const top = await usersCol
      .find({ is_active: true })
      .project({
        username: 1,
        first_name: 1,
        last_name: 1,
        email: 1,
        points: 1,
        streak_days: 1,
        institution_id: 1,
        institution_name: 1,
        profile_image: 1,
        created_at: 1,
        last_activity: 1,
        // optional fields that may exist
        avg_rating: 1,
        rating: 1,
        specializations: 1,
      })
      .sort({ points: -1, streak_days: -1, _id: 1 })
      .limit(100)
      .toArray();

    const submissionsCol = await getCollection("submissions");

    // If request asks specifically for battles-only leaderboard, aggregate battle points
    const type = String(req.query?.type || "").toLowerCase();
    if (type === "battles") {
      // Aggregate per-user battle points and stats
      // Improved aggregation: compute best (max) score per user per battle, then sum across battles to avoid double-counting multiple submissions in same battle
      const battleAgg = await submissionsCol
        .aggregate([
          { $match: { battle_id: { $ne: null } } },
          // Group by user + battle to find best score and whether the battle was won/lost
          {
            $group: {
              _id: { user_id: "$user_id", battle_id: "$battle_id" },
              bestScore: { $max: { $ifNull: ["$score", 0] } },
              wonFlag: {
                $max: {
                  $cond: [{ $in: ["$status", ["won", "accepted"]] }, 1, 0],
                },
              },
              lostFlag: {
                $max: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] },
              },
              submissions: { $sum: 1 },
            },
          },
          // Now aggregate per user, summing bestScore across battles
          {
            $group: {
              _id: "$_id.user_id",
              battlePoints: { $sum: "$bestScore" },
              battlesWon: { $sum: "$wonFlag" },
              battlesLost: { $sum: "$lostFlag" },
              submissions: { $sum: "$submissions" },
            },
          },
          { $match: { battlePoints: { $gt: 0 } } },
          { $sort: { battlePoints: -1 } },
          { $limit: 100 },
        ])
        .toArray();

      const usersCol = await getCollection("users");
      const items = [];
      let rank = 1;
      for (const b of battleAgg) {
        const username = b._id;
        const u = await usersCol.findOne({ username });
        if (!u) continue;
        items.push({
          id: u._id?.toString?.() || u._id,
          rank: rank++,
          username: u.username,
          fullName:
            `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username,
          avatar: u.profile_image || "",
          battlePoints: b.battlePoints || 0,
          stats: {
            battlesWon: b.battlesWon || 0,
            battlesLost: b.battlesLost || 0,
            submissions: b.submissions || 0,
            avgRating: Math.round(Number(u.avg_rating || u.rating || 0) || 0),
          },
        });
      }

      return res.json({
        success: true,
        message: "Battle Leaderboard",
        data: { items },
      });
    }

    // Default unified leaderboard (existing behavior)

    // Aggregate submission counts for all top users in one query for performance
    const usernames = top.map((u: any) => u.username).filter(Boolean);
    const agg: any[] = [];
    if (usernames.length) {
      agg.push(
        {
          $match: {
            user_id: { $in: usernames },
          },
        },
        {
          $group: {
            _id: "$user_id",
            challengesSolved: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$challenge_id", null] },
                      { $eq: ["$status", "accepted"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            // Note: battles counts are kept for display but their points will be
            // excluded from the main totalPoints (so challenges and battles are treated separately)
            battlesWon: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$battle_id", null] },
                      { $in: ["$status", ["won", "accepted"]] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            battlesLost: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$battle_id", null] },
                      { $eq: ["$status", "lost"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            hackathonsParticipated: {
              $sum: { $cond: [{ $ne: ["$hackathon_id", null] }, 1, 0] },
            },
            hackathonsWon: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$hackathon_id", null] },
                      { $eq: ["$status", "won"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      );
    }

    const aggResults = agg.length
      ? await submissionsCol.aggregate(agg).toArray()
      : [];
    const statsMap = new Map<string, any>();
    for (const r of aggResults) {
      statsMap.set(r._id, r);
    }

    // Additionally compute points coming from challenge submissions and battles separately
    // so that we can exclude these from the main totalPoints (they will still be shown in stats)
    const challengePointsAgg =
      usernames.length > 0
        ? await submissionsCol
            .aggregate([
              {
                $match: {
                  user_id: { $in: usernames },
                  challenge_id: { $ne: null },
                  battle_id: null, // exclude battle submissions
                },
              },
              {
                $group: {
                  _id: { user_id: "$user_id", challenge_id: "$challenge_id" },
                  bestScore: { $max: { $ifNull: ["$score", 0] } },
                },
              },
              {
                $group: {
                  _id: "$_id.user_id",
                  challengePoints: { $sum: "$bestScore" },
                },
              },
            ])
            .toArray()
        : [];

    const challengePointsMap = new Map<string, number>();
    for (const c of challengePointsAgg)
      challengePointsMap.set(c._id, c.challengePoints || 0);

    const battlePointsAggForUsers =
      usernames.length > 0
        ? await submissionsCol
            .aggregate([
              {
                $match: {
                  user_id: { $in: usernames },
                  battle_id: { $ne: null },
                },
              },
              {
                $group: {
                  _id: { user_id: "$user_id", battle_id: "$battle_id" },
                  bestScore: { $max: { $ifNull: ["$score", 0] } },
                  wonFlag: {
                    $max: {
                      $cond: [{ $in: ["$status", ["won", "accepted"]] }, 1, 0],
                    },
                  },
                  lostFlag: {
                    $max: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] },
                  },
                  submissions: { $sum: 1 },
                },
              },
              {
                $group: {
                  _id: "$_id.user_id",
                  battlePoints: { $sum: "$bestScore" },
                  battlesWon: { $sum: "$wonFlag" },
                  battlesLost: { $sum: "$lostFlag" },
                  submissions: { $sum: "$submissions" },
                },
              },
            ])
            .toArray()
        : [];

    const battlePointsMap = new Map<string, any>();
    for (const b of battlePointsAggForUsers) battlePointsMap.set(b._id, b);

    const items: any[] = top.map((u: any, idx: number) => {
      const s = statsMap.get(u.username) || {};
      const challengesSolved = Number(s.challengesSolved || 0);
      const battlesSolvedFromStats = Number(s.battlesWon || 0);
      const battlesLostFromStats = Number(s.battlesLost || 0);
      const hackathonsParticipated = Number(s.hackathonsParticipated || 0);
      const hackathonsWon = Number(s.hackathonsWon || 0);

      const challengePoints = Number(challengePointsMap.get(u.username) || 0);
      const battleAggForUser = battlePointsMap.get(u.username) || null;
      const battlePoints = Number(
        (battleAggForUser && (battleAggForUser.battlePoints || 0)) || 0,
      );
      const battlePointsWon = Number(
        (battleAggForUser && (battleAggForUser.battlesWon || 0)) || 0,
      );
      const battlePointsLost = Number(
        (battleAggForUser && (battleAggForUser.battlesLost || 0)) || 0,
      );

      // Determine final battlesWon/battlesLost: prefer aggregated per-user battle aggregation if available,
      // otherwise fall back to counts from the general submissions aggregation (which will be 0 when none exist).
      const finalBattlesWon = battleAggForUser
        ? battlePointsWon
        : battlesSolvedFromStats || 0;
      const finalBattlesLost = battleAggForUser
        ? battlePointsLost
        : battlesLostFromStats || 0;

      // avgRating: prefer avg_rating or rating fields on user doc if available
      const avgRating = (u.avg_rating || u.rating || 0) as number;

      // Adjust total points to exclude points that came from challenges and battles
      const rawPoints = Number(u.points || 0);
      const adjustedPoints = Math.max(
        0,
        rawPoints - challengePoints - battlePoints,
      );

      return {
        id: u._id?.toString?.() || u._id,
        rank: idx + 1,
        username: u.username,
        fullName:
          `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username,
        avatar: u.profile_image || "",
        institution: u.institution_name
          ? { name: u.institution_name, shortName: u.institution_name }
          : null,
        location: "",
        // totalPoints now excludes direct challenge & battle points so these categories are treated separately
        totalPoints: adjustedPoints,
        rawPoints,
        stats: {
          challengesSolved,
          challengePoints,
          // If user hasn't participated in any battle, finalBattlesWon will be 0
          battlesWon: finalBattlesWon,
          battlesLost: finalBattlesLost,
          battlePoints,
          hackathonsParticipated,
          hackathonsWon,
          currentStreak: Number(u.streak_days || 0),
          longestStreak: Number((u.longest_streak as number) || 0),
          avgRating: Math.round(Number(avgRating) || 0),
          specializations: Array.isArray(u.specializations)
            ? u.specializations
            : [],
        },
        joinDate: u.created_at,
        lastActive: u.last_activity,
      };
    });

    res.json({ success: true, message: "Leaderboard", data: { items } });
  } catch (e: any) {
    console.error("Leaderboard (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};
