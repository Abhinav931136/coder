import { RequestHandler } from "express";
import { requireAuth, AuthRequest, sanitizeInput } from "../utils/auth";
import {
  executeQuery,
  getOne,
  getMany,
  insertAndGetId,
  convertMySQLToPostgreSQL,
  useMockDatabase,
} from "../config/database";
import { MockDatabase } from "../config/mock-database";

const PISTON_API_URL = "https://emkc.org/api/v2/piston";
const CODE_EXECUTION_TIMEOUT = 5000;
const MAX_CODE_LENGTH = 50000;

const SUPPORTED_LANGUAGES = {
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

// Get today's daily challenge
export const getDailyChallenge: RequestHandler = async (req, res) => {
  try {
    let challenge;

    if (useMockDatabase) {
      challenge = await MockDatabase.getDailyChallenge();
    } else {
      challenge = await getOne(
        `SELECT id, title, description, difficulty, tags, input_format,
                output_format, constraints, examples, supported_languages,
                points, publish_date
         FROM challenges
         WHERE is_daily = true AND publish_date = CURRENT_DATE AND is_active = true`,
      );

      // Parse JSON fields for real database
      if (challenge) {
        try {
          challenge.tags = JSON.parse(challenge.tags || "[]");
          challenge.examples = JSON.parse(challenge.examples || "[]");
          challenge.supported_languages = JSON.parse(
            challenge.supported_languages || "[]",
          );
        } catch (e) {
          console.error("Error parsing challenge JSON fields:", e);
        }
      }
    }

    if (!challenge) {
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
  } catch (error) {
    console.error("Daily challenge error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get list of challenges with pagination
export const getChallengesList: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(
      50,
      Math.max(1, parseInt(req.query.per_page as string) || 20),
    );
    const difficulty = req.query.difficulty as string;
    const search = req.query.search as string;

    let result;

    if (useMockDatabase) {
      result = await MockDatabase.getChallenges(
        page,
        perPage,
        difficulty,
        search,
      );
    } else {
      let whereConditions = ["is_active = true"];
      let params: any[] = [];

      if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) {
        whereConditions.push("difficulty = ?");
        params.push(difficulty);
      }

      if (search) {
        whereConditions.push("(title LIKE ? OR description LIKE ?)");
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      const whereClause = whereConditions.join(" AND ");

      // Get total count
      const countResult = await getOne(
        `SELECT COUNT(*) as total FROM challenges WHERE ${whereClause}`,
        params,
      );
      const total = countResult?.total || 0;

      // Get challenges
      const offset = (page - 1) * perPage;
      const challenges = await getMany(
        `SELECT id, title, description, difficulty, tags, points,
                publish_date, is_daily,
                (SELECT COUNT(*) FROM submissions WHERE challenge_id = challenges.id AND status = 'accepted') as solved_count
         FROM challenges
         WHERE ${whereClause}
         ORDER BY publish_date DESC, id DESC
         LIMIT ? OFFSET ?`,
        [...params, perPage, offset],
      );

      // Parse JSON fields
      challenges.forEach((challenge: any) => {
        try {
          challenge.tags = JSON.parse(challenge.tags || "[]");
          challenge.solved_count = parseInt(challenge.solved_count) || 0;
        } catch (e) {
          challenge.tags = [];
          challenge.solved_count = 0;
        }
      });

      const totalPages = Math.ceil(total / perPage);

      result = {
        items: challenges,
        pagination: {
          current_page: page,
          per_page: perPage,
          total: total,
          total_pages: totalPages,
          has_more: page < totalPages,
        },
      };
    }

    res.json({
      success: true,
      message: "Challenges retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Challenges list error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get specific challenge by ID
export const getChallenge: RequestHandler = async (req, res) => {
  try {
    const challengeId = parseInt(req.query.id as string);

    if (!challengeId) {
      return res.status(400).json({
        success: false,
        message: "Challenge ID is required",
      });
    }

    let challenge;

    if (useMockDatabase) {
      challenge = await MockDatabase.getChallengeById(challengeId);
    } else {
      challenge = await getOne(
        `SELECT id, title, description, difficulty, tags, input_format,
                output_format, constraints, examples, supported_languages,
                points, publish_date, is_daily,
                (SELECT COUNT(*) FROM submissions WHERE challenge_id = ? AND status = 'accepted') as solved_count
         FROM challenges
         WHERE id = ? AND is_active = true`,
        [challengeId, challengeId],
      );

      // Parse JSON fields for real database
      if (challenge) {
        try {
          challenge.tags = JSON.parse(challenge.tags || "[]");
          challenge.examples = JSON.parse(challenge.examples || "[]");
          challenge.supported_languages = JSON.parse(
            challenge.supported_languages || "[]",
          );
          challenge.solved_count = parseInt(challenge.solved_count) || 0;
        } catch (e) {
          console.error("Error parsing challenge JSON fields:", e);
        }
      }
    }

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    res.json({
      success: true,
      message: "Challenge retrieved successfully",
      data: {
        challenge,
        user_solved: false, // TODO: Check if authenticated user has solved this
      },
    });
  } catch (error) {
    console.error("Get challenge error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Submit code for evaluation
export const submitCode: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { challenge_id, language, code } = req.body;

    if (!challenge_id || !language || !code) {
      return res.status(400).json({
        success: false,
        message: "Challenge ID, language, and code are required",
      });
    }

    if (!SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES]) {
      return res.status(400).json({
        success: false,
        message: "Unsupported programming language",
      });
    }

    if (code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Code is too long",
      });
    }

    // Use mock submission for development
    if (useMockDatabase) {
      const result = await MockDatabase.submitCode({
        user_id: req.user.id,
        challenge_id,
        language,
        code,
      });

      return res.json({
        success: true,
        message: "Code submitted and evaluated successfully",
        data: result,
      });
    }

    // Get challenge details
    const challenge = await getOne(
      `SELECT id, test_cases, time_limit, memory_limit, points, supported_languages
       FROM challenges
       WHERE id = ? AND is_active = true`,
      [challenge_id],
    );

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Challenge not found",
      });
    }

    let supportedLanguages = [];
    try {
      supportedLanguages = JSON.parse(challenge.supported_languages || "[]");
    } catch (e) {
      supportedLanguages = [];
    }

    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Language not supported for this challenge",
      });
    }

    // Create submission record
    const insertResult = await insertAndGetId(
      `INSERT INTO submissions (user_id, challenge_id, language, code, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, challenge_id, language, code],
    );

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to create submission",
      });
    }

    const submissionId = insertResult.insertId;

    // Execute code against test cases
    let testCases = [];
    try {
      testCases = JSON.parse(challenge.test_cases || "[]");
    } catch (e) {
      testCases = [];
    }

    const results = await executeCodeWithTestCases(
      code,
      language,
      testCases,
      challenge.time_limit,
      challenge.memory_limit,
    );

    // Calculate score
    const passedTests = results.test_results.filter(
      (result: any) => result.status === "passed",
    );
    let score = 0;
    let status = "wrong_answer";

    if (passedTests.length === testCases.length) {
      score = challenge.points;
      status = "accepted";
    } else if (results.status === "compilation_error") {
      status = "compilation_error";
    } else if (results.status === "runtime_error") {
      status = "runtime_error";
    } else if (results.status === "time_limit_exceeded") {
      status = "time_limit_exceeded";
    } else if (results.status === "memory_limit_exceeded") {
      status = "memory_limit_exceeded";
    }

    // Update submission
    await executeQuery(
      `UPDATE submissions 
       SET status = ?, execution_time = ?, memory_used = ?, test_results = ?, 
           score = ?, error_message = ?
       WHERE id = ?`,
      [
        status,
        results.execution_time,
        results.memory_used,
        JSON.stringify(results.test_results),
        score,
        results.error_message,
        submissionId,
      ],
    );

    // Update user stats if accepted
    if (status === "accepted") {
      // Check if first time solving this challenge
      const previousAccepted = await getOne(
        `SELECT COUNT(*) as count FROM submissions 
         WHERE user_id = ? AND challenge_id = ? AND status = 'accepted' AND id < ?`,
        [req.user.id, challenge_id, submissionId],
      );

      if ((previousAccepted?.count || 0) === 0) {
        // First time solving, update stats
        await executeQuery(
          `UPDATE user_stats 
           SET challenges_solved = challenges_solved + 1,
               total_points = total_points + ?
           WHERE user_id = ?`,
          [score, req.user.id],
        );

        await executeQuery(
          `UPDATE users 
           SET points = points + ?
           WHERE id = ?`,
          [score, req.user.id],
        );
      }
    }

    res.json({
      success: true,
      message: "Code submitted and evaluated successfully",
      data: {
        submission_id: submissionId,
        status,
        score,
        execution_time: results.execution_time,
        memory_used: results.memory_used,
        test_results: results.test_results,
        error_message: results.error_message,
      },
    });
  } catch (error) {
    console.error("Submit code error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Run code without submitting (for testing)
export const runCode: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { language, code, input } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: "Language and code are required",
      });
    }

    if (!SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES]) {
      return res.status(400).json({
        success: false,
        message: "Unsupported programming language",
      });
    }

    if (code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Code is too long",
      });
    }

    const result = await executeCode(code, language, input || "");

    res.json({
      success: true,
      message: "Code executed successfully",
      data: {
        output: result.output,
        error: result.error,
        execution_time: result.execution_time,
        memory_used: result.memory_used,
        status: result.status,
      },
    });
  } catch (error) {
    console.error("Run code error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get supported programming languages
export const getSupportedLanguages: RequestHandler = async (req, res) => {
  res.json({
    success: true,
    message: "Supported languages retrieved successfully",
    data: { languages: SUPPORTED_LANGUAGES },
  });
};

// Execute code using Piston API
async function executeCode(code: string, language: string, input: string = "") {
  const languageConfig =
    SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES];

  const payload = {
    language: languageConfig.piston,
    version: languageConfig.version,
    files: [{ content: code }],
    stdin: input,
    compile_timeout: 10000,
    run_timeout: CODE_EXECUTION_TIMEOUT,
  };

  try {
    const response = await fetch(`${PISTON_API_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Code execution service unavailable");
    }

    const result = await response.json();

    let status = "success";
    let errorMessage = null;

    if (result.compile && result.compile.code !== 0) {
      status = "compilation_error";
      errorMessage = result.compile.stderr;
    } else if (result.run && result.run.code !== 0) {
      status = "runtime_error";
      errorMessage = result.run.stderr;
    }

    return {
      output: result.run?.stdout || "",
      error: errorMessage,
      execution_time: result.run?.signal || 0,
      memory_used: 0, // Piston doesn't provide memory usage
      status,
    };
  } catch (error) {
    console.error("Code execution error:", error);
    return {
      output: "",
      error: "Code execution service unavailable",
      execution_time: 0,
      memory_used: 0,
      status: "runtime_error",
    };
  }
}

// Execute code against test cases
async function executeCodeWithTestCases(
  code: string,
  language: string,
  testCases: any[],
  timeLimit: number,
  memoryLimit: number,
) {
  const results = {
    test_results: [] as any[],
    execution_time: 0,
    memory_used: 0,
    status: "success",
    error_message: null as string | null,
  };

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    try {
      const result = await executeCode(code, language, testCase.input);

      const passed = result.output.trim() === testCase.output.trim();

      results.test_results.push({
        test_case: i + 1,
        input: testCase.input,
        expected_output: testCase.output,
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
    } catch (error) {
      results.status = "runtime_error";
      results.error_message = "Code execution failed";
      break;
    }
  }

  return results;
}
