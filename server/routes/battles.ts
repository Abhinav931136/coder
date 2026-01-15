import { RequestHandler } from "express";
import { getCollection } from "../config/mongo";
import { requireAuth, extractToken, verifyToken } from "../utils/auth";

const PISTON_API_URL = "https://emkc.org/api/v2/piston";
const MAX_CODE_LENGTH = 50000;
const CODE_EXECUTION_TIMEOUT = 10000; // 10s

const SUPPORTED_LANGUAGES: Record<string, any> = {
  python: {
    name: "Python",
    version: "3.10.0",
    piston: "python",
    file: "main.py",
  },
  java: { name: "Java", version: "15.0.2", piston: "java", file: "Main.java" },
  cpp: { name: "C++", version: "9.4.0", piston: "cpp", file: "main.cpp" },
  javascript: {
    name: "JavaScript",
    version: "16.14.0",
    piston: "javascript",
    file: "index.js",
  },
  go: { name: "Go", version: "1.16.2", piston: "go", file: "main.go" },
  csharp: { name: "C#", version: "5.0", piston: "csharp", file: "Program.cs" },
  rust: { name: "Rust", version: "1.68.2", piston: "rust", file: "main.rs" },
};

async function executeCode(code: string, language: string, input: string) {
  if (!language || !code)
    return { output: "", error: "language and code required" };
  const langKey = String(language || "").toLowerCase();
  const lang = SUPPORTED_LANGUAGES[langKey] || SUPPORTED_LANGUAGES["python"];
  if (code.length > MAX_CODE_LENGTH)
    return { output: "", error: "Code too long" };

  const payload: any = {
    language: lang.piston,
    version: lang.version,
    files: [{ name: lang.file, content: code }],
    stdin: input || "",
    run_timeout: CODE_EXECUTION_TIMEOUT,
    compile_timeout: 15000,
  };

  try {
    const resp = await fetch(`${PISTON_API_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return { output: "", error: `Piston error ${resp.status}: ${t}` };
    }
    const result = await resp.json();
    let errMsg: any = null;
    if (result.compile && result.compile.code !== 0)
      errMsg = result.compile.stderr;
    else if (result.run && result.run.code !== 0) errMsg = result.run.stderr;
    return {
      output: result.run?.stdout || "",
      error: errMsg,
      time: Number(result.run?.time || 0),
      status: errMsg ? "error" : "success",
    };
  } catch (e: any) {
    return { output: "", error: e?.message || String(e) };
  }
}

async function runTestCases(
  code: string,
  language: string,
  test_cases: Array<{ input: string; output: string }>,
) {
  const results: any[] = [];
  for (const tc of test_cases) {
    const r = await executeCode(code, language, tc.input || "");
    const passed =
      String(r.output || "").trim() === String(tc.output || "").trim();
    results.push({
      test_case: tc,
      passed,
      output: r.output,
      error: r.error,
      time: r.time || 0,
    });
    if (r.error && String(r.error).length) {
      // stop on runtime/compilation error
      break;
    }
  }
  return results;
}

// List battles (query: status=available|active|all)
export const listBattles: RequestHandler = async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const battlesCol = await getCollection("battles");
    const filter: any = {};

    // attempt to detect requesting user from Authorization header (optional)
    let requestingUsername: string | null = null;
    try {
      const token = extractToken(req as any);
      if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.username) requestingUsername = decoded.username;
      }
    } catch {}

    if (status === "available") {
      // Show waiting public battles. Also include invited battles only if the current
      // requesting user is the invitee.
      filter.$or = [{ status: "waiting" }];
      if (requestingUsername) {
        filter.$or.push({ status: "invited", invited: requestingUsername });
      }
    }
    if (status === "active") filter.status = { $in: ["in_progress", "active"] };
    if (status === "history" || status === "completed")
      filter.status = "completed";

    const raw = await battlesCol
      .find(filter)
      .sort({ created_at: -1 })
      .toArray();
    // normalize _id to string for API consumers
    const items = raw.map((b: any) => ({
      ...b,
      _id: b._id && b._id.toString ? b._id.toString() : b._id,
    }));
    res.json({ success: true, message: "Battles retrieved", data: { items } });
  } catch (e: any) {
    console.error("List battles error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create a battle
export const createBattle: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const body = req.body || {};

    // Debug incoming request to aid debugging (non-sensitive)
    try {
      console.debug("Create battle request", {
        username: user.username,
        body: { ...body, code: undefined },
      });
    } catch {}

    const title = String(body.title || body.name || "").trim();
    const challenge_title = String(body.challenge_title || "").trim();
    const duration_minutes = Math.max(1, Number(body.duration_minutes || 30));
    const difficulty = String(body.difficulty || "easy");
    const language = String(body.language || "python");
    const prize_points = Math.max(0, Number(body.prize_points || 25));

    if (!title)
      return res
        .status(422)
        .json({ success: false, message: "Title required" });

    const battlesCol = await getCollection("battles");
    const now = new Date();
    const opponent_username = String(
      body.opponent_username || body.opponent || "",
    ).trim();
    const challenge_id = body.challenge_id || body.challengeId || null;

    const doc: any = {
      title,
      challenge_title,
      challenge_id: challenge_id || null,
      creator: { username: user.username },
      status: opponent_username ? "invited" : "waiting",
      duration_minutes,
      difficulty,
      language,
      prize_points,
      created_at: now,
      updated_at: now,
    };

    if (opponent_username) {
      // store invited username; opponent not set until they accept
      doc.invited = opponent_username;
    }

    const r = await battlesCol.insertOne(doc);
    const id =
      r.insertedId && r.insertedId.toString
        ? r.insertedId.toString()
        : r.insertedId;

    res.status(201).json({
      success: true,
      message: "Battle created",
      data: { id, battle: { ...doc, _id: id } },
    });
  } catch (e: any) {
    console.error("Create battle error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error",
        ...(debug ? { error: e?.message || String(e) } : {}),
      });
  }
};

// Join battle (simple: set opponent and change status to in_progress)
export const joinBattle: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const body = req.body || {};
    const id = body.id || req.query.id;
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });

    const battlesCol = await getCollection("battles");
    // Support id being string of ObjectId or string key
    let battle: any = null;
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(String(id))) {
        battle = await battlesCol.findOne({ _id: new ObjectId(String(id)) });
      }
    } catch (e) {
      // ignore
    }
    if (!battle) {
      // try matching by string _id or id field
      battle = await battlesCol.findOne({ $or: [{ _id: id }, { id }] });
    }

    if (!battle)
      return res
        .status(404)
        .json({ success: false, message: "Battle not found" });
    if (battle.status !== "waiting")
      return res
        .status(409)
        .json({ success: false, message: "Battle not joinable" });

    const updateFilter: any = {};
    // ensure we update by the actual _id stored type
    if (battle._id && battle._id.toString) updateFilter._id = battle._id;
    else if (battle._id) updateFilter._id = battle._id;
    else if (battle.id) updateFilter.id = battle.id;

    // Attempt atomic update: set opponent only if status is still 'waiting'
    const resUpdate = await battlesCol.updateOne(
      { ...updateFilter, status: "waiting" },
      {
        $set: {
          opponent: { username: user.username },
          status: "in_progress",
          started_at: new Date(),
          updated_at: new Date(),
        },
      },
    );
    if (!resUpdate || (resUpdate as any).modifiedCount === 0) {
      return res
        .status(409)
        .json({ success: false, message: "Battle no longer joinable" });
    }
    const updated = await battlesCol.findOne(updateFilter);
    // normalize id
    const out = {
      ...updated,
      _id:
        updated._id && updated._id.toString
          ? updated._id.toString()
          : updated._id,
    };
    res.json({
      success: true,
      message: "Joined battle",
      data: { battle: out },
    });
  } catch (e: any) {
    console.error("Join battle error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET single battle by id
export const getBattleById: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });
    const battlesCol = await getCollection("battles");
    let battle: any = null;
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(String(id)))
        battle = await battlesCol.findOne({ _id: new ObjectId(String(id)) });
    } catch {}
    if (!battle)
      battle = await battlesCol.findOne({ $or: [{ _id: id }, { id }] });
    if (!battle)
      return res
        .status(404)
        .json({ success: false, message: "Battle not found" });

    // If battle references a challenge, fetch basic challenge metadata (do not expose test_cases)
    let challengeMeta: any = null;
    if (battle.challenge_id) {
      try {
        const challengesCol = await getCollection("challenges");
        try {
          const { ObjectId } = await import("mongodb");
          if (ObjectId.isValid(String(battle.challenge_id))) {
            challengeMeta = await challengesCol.findOne({
              _id: new ObjectId(String(battle.challenge_id)),
            });
          }
        } catch (e) {}
        if (!challengeMeta)
          challengeMeta = await challengesCol.findOne({
            $or: [{ _id: battle.challenge_id }, { id: battle.challenge_id }],
          });
        if (challengeMeta) {
          // pick safe fields to expose
          challengeMeta = {
            id:
              challengeMeta._id && challengeMeta._id.toString
                ? challengeMeta._id.toString()
                : challengeMeta._id || challengeMeta.id,
            title: challengeMeta.title,
            description: challengeMeta.description,
            input_format: challengeMeta.input_format,
            output_format: challengeMeta.output_format,
            constraints: challengeMeta.constraints,
            examples: challengeMeta.examples || [],
            supported_languages: challengeMeta.supported_languages || [],
            points: challengeMeta.points || 0,
          };
        }
      } catch (e) {
        console.error("Failed to fetch challenge meta for battle", e);
      }
    }

    const out = {
      ...battle,
      _id:
        battle._id && battle._id.toString ? battle._id.toString() : battle._id,
    };
    if (challengeMeta) out.challenge = challengeMeta;
    res.json({
      success: true,
      message: "Battle retrieved",
      data: { battle: out },
    });
  } catch (e: any) {
    console.error("Get battle error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Accept an invitation
export const acceptBattle: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = req.body.id || req.query.id;
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });
    const battlesCol = await getCollection("battles");
    let battle: any = null;
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(String(id)))
        battle = await battlesCol.findOne({ _id: new ObjectId(String(id)) });
    } catch {}
    if (!battle)
      battle = await battlesCol.findOne({ $or: [{ _id: id }, { id }] });
    if (!battle)
      return res
        .status(404)
        .json({ success: false, message: "Battle not found" });
    if (battle.status !== "invited")
      return res
        .status(409)
        .json({ success: false, message: "Battle not invited" });
    if (
      (battle.invited ||
        battle.invited_username ||
        (battle.invited && battle.invited.username)) &&
      String(battle.invited) !== user.username &&
      String(battle.invited?.username || "") !== user.username
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not the invited user" });
    }
    const updateFilter: any = {};
    if (battle._id && battle._id.toString) updateFilter._id = battle._id;
    else if (battle._id) updateFilter._id = battle._id;
    else if (battle.id) updateFilter.id = battle.id;
    const now = new Date();
    const r = await battlesCol.updateOne(updateFilter, {
      $set: {
        opponent: { username: user.username },
        status: "in_progress",
        started_at: now,
        updated_at: now,
      },
      $unset: { invited: "" },
    });
    if (!r || (r as any).modifiedCount === 0)
      return res
        .status(500)
        .json({ success: false, message: "Unable to accept" });
    const updated = await battlesCol.findOne(updateFilter);
    const out = {
      ...updated,
      _id:
        updated._id && updated._id.toString
          ? updated._id.toString()
          : updated._id,
    };
    res.json({ success: true, message: "Accepted", data: { battle: out } });
  } catch (e: any) {
    console.error("Accept battle error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Decline invitation
export const declineBattle: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = req.body.id || req.query.id;
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });
    const battlesCol = await getCollection("battles");
    let battle: any = null;
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(String(id)))
        battle = await battlesCol.findOne({ _id: new ObjectId(String(id)) });
    } catch {}
    if (!battle)
      battle = await battlesCol.findOne({ $or: [{ _id: id }, { id }] });
    if (!battle)
      return res
        .status(404)
        .json({ success: false, message: "Battle not found" });
    if (battle.status !== "invited")
      return res
        .status(409)
        .json({ success: false, message: "Battle not invited" });
    if (
      String(battle.invited) !== user.username &&
      String(battle.invited?.username || "") !== user.username
    )
      return res
        .status(403)
        .json({ success: false, message: "Not the invited user" });
    // remove invitation
    const r = await battlesCol.updateOne(
      { _id: battle._id },
      {
        $unset: { invited: "" },
        $set: { status: "waiting", updated_at: new Date() },
      },
    );
    if (!r)
      return res
        .status(500)
        .json({ success: false, message: "Unable to decline" });
    const updated = await battlesCol.findOne({ _id: battle._id });
    const out = {
      ...updated,
      _id:
        updated._id && updated._id.toString
          ? updated._id.toString()
          : updated._id,
    };
    res.json({ success: true, message: "Declined", data: { battle: out } });
  } catch (e: any) {
    console.error("Decline battle error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get latest submission for current user & battle
export const getLatestBattleSubmission: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const battleId = (req.query.battle_id as string) || (req.query.id as string) || "";
    if (!battleId)
      return res
        .status(400)
        .json({ success: false, message: "battle_id is required" });

    const submissions = await getCollection("submissions");
    const docs = await submissions
      .find({ user_id: user.username, battle_id: String(battleId) })
      .sort({ submitted_at: -1 })
      .limit(1)
      .toArray();
    if (!docs || docs.length === 0)
      return res.json({ success: false, message: "No submissions found" });
    const s = docs[0];
    return res.json({
      success: true,
      message: "Latest battle submission retrieved",
      data: {
        submission_id: s._id?.toString?.() || s._id,
        status: s.status,
        points: s.score || s.points || 0,
        test_results: s.test_results || [],
        error_message: s.error_message || null,
        code: s.code || null,
      },
    });
  } catch (e: any) {
    console.error("Get latest battle submission error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Submit code for battle
export const submitBattle: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const body = req.body || {};
    const id = body.id || req.query.id;
    const language = String(body.language || "python");
    const code = String(body.code || "");
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });
    if (!code)
      return res.status(400).json({ success: false, message: "code required" });

    const battlesCol = await getCollection("battles");
    const submissions = await getCollection("submissions");
    let battle: any = null;
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(String(id)))
        battle = await battlesCol.findOne({ _id: new ObjectId(String(id)) });
    } catch {}
    if (!battle)
      battle = await battlesCol.findOne({ $or: [{ _id: id }, { id }] });
    if (!battle)
      return res
        .status(404)
        .json({ success: false, message: "Battle not found" });
    if (battle.status !== "in_progress")
      return res
        .status(409)
        .json({ success: false, message: "Battle not active" });
    // ensure user is participant
    const uname = user.username;
    if (
      battle.creator?.username !== uname &&
      battle.opponent?.username !== uname
    )
      return res
        .status(403)
        .json({ success: false, message: "Not a participant" });

    // Need challenge test cases
    if (!battle.challenge_id)
      return res
        .status(400)
        .json({ success: false, message: "No challenge associated" });
    const challenges = await getCollection("challenges");
    // Try to resolve challenge by ObjectId if possible
    let challenge: any = null;
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(String(battle.challenge_id))) {
        challenge = await challenges.findOne({
          _id: new ObjectId(String(battle.challenge_id)),
        });
      }
    } catch (e) {}
    if (!challenge) {
      challenge = await challenges.findOne({
        $or: [{ _id: battle.challenge_id }, { id: battle.challenge_id }],
      });
    }
    if (!challenge)
      return res
        .status(404)
        .json({ success: false, message: "Challenge not found" });

    // Support legacy storage: prefer challenge.test_cases, fallback to examples array
    let test_cases: Array<{ input: string; output: string }> = [];
    if (
      Array.isArray(challenge.test_cases) &&
      challenge.test_cases.length > 0
    ) {
      test_cases = challenge.test_cases.map((tc: any) => ({
        input: String(tc.input || ""),
        output: String(tc.output || ""),
      }));
    } else if (
      Array.isArray(challenge.examples) &&
      challenge.examples.length > 0
    ) {
      test_cases = challenge.examples.map((ex: any) => ({
        input: String(ex.input || ""),
        output: String(ex.output || ""),
      }));
    }

    // run tests
    const tcResults = await runTestCases(code, language, test_cases);
    const passed = tcResults.filter((t) => t.passed).length;
    const total = test_cases.length;
    const status = passed === total ? "accepted" : "wrong_answer";
    const points =
      passed === total
        ? challenge.points || 25
        : Math.round(((challenge.points || 25) * passed) / Math.max(1, total));

    const inserted = await submissions.insertOne({
      user_id: uname,
      battle_id: String(battle._id || battle.id),
      challenge_id: String(challenge._id || challenge.id),
      language,
      code,
      status,
      score: points,
      test_results: tcResults,
      submitted_at: new Date(),
    });

    // check opponent submissions to decide winner
    const other =
      battle.creator?.username === uname
        ? battle.opponent?.username
        : battle.creator?.username;
    const mySubs = await submissions
      .find({ user_id: uname, battle_id: String(battle._id || battle.id) })
      .sort({ submitted_at: -1 })
      .toArray();
    const otherSubs = other
      ? await submissions
          .find({ user_id: other, battle_id: String(battle._id || battle.id) })
          .sort({ submitted_at: -1 })
          .toArray()
      : [];

    let result: any = {
      submission_id: inserted.insertedId,
      status,
      points,
      passed,
      total,
      test_results: tcResults,
    };

    if (mySubs.length && otherSubs.length) {
      // both have at least one submission -> compare best scores
      const myBest = mySubs.reduce(
        (a: any, b: any) => (b.score > a.score ? b : a),
        mySubs[0],
      );
      const otherBest = otherSubs.reduce(
        (a: any, b: any) => (b.score > a.score ? b : a),
        otherSubs[0],
      );
      let winner = null;
      if ((myBest.score || 0) > (otherBest.score || 0)) winner = uname;
      else if ((myBest.score || 0) < (otherBest.score || 0)) winner = other;
      else winner = null; // draw

      // finalize battle
      const update: any = {
        $set: {
          status: "completed",
          updated_at: new Date(),
          completed_at: new Date(),
        },
      };
      if (winner) update.$set.winner = winner;
      await battlesCol.updateOne({ _id: battle._id }, update);

      // award points and update user stats
      const usersCol = await getCollection("users");
      if (winner) {
        await usersCol.updateOne(
          { username: winner },
          {
            $inc: {
              points: Math.max(0, challenge.points || 25),
              battles_won: 1,
            },
          },
        );
        const loser = winner === uname ? other : uname;
        await usersCol.updateOne(
          { username: loser },
          { $inc: { battles_lost: 1 } },
        );
      }

      result.battle_completed = true;
      result.winner = winner;
    }

    res.json({ success: true, message: "Submission evaluated", data: result });
  } catch (e: any) {
    console.error("Submit battle error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
