import type { RequestHandler } from "express";
import { getCollection } from "../config/mongo";
import {
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  sanitizeInput,
  AuthRequest,
  generateSecureToken,
} from "../utils/auth";
import { sendMail, verificationEmailTemplate } from "../utils/email";

// Register
export const register: RequestHandler = async (req, res) => {
  try {
    const body = req.body || {};
    // Support alternative client keys just in case
    const username = String(body.username ?? body.userName ?? body.name ?? "");
    const email = String(body.email ?? body.mail ?? "");
    const password = String(body.password ?? body.pass ?? "");
    const first_name = String(
      body.first_name ?? body.firstName ?? body.firstname ?? "",
    );
    const last_name = String(
      body.last_name ?? body.lastName ?? body.lastname ?? "",
    );
    const institution_id = body.institution_id ?? body.institutionId ?? null;
    const institution_name =
      body.institution_name ?? body.institutionName ?? null;

    const cleanUsername = sanitizeInput(username).trim();
    const cleanEmail = sanitizeInput(email).trim();
    const cleanFirst = sanitizeInput(first_name).trim();
    const cleanLast = sanitizeInput(last_name).trim();

    // Detailed missing fields response to aid troubleshooting
    const missing_fields = [
      ["username", cleanUsername],
      ["email", cleanEmail],
      ["password", password],
      ["first_name", cleanFirst],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k as string);

    if (missing_fields.length) {
      const fieldErrors: Record<string, string> = {};
      for (const f of missing_fields) fieldErrors[f] = "This field is required";
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: { ...fieldErrors, missing_fields },
      });
    }

    const errors: Record<string, string> = {};
    if (!isValidUsername(cleanUsername))
      errors.username =
        "Username must be 3-50 characters and contain only letters, numbers, and underscores";
    if (!isValidEmail(cleanEmail)) errors.email = "Invalid email format";
    if (!isValidPassword(password))
      errors.password =
        "Password must be at least 8 characters and contain uppercase, lowercase, and number";
    if (Object.keys(errors).length)
      return res
        .status(422)
        .json({ success: false, message: "Validation failed", errors });

    const users = await getCollection("users");
    // Check for conflicts (case-insensitive) and return field-specific errors
    const { escapeRegExp } = await import("../utils/auth");
    const conflicts: Record<string, string> = {};

    const usernameConflict = await users.findOne({
      username: { $regex: `^${escapeRegExp(cleanUsername)}$`, $options: "i" },
    });
    if (usernameConflict) conflicts.username = "Username already exists";

    const emailConflict = await users.findOne({
      email: { $regex: `^${escapeRegExp(cleanEmail)}$`, $options: "i" },
    });
    if (emailConflict) conflicts.email = "Email already exists";

    if (Object.keys(conflicts).length)
      return res.status(409).json({
        success: false,
        message:
          conflicts.username && conflicts.email
            ? "Username and email already exist"
            : conflicts.username
              ? "Username already exists"
              : "Email already exists",
        errors: conflicts,
      });

    const password_hash = await hashPassword(password);
    const now = new Date();
    const insert = await users.insertOne({
      username: cleanUsername,
      email: cleanEmail,
      password_hash,
      first_name: cleanFirst,
      last_name: cleanLast,
      role: "student",
      institution_id: institution_id || null,
      institution_name: institution_name || null,
      email_verified: false,
      is_active: true,
      points: 0,
      streak_days: 0,
      last_activity: now,
      created_at: now,
      updated_at: now,
    });

    const user_id = insert.insertedId.toString();

    // Create email verification token
    const emailTokens = await getCollection("email_tokens");
    const verifyToken = generateSecureToken(24);
    const expires_at = new Date(Date.now() + 24 * 3600 * 1000);
    await emailTokens.insertOne({
      user_id,
      token: verifyToken,
      expires_at,
      created_at: new Date(),
    });

    // Send verification email - derive base URL from request
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      (req.headers["host"] as string) ||
      new URL(process.env.APP_URL || "https://interndesire.netlify.app").host;
    // Allow explicit override via RESET_URL or APP_URL; default to code.interndesire.com
    const appUrl = (
      process.env.RESET_URL ||
      process.env.APP_URL ||
      `https://code.interndesire.com`
    ).replace(/\/$/, "");
    const link = `${appUrl}/api/auth/verify-email?token=${verifyToken}`;
    try {
      await sendMail({
        to: cleanEmail,
        subject: "Verify your InternDesire account",
        html: verificationEmailTemplate(link),
      });
    } catch (_) {}

    const token = generateToken({
      user_id: 0,
      username: cleanUsername,
      email: cleanEmail,
      role: "student",
      email_verified: false,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user_id,
          username: cleanUsername,
          email: cleanEmail,
          first_name: cleanFirst,
          last_name: cleanLast,
          role: "student",
          email_verified: false,
          institution_id: institution_id || null,
          institution_name: institution_name || null,
        },
        token,
      },
    });
  } catch (e: any) {
    console.error("Register (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

// Google OAuth Sign-in
export const googleOAuth: RequestHandler = async (req, res) => {
  try {
    const body = req.body || {};
    const id_token = String(body.id_token || body.token || "").trim();
    if (!id_token)
      return res
        .status(422)
        .json({ success: false, message: "Missing id_token" });

    // Verify token with Google
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      id_token,
    )}`;
    let payload: any = null;
    try {
      const r = await fetch(verifyUrl);
      payload = await r.json().catch(() => null);
    } catch (e) {
      console.error("Google token verification error", e);
      return res
        .status(400)
        .json({ success: false, message: "Invalid id_token" });
    }

    if (!payload || !payload.email) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid token payload" });
    }

    // If configured, enforce the token audience matches our Google client ID
    try {
      const CLIENT_ID =
        process.env.GOOGLE_CLIENT_ID ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (
        CLIENT_ID &&
        payload.aud &&
        String(payload.aud) !== String(CLIENT_ID)
      ) {
        console.warn("Google token aud mismatch", {
          aud: payload.aud,
          expected: CLIENT_ID,
        });
        return res
          .status(400)
          .json({ success: false, message: "Invalid token audience" });
      }
    } catch (e) {}

    const email = String(payload.email || "").trim();
    const email_verified =
      payload.email_verified === "true" || payload.email_verified === true;
    const first_name =
      payload.given_name || payload.name?.split(" ")?.[0] || "";
    const last_name =
      payload.family_name ||
      (payload.name ? payload.name.split(" ").slice(1).join(" ") : "");
    const picture = payload.picture || payload.avatar || "";
    const sub = payload.sub || null; // google user id

    const users = await getCollection("users");
    // try to find existing user by email
    let user = await users.findOne({
      email: {
        $regex: `^${String(email).replace(/[-\\/\\^$*+?.()|[\]{}]/g, "\\$&")}$$`,
        $options: "i",
      },
    });

    if (!user) {
      // create username from email localpart, ensure uniqueness
      const local =
        String(email)
          .split("@")[0]
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 20) || `guser${Date.now()}`;
      let candidate = local;
      let suffix = 0;
      while (
        await users.findOne({
          username: { $regex: `^${candidate}$`, $options: "i" },
        })
      ) {
        suffix++;
        candidate = `${local}${suffix}`;
      }
      const now = new Date();
      const insert = await users.insertOne({
        username: candidate,
        email,
        password_hash: null,
        first_name: sanitizeInput(first_name) || "",
        last_name: sanitizeInput(last_name) || "",
        profile_image: picture || null,
        role: "student",
        email_verified: !!email_verified,
        is_active: true,
        oauth_provider: "google",
        oauth_sub: sub,
        points: 0,
        streak_days: 0,
        last_activity: now,
        created_at: now,
        updated_at: now,
      });
      user = await users.findOne({ _id: insert.insertedId });
    } else {
      // update profile fields if missing
      const updates: any = { updated_at: new Date() };
      if (!user.profile_image && picture) updates.profile_image = picture;
      if (!user.first_name && first_name)
        updates.first_name = sanitizeInput(first_name);
      if (!user.last_name && last_name)
        updates.last_name = sanitizeInput(last_name);
      if (!user.email_verified && email_verified) updates.email_verified = true;
      if (Object.keys(updates).length > 0) {
        await users.updateOne({ _id: user._id }, { $set: updates });
        user = await users.findOne({ _id: user._id });
      }
    }

    // generate token
    const token = generateToken({
      user_id: 0,
      username: user.username,
      email: user.email,
      role: user.role,
      email_verified: !!user.email_verified,
    });

    res.json({
      success: true,
      message: "Google sign-in successful",
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_image: user.profile_image,
          role: user.role,
          email_verified: !!user.email_verified,
        },
        token,
      },
    });
  } catch (e: any) {
    console.error("Google OAuth handler error", e);
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

// Login
export const login: RequestHandler = async (req, res) => {
  try {
    const body = (req as any).body || {};
    const login = String(
      body.login ?? body.username ?? body.email ?? "",
    ).trim();
    const password = String(body.password ?? body.pass ?? "");
    if (!login || !password)
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: {
          ...(login ? {} : { login: "This field is required" }),
          ...(password ? {} : { password: "This field is required" }),
          missing_fields: [
            ...(login ? [] : ["login"]),
            ...(password ? [] : ["password"]),
          ],
        },
      });

    const users = await getCollection("users");
    const cleanLogin = sanitizeInput(login).trim();
    const { escapeRegExp } = await import("../utils/auth");
    const user = await users.findOne({
      is_active: true,
      $or: [
        {
          username: { $regex: `^${escapeRegExp(cleanLogin)}$`, $options: "i" },
        },
        { email: { $regex: `^${escapeRegExp(cleanLogin)}$`, $options: "i" } },
      ],
    });

    if (!user || !(await comparePassword(password, user.password_hash))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { last_activity: new Date() } },
    );

    const token = generateToken({
      user_id: 0,
      username: user.username,
      email: user.email,
      role: user.role,
      email_verified: !!user.email_verified,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: !!user.email_verified,
          institution_id: user.institution_id,
          institution_name: user.institution_name,
          points: user.points || 0,
          streak_days: user.streak_days || 0,
        },
        stats: {},
        token,
      },
    });
  } catch (e: any) {
    console.error("Login (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

// Profile
export const getProfile: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const users = await getCollection("users");
    const user = await users.findOne({ username: req.user.username });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // compute dynamic stats
    const submissions = await getCollection("submissions");
    const acceptedCount = await submissions.countDocuments({
      user_id: req.user.username,
      status: "accepted",
    });
    let recent = await submissions
      .find({ user_id: req.user.username })
      .sort({ submitted_at: -1 })
      .limit(5)
      .toArray();

    // Enrich recent submissions: if submission references a battle, attach battle title & challenge title
    try {
      const battleIds = Array.from(
        new Set(
          recent
            .filter((r: any) => r.battle_id)
            .map((r: any) => String(r.battle_id)),
        ),
      );
      if (battleIds.length > 0) {
        const battlesCol = await getCollection("battles");
        const ObjectId = (await import("mongodb")).ObjectId;
        const query: any = { $or: [] };
        for (const id of battleIds) {
          if (ObjectId.isValid(String(id)))
            query.$or.push({ _id: new ObjectId(String(id)) });
          query.$or.push({ _id: id }, { id });
        }
        if (query.$or.length > 0) {
          const battles = await battlesCol.find(query).toArray();
          const map = new Map(
            battles.map((b: any) => [String(b._id || b.id), b]),
          );
          recent = recent.map((r: any) => {
            if (r.battle_id) {
              const b =
                map.get(String(r.battle_id)) || map.get(String(r.battle_id));
              if (b) {
                r.battle_title = b.title || b.challenge_title || "";
                r.battle_challenge_title = b.challenge_title || "";
              }
            }
            return r;
          });
        }
      }
    } catch (e) {
      // ignore enrichment errors
    }

    let battlesWon = 0;
    let battlesLost = 0;
    let hackathonsParticipated = 0;
    try {
      battlesWon =
        (await submissions.countDocuments({
          user_id: req.user.username,
          battle_id: { $exists: true },
          status: "won",
        })) ||
        (await submissions.countDocuments({
          user_id: req.user.username,
          battle_id: { $exists: true },
          status: "accepted",
        }));
    } catch {}
    try {
      battlesLost = await submissions.countDocuments({
        user_id: req.user.username,
        battle_id: { $exists: true },
        status: "lost",
      });
    } catch {}
    try {
      hackathonsParticipated = await submissions.countDocuments({
        user_id: req.user.username,
        hackathon_id: { $exists: true },
      });
    } catch {}

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: !!user.email_verified,
          institution_id: user.institution_id,
          institution_name: user.institution_name,
          profile_image: user.profile_image,
          bio: user.bio,
          github_username: user.github_username,
          linkedin_url: user.linkedin_url,
          points: user.points || 0,
          streak_days: user.streak_days || 0,
          created_at: user.created_at,
        },
        stats: {
          challenges_solved: user.challenges_solved || acceptedCount,
          recent_submissions: recent,
          battles_won: battlesWon || 0,
          battles_lost: battlesLost || 0,
          hackathons_participated: hackathonsParticipated || 0,
        },
      },
    });
  } catch (e: any) {
    console.error("Profile (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const getPublicProfile: RequestHandler = async (req, res) => {
  try {
    const username = String(req.query.username || req.query.user || "").trim();
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "username query parameter is required",
      });
    }

    const users = await getCollection("users");
    // case-insensitive search for username
    const user = await users.findOne({
      $or: [
        { username: username },
        { username: { $regex: `^${username}$`, $options: "i" } },
      ],
      is_active: true,
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const submissions = await getCollection("submissions");
    const acceptedCount = await submissions.countDocuments({
      user_id: user.username,
      status: "accepted",
    });
    let recent = await submissions
      .find({ user_id: user.username })
      .sort({ submitted_at: -1 })
      .limit(5)
      .toArray();

    // Enrich recent submissions with battle metadata (title & challenge title) when available
    try {
      const battleIds = Array.from(
        new Set(
          recent
            .filter((r: any) => r.battle_id)
            .map((r: any) => String(r.battle_id)),
        ),
      );
      if (battleIds.length > 0) {
        const battlesCol = await getCollection("battles");
        const ObjectId = (await import("mongodb")).ObjectId;
        const query: any = { $or: [] };
        for (const id of battleIds) {
          if (ObjectId.isValid(String(id)))
            query.$or.push({ _id: new ObjectId(String(id)) });
          query.$or.push({ _id: id }, { id });
        }
        if (query.$or.length > 0) {
          const battles = await battlesCol.find(query).toArray();
          const map = new Map(
            battles.map((b: any) => [String(b._id || b.id), b]),
          );
          recent = recent.map((r: any) => {
            if (r.battle_id) {
              const b =
                map.get(String(r.battle_id)) || map.get(String(r.battle_id));
              if (b) {
                r.battle_title = b.title || b.challenge_title || "";
                r.battle_challenge_title = b.challenge_title || "";
              }
            }
            return r;
          });
        }
      }
    } catch (e) {
      // ignore
    }

    let battlesWon = 0;
    let battlesLost = 0;
    let hackathonsParticipated = 0;
    try {
      battlesWon =
        (await submissions.countDocuments({
          user_id: user.username,
          battle_id: { $exists: true },
          status: "won",
        })) ||
        (await submissions.countDocuments({
          user_id: user.username,
          battle_id: { $exists: true },
          status: "accepted",
        }));
    } catch {}
    try {
      battlesLost = await submissions.countDocuments({
        user_id: user.username,
        battle_id: { $exists: true },
        status: "lost",
      });
    } catch {}
    try {
      hackathonsParticipated = await submissions.countDocuments({
        user_id: user.username,
        hackathon_id: { $exists: true },
      });
    } catch {}

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: !!user.email_verified,
          institution_id: user.institution_id,
          institution_name: user.institution_name,
          profile_image: user.profile_image,
          bio: user.bio,
          github_username: user.github_username,
          linkedin_url: user.linkedin_url,
          points: user.points || 0,
          streak_days: user.streak_days || 0,
          created_at: user.created_at,
        },
        stats: {
          challenges_solved: user.challenges_solved || acceptedCount,
          recent_submissions: recent,
          battles_won: battlesWon || 0,
          battles_lost: battlesLost || 0,
          hackathons_participated: hackathonsParticipated || 0,
        },
      },
    });
  } catch (e: any) {
    console.error("Public profile (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const verifyTokenHandler: RequestHandler = (req, res) => {
  // requireAuth middleware handles verification in server/index
  res.json({ success: true, message: "Token is valid" });
};

export const verifyEmail: RequestHandler = async (req, res) => {
  try {
    const token = (req.query.token as string) || "";
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Token required" });

    const emailTokens = await getCollection("email_tokens");
    const tokenDoc = await emailTokens.findOne({
      token,
      expires_at: { $gt: new Date() },
    });
    if (!tokenDoc)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });

    const users = await getCollection("users");
    const { ObjectId } = await import("mongodb");
    await users.updateOne(
      { _id: new ObjectId(tokenDoc.user_id) },
      { $set: { email_verified: true } },
    );
    await emailTokens.deleteOne({ _id: tokenDoc._id });
    res.json({ success: true, message: "Email verified successfully" });
  } catch (e: any) {
    console.error("Verify email (Mongo) error:", e);
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

export const logout: RequestHandler = async (_req, res) => {
  // Stateless JWT – nothing to do
  res.json({ success: true, message: "Logged out successfully" });
};

// Update profile (including profile_image as URL or data URI)
export const updateProfile: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const body = req.body || {};
    const first_name = sanitizeInput(
      String(body.first_name ?? body.firstName ?? body.first_name ?? ""),
    ).trim();
    const last_name = sanitizeInput(
      String(body.last_name ?? body.lastName ?? body.last_name ?? ""),
    ).trim();
    const bio = sanitizeInput(String(body.bio ?? "")).trim();
    const profile_image = String(
      body.profile_image ?? body.avatar ?? "",
    ).trim();
    const github_username = sanitizeInput(
      String(body.github_username ?? body.github ?? ""),
    ).trim();
    const linkedin_url = sanitizeInput(
      String(body.linkedin_url ?? body.linkedin ?? ""),
    ).trim();

    const users = await getCollection("users");
    const update: any = { $set: { updated_at: new Date() } };
    if (first_name) update.$set.first_name = first_name;
    if (last_name) update.$set.last_name = last_name;
    if (bio !== undefined) update.$set.bio = bio;
    if (profile_image) update.$set.profile_image = profile_image;
    if (github_username) update.$set.github_username = github_username;
    if (linkedin_url) update.$set.linkedin_url = linkedin_url;

    await users.updateOne({ username: req.user.username }, update);

    const user = await users.findOne({ username: req.user.username });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({
      success: true,
      message: "Profile updated",
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: !!user.email_verified,
          institution_id: user.institution_id,
          institution_name: user.institution_name,
          profile_image: user.profile_image,
          bio: user.bio,
          github_username: user.github_username,
          linkedin_url: user.linkedin_url,
          points: user.points || 0,
          streak_days: user.streak_days || 0,
          created_at: user.created_at,
        },
      },
    });
  } catch (e: any) {
    console.error("Update profile error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Return current user's rank based on points
export const getRank: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const users = await getCollection("users");
    const me = await users.findOne({ username: req.user.username });
    if (!me)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const myPoints = me.points || 0;
    // count users with more points
    const higher = await users.countDocuments({
      is_active: true,
      points: { $gt: myPoints },
    });
    const rank = higher + 1;
    res.json({
      success: true,
      message: "Rank retrieved",
      data: { rank, points: myPoints },
    });
  } catch (e: any) {
    console.error("Get rank error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const resendVerification: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const users = await getCollection("users");
    const user = await users.findOne({ username: req.user.username });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.email_verified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }

    const emailTokens = await getCollection("email_tokens");
    // Invalidate old tokens for this user
    await emailTokens.deleteMany({ user_id: user._id.toString() });

    // Create a new token
    const { generateSecureToken } = await import("../utils/auth");
    const verifyToken = generateSecureToken(24);
    const expires_at = new Date(Date.now() + 24 * 3600 * 1000);
    await emailTokens.insertOne({
      user_id: user._id.toString(),
      token: verifyToken,
      expires_at,
      created_at: new Date(),
    });

    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      (req.headers["host"] as string) ||
      new URL(process.env.APP_URL || "https://interndesire.netlify.app").host;
    // Allow explicit override via RESET_URL or APP_URL; default to code.interndesire.com
    const appUrl = (
      process.env.RESET_URL ||
      process.env.APP_URL ||
      `https://code.interndesire.com`
    ).replace(/\/$/, "");
    const link = `${appUrl}/api/auth/verify-email?token=${verifyToken}`;

    let delivered = true;
    try {
      await sendMail({
        to: user.email,
        subject: "Verify your InternDesire account",
        html: verificationEmailTemplate(link),
      });
    } catch (e) {
      delivered = false;
    }

    return res.json({
      success: true,
      message: delivered
        ? "Verification email sent"
        : "Email delivery unavailable; use the link below",
      link,
    });
  } catch (e: any) {
    const debug = String(process.env.DEBUG || "").toLowerCase() === "true";
    res.status(500).json({
      success: false,
      message: "Could not resend verification email",
      ...(debug ? { error: e?.message || String(e) } : {}),
    });
  }
};

