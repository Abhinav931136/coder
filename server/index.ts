import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { requireAuth, requireAdmin } from "./utils/auth";
import { initializeMongo, seedIfEmpty } from "./config/mongo";

// Import Mongo route handlers
import {
  register,
  login,
  getProfile,
  getPublicProfile,
  updateProfile,
  getRank,
  verifyTokenHandler,
  logout,
  verifyEmail,
  resendVerification,
  googleOAuth,
  forgotPassword,
  validateResetToken,
  resetPassword,
} from "./routes/auth.mongo";
import { setUserStreak, createAdminUser } from "./routes/admin";
import {
  getDailyChallenge,
  getChallengesList,
  getChallenge,
  submitCode,
  runCode,
  getSupportedLanguages,
  getLatestSubmission,
  getLeaderboard,
} from "./routes/challenges.mongo";
import {
  listBattles,
  createBattle,
  joinBattle,
  acceptBattle,
  declineBattle,
  submitBattle,
  getBattleById,
  getLatestBattleSubmission,
} from "./routes/battles";
import {
  listHackathons,
  getHackathon,
  createHackathon,
  updateHackathon,
  deleteHackathon,
} from "./routes/hackathons";
import { getSubmission } from "./routes/submissions";

export function createServer() {
  const app = express();

  // Middleware
  // Allow CORS and credentials for browser requests; origin true echoes request origin (use more restrictive policy in production)
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  // Fallback: in serverless envs body can be a raw string, buffer, or placed on event; parse JSON or URL-encoded
  app.use((req, _res, next) => {
    try {
      let raw: any = (req as any).body;
      if (!raw)
        raw =
          (req as any).rawBody ||
          (req as any).rawBodyString ||
          (req as any).raw ||
          (req as any).event?.body;

      // If it's a buffer, convert
      if (raw && Buffer.isBuffer(raw)) raw = raw.toString("utf8");

      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          (req as any).body = JSON.parse(trimmed || "{}");
        } else if (trimmed.includes("=") && trimmed.includes("&")) {
          const params = new URLSearchParams(trimmed);
          const obj: Record<string, string> = {};
          params.forEach((v, k) => {
            obj[k] = v;
          });
          (req as any).body = obj;
        } else if (trimmed.length === 0) {
          (req as any).body = {};
        } else {
          // leave as string if unknown format
          (req as any).body = raw;
        }
      } else if (raw && typeof raw === "object") {
        // already parsed
        (req as any).body = raw;
      }
    } catch (err) {
      // keep original body if parsing fails
    }
    next();
  });

  // Netlify functions path rewrite: strip "/.netlify/functions/api" and ensure API prefix
  app.use((req, _res, next) => {
    try {
      const originalUrl = req.url || "";
      if (originalUrl.startsWith("/.netlify/functions/api")) {
        req.url = originalUrl.replace("/.netlify/functions/api", "");
      }
      // If request targets known API groups without /api prefix, add it
      const knownPrefixes = [
        "/auth/",
        "/challenges/",
        "/leaderboard",
        "/demo",
        "/ping",
        "/health",
      ];
      if (!req.url.startsWith("/api/")) {
        for (const p of knownPrefixes) {
          if (req.url === p || req.url.startsWith(p)) {
            req.url = "/api" + req.url;
            break;
          }
        }
      }
    } catch {}
    next();
  });

  // Initialize Mongo on startup
  initializeMongo()
    .then(() => seedIfEmpty())
    .catch((e) => console.error("Mongo init error", e));

  // Authentication routes
  // Preflight handler without wildcard path (avoids path-to-regexp crashes)
  app.use((req, res, next) => {
    if (req.method === "OPTIONS" && req.url.startsWith("/api/")) {
      return res.sendStatus(204);
    }
    next();
  });
  app.all("/api/auth/login", (req, res, next) => {
    if (req.method === "GET") {
      (req as any).body = Object.assign({}, req.query);
      return login(req as any, res, next as any);
    }
    if (req.method === "POST") return login(req, res, next as any);
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  });

  app.all("/api/auth/register", (req, res, next) => {
    if (req.method === "GET") {
      (req as any).body = Object.assign({}, req.query);
      return register(req as any, res, next as any);
    }
    if (req.method === "POST") return register(req, res, next as any);
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  });
  app.get("/api/auth/profile", requireAuth, getProfile);
  // Public profile view (by username) - does not require authentication
  app.get("/api/auth/user", getPublicProfile);
  app.post("/api/auth/profile", requireAuth, updateProfile);
  app.get("/api/auth/rank", requireAuth, getRank);
  app.get("/api/auth/verify", requireAuth, verifyTokenHandler);
  app.post("/api/auth/logout", requireAuth, logout);
  app.get("/api/auth/verify-email", verifyEmail);
  app.post("/api/auth/resend-verification", requireAuth, resendVerification);

  // Google OAuth sign-in
  app.post("/api/auth/google", (req, res, next) => googleOAuth(req, res, next));

  // Forgot / Reset password
  app.post("/api/auth/forgot-password", (req, res, next) =>
    forgotPassword(req, res, next),
  );
  app.post("/api/auth/reset-password", (req, res, next) =>
    resetPassword(req, res, next),
  );
  app.get("/api/auth/validate-reset", (req, res, next) =>
    validateResetToken(req, res, next),
  );

  // Challenge routes
  app.get("/api/challenges/daily", getDailyChallenge);
  app.get("/api/challenges/list", getChallengesList);
  app.get("/api/challenges/get", getChallenge);
  app.post("/api/challenges/submit", requireAuth, submitCode);
  app.post("/api/challenges/run", requireAuth, runCode);
  app.get("/api/challenges/languages", getSupportedLanguages);
  app.get("/api/challenges/submission", requireAuth, getLatestSubmission);
  app.get("/api/leaderboard", getLeaderboard);

  // Hackathons
  app.get("/api/hackathons", listHackathons);
  app.get("/api/hackathons/:id", getHackathon);
  app.post("/api/hackathons/create", requireAdmin, createHackathon);
  app.put("/api/hackathons/:id", requireAdmin, updateHackathon);
  app.delete("/api/hackathons/:id", requireAdmin, deleteHackathon);

  // Battles
  app.get("/api/battles", listBattles);
  app.get("/api/battles/:id", getBattleById);
  app.get("/api/battles/submission", requireAuth, getLatestBattleSubmission);
  app.post("/api/battles/create", requireAuth, createBattle);

  // Submissions
  app.get("/api/submissions/:id", requireAuth, getSubmission);
  app.post("/api/battles/join", requireAuth, joinBattle);
  app.post("/api/battles/accept", requireAuth, acceptBattle);
  app.post("/api/battles/decline", requireAuth, declineBattle);
  app.post("/api/battles/submit", requireAuth, submitBattle);

  // Admin utilities (protected by ADMIN_SECRET header x-admin-secret)
  app.post("/api/admin/set-streak", setUserStreak);
  app.post("/api/admin/create-admin", createAdminUser);

  // Legacy routes for compatibility
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Health check
  app.get("/api/health", async (_req, res) => {
    try {
      const hasUri = !!process.env.MONGODB_URI;
      const hasDb = !!process.env.MONGODB_DB;
      let mongo: any = null;
      if (hasUri) {
        const { pingMongo } = await import("./config/mongo");
        mongo = await pingMongo().catch((e: any) => ({
          error: e?.message || String(e),
        }));
      }
      res.json({
        ok: true,
        env: {
          MONGODB_URI: hasUri ? "set" : "missing",
          MONGODB_DB: hasDb ? process.env.MONGODB_DB : "missing",
          APP_URL: process.env.APP_URL || null,
        },
        mongo,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  });

  app.get("/api/demo", handleDemo);

  // Debug endpoint for diagnostics
  app.get("/api/debug/daily-challenge", getDailyChallenge);
  app.get("/api/debug/challenges", async (_req, res) => {
    try {
      const { getDb } = await import("./config/mongo");
      const db = await getDb();
      const collections = await db.listCollections().toArray();
      const challenges = db.collection("challenges");
      const total = await challenges.countDocuments({});
      const sample = await challenges.find({}).limit(1).toArray();
      res.json({
        ok: true,
        total,
        collections: collections.map((c) => c.name),
        sample,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  });

  // Error handling middleware
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
      console.error("API Error:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        ...(debug
          ? { error: err?.message || String(err), stack: err?.stack }
          : {}),
      });
    },
  );

  return app;
}
