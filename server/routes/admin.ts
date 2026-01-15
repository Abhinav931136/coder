import { RequestHandler } from "express";
import { getCollection } from "../config/mongo";

export const setUserStreak: RequestHandler = async (req, res) => {
  try {
    const adminSecret =
      process.env.ADMIN_SECRET || process.env.ADMIN_TOKEN || "";
    const provided =
      (req.headers["x-admin-secret"] as string) ||
      (req.headers["x-admin-token"] as string) ||
      (req.body && req.body.admin_secret) ||
      "";
    if (!adminSecret || provided !== adminSecret) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const body = req.body || {};
    const username = String(body.username || body.user || "").trim();
    const streak = Number(body.streak);

    if (!username)
      return res
        .status(400)
        .json({ success: false, message: "username is required" });
    if (!Number.isFinite(streak) || streak < 0)
      return res.status(400).json({
        success: false,
        message: "streak must be a non-negative number",
      });

    const users = await getCollection("users");
    // case-insensitive username match
    const user = await users.findOne({
      $or: [
        { username },
        { username: { $regex: `^${username}$`, $options: "i" } },
      ],
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    await users.updateOne(
      { _id: user._id },
      { $set: { streak_days: streak, updated_at: new Date() } },
    );
    const updated = await users.findOne({ _id: user._id });

    res.json({
      success: true,
      message: "Streak updated",
      data: { username: updated.username, streak_days: updated.streak_days },
    });
  } catch (e: any) {
    console.error("Set user streak error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createAdminUser: RequestHandler = async (req, res) => {
  try {
    const adminSecret =
      process.env.ADMIN_SECRET || process.env.ADMIN_TOKEN || "";
    const provided =
      (req.headers["x-admin-secret"] as string) ||
      (req.body && req.body.admin_secret) ||
      "";
    if (!adminSecret || provided !== adminSecret)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const body = req.body || {};
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const first_name = String(body.first_name || "");
    const last_name = String(body.last_name || "");

    if (!email || !password)
      return res
        .status(422)
        .json({ success: false, message: "email and password required" });

    const users = await getCollection("users");
    // check existing by email
    const existing = await users.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });
    const { hashPassword } = await import("../utils/auth");
    const password_hash = await hashPassword(password);

    if (existing) {
      // update to admin
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            password_hash,
            role: "platform_admin",
            updated_at: new Date(),
          },
        },
      );
      const updated = await users.findOne({ _id: existing._id });
      return res.json({
        success: true,
        message: "Admin user updated",
        data: { email: updated.email, username: updated.username },
      });
    }

    const now = new Date();
    const insert = await users.insertOne({
      username: email.split("@")[0],
      email,
      password_hash,
      first_name,
      last_name,
      role: "platform_admin",
      email_verified: true,
      is_active: true,
      points: 0,
      streak_days: 0,
      last_activity: now,
      created_at: now,
      updated_at: now,
    });
    const id =
      insert.insertedId && insert.insertedId.toString
        ? insert.insertedId.toString()
        : insert.insertedId;
    res
      .status(201)
      .json({ success: true, message: "Admin created", data: { id, email } });
  } catch (e: any) {
    console.error("Create admin user error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