// Forgot password - request reset link
export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || "").trim();
    if (!email)
      return res
        .status(422)
        .json({ success: false, message: "Email is required" });

    const users = await getCollection("users");
    const { escapeRegExp } = await import("../utils/auth");
    const user = await users.findOne({
      email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" },
    });
    if (!user) {
      // Do not reveal whether email exists
      return res.json({
        success: true,
        message: "If that email exists, a reset link has been sent",
      });
    }

    const emailTokens = await getCollection("email_tokens");
    // invalidate old tokens for this user
    await emailTokens.deleteMany({
      user_id: user._id.toString(),
      type: "password_reset",
    });

    const { generateSecureToken } = await import("../utils/auth");
    const resetToken = generateSecureToken(24);
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await emailTokens.insertOne({
      user_id: user._id.toString(),
      token: resetToken,
      type: "password_reset",
      expires_at,
      created_at: new Date(),
    });

    // Send reset email
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      (req.headers["host"] as string) ||
      new URL(process.env.APP_URL || "https://interndesire.netlify.app").host;
    // Allow explicit override via RESET_URL or fallback to APP_URL; default to code.interndesire.com
    const appUrl = (
      process.env.RESET_URL ||
      process.env.APP_URL ||
      `https://code.interndesire.com`
    ).replace(/\/$/, "");
    const link = `${appUrl}/reset-password/${resetToken}`;
    try {
      await sendMail({
        to: user.email,
        subject: "Reset your InternDesire password",
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Password reset</h2><p>Click the button below to reset your password. This link expires in 1 hour.</p><p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p><p>If the button doesn't work, copy and paste this URL into your browser:</p><p>${link}</p></div>`,
      });
    } catch (e) {
      console.error("Send reset email failed", e);
    }

    return res.json({
      success: true,
      message: "If that email exists, a reset link has been sent",
    });
  } catch (e: any) {
    console.error("Forgot password error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Validate reset token
export const validateResetToken: RequestHandler = async (req, res) => {
  try {
    const token = String(
      (req.query && req.query.token) || (req.body && req.body.token) || "",
    ).trim();
    if (!token)
      return res
        .status(422)
        .json({ success: false, valid: false, message: "Token is required" });
    const emailTokens = await getCollection("email_tokens");
    const tokenDoc = await emailTokens.findOne({
      token,
      type: "password_reset",
      expires_at: { $gt: new Date() },
    });
    if (!tokenDoc)
      return res
        .status(400)
        .json({
          success: false,
          valid: false,
          message: "Invalid or expired token",
        });
    // Fetch user to show masked email (do not reveal full email)
    const users = await getCollection("users");
    const { ObjectId } = await import("mongodb");
    let maskedEmail: string | null = null;
    try {
      const user = await users.findOne({
        _id: new ObjectId(String(tokenDoc.user_id)),
      });
      if (user && user.email) {
        const e = String(user.email);
        const parts = e.split("@");
        const local = parts[0] || "";
        const domain = parts[1] || "";
        const localMasked =
          local.length <= 2 ? local[0] + "*" : local.slice(0, 2) + "***";
        maskedEmail = `${localMasked}@${domain}`;
      }
    } catch (e) {
      // ignore
    }
    return res.json({ success: true, valid: true, email: maskedEmail });
  } catch (e: any) {
    console.error("Validate reset token error", e);
    res
      .status(500)
      .json({ success: false, valid: false, message: "Internal server error" });
  }
};

// Reset password - submit new password with token
export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const body = req.body || {};
    const token = String(body.token || "").trim();
    const password = String(body.password || "").trim();
    if (!token || !password)
      return res
        .status(422)
        .json({
          success: false,
          message: "Token and new password are required",
        });
    if (!isValidPassword(password))
      return res
        .status(422)
        .json({
          success: false,
          message: "Password does not meet complexity requirements",
        });

    const emailTokens = await getCollection("email_tokens");
    const tokenDoc = await emailTokens.findOne({
      token,
      type: "password_reset",
      expires_at: { $gt: new Date() },
    });
    if (!tokenDoc)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });

    const users = await getCollection("users");
    const { ObjectId } = await import("mongodb");
    const userId = tokenDoc.user_id;
    const password_hash = await hashPassword(password);
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password_hash, updated_at: new Date() } },
    );
    await emailTokens.deleteOne({ _id: tokenDoc._id });

    res.json({ success: true, message: "Password reset successful" });
  } catch (e: any) {
    console.error("Reset password error", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
