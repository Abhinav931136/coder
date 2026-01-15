import type { RequestHandler } from "express";
import { getCollection } from "../config/mongo";
import type { RequestHandler } from "express";
import { requireAdmin } from "../utils/auth";

const sampleHackathons = [
  {
    _id: "1",
    id: 1,
    title: "TechnoVation 2024 - Innovation Challenge",
    description:
      "Join Dev Bhoomi Uttarakhand University's flagship hackathon focused on solving real-world problems through innovative technology solutions.",
    organizer: {
      name: "Dev Bhoomi Uttarakhand University",
      logo: "https://www.dbuu.ac.in/assets/images/logo/devbhoomi-logo.webp",
      type: "university",
    },
    status: "upcoming",
    startDate: "2024-03-15T09:00:00Z",
    endDate: "2024-03-17T18:00:00Z",
    registrationDeadline: "2024-03-10T23:59:59Z",
    location: { type: "hybrid", venue: "DBUU Main Campus", city: "Dehradun" },
    theme: "Technology for Sustainable Development",
    tracks: ["AI/ML & Data Science", "IoT & Smart Cities"],
    prizes: { first: "₹1,00,000", second: "₹50,000", third: "₹25,000" },
    participants: { registered: 245, maxCapacity: 400, teams: 61 },
    difficulty: "intermediate",
    tags: ["innovation", "sustainability"],
    requirements: ["Students from any university"],
    schedule: [],
    judges: [],
    sponsors: [],
  },
];

export const listHackathons: RequestHandler = async (_req, res) => {
  try {
    const col = await getCollection("hackathons");
    let items: any[] = [];
    try {
      items = await col.find({}).sort({ startDate: -1 }).toArray();
    } catch (e) {
      items = [];
    }

    if (!items || items.length === 0) {
      // return sample data when collection empty
      return res.json({
        success: true,
        message: "Hackathons list (sample)",
        data: { items: sampleHackathons },
      });
    }

    // normalize _id to string
    items = items.map((it: any) => ({
      ...it,
      _id: it._id && it._id.toString ? it._id.toString() : it._id,
    }));
    res.json({
      success: true,
      message: "Hackathons retrieved",
      data: { items },
    });
  } catch (e: any) {
    console.error("List hackathons error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

import { ObjectId } from "mongodb";

export const getHackathon: RequestHandler = async (req, res) => {
  try {
    const id = req.query.id || req.params.id;
    const col = await getCollection("hackathons");
    let item: any = null;
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });
    try {
      // Try numeric id field
      if (!isNaN(Number(id))) {
        item = await col.findOne({ id: Number(id) });
      }

      // Try string _id match
      if (!item) {
        try {
          item = await col.findOne({ _id: id });
        } catch (e) {
          // ignore
        }
      }

      // Try ObjectId conversion (common case for MongoDB _id)
      if (!item) {
        try {
          const oid = new ObjectId(String(id));
          item = await col.findOne({ _id: oid });
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Hackathon not found" });
    if (item._id && item._id.toString) item._id = item._id.toString();
    res.json({
      success: true,
      message: "Hackathon retrieved",
      data: { hackathon: item },
    });
  } catch (e: any) {
    console.error("Get hackathon error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createHackathon: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!["platform_admin", "instructor"].includes(user.role))
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });

    const body = req.body || {};
    const title = String(body.title || "").trim();
    if (!title)
      return res
        .status(422)
        .json({ success: false, message: "Title required" });

    const doc: any = {
      title,
      description: String(body.description || ""),
      organizer: body.organizer || {
        name: user.username,
        logo: body.organizer?.logo || "",
      },
      status: String(body.status || "upcoming"),
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      registrationDeadline: body.registrationDeadline || null,
      location: body.location || {},
      theme: body.theme || "",
      tracks: Array.isArray(body.tracks)
        ? body.tracks
        : typeof body.tracks === "string"
          ? body.tracks.split(",").map((s: string) => s.trim())
          : [],
      prizes: body.prizes || {},
      participants: body.participants || {
        registered: 0,
        maxCapacity: 0,
        teams: 0,
      },
      difficulty: body.difficulty || "beginner",
      tags: Array.isArray(body.tags)
        ? body.tags
        : typeof body.tags === "string"
          ? body.tags.split(",").map((s: string) => s.trim())
          : [],
      requirements: body.requirements || [],
      schedule: body.schedule || [],
      judges: body.judges || [],
      sponsors: body.sponsors || [],
      // optional registration / proceed URL (added by admin)
      registrationUrl: String(body.registrationUrl || body.registration_url || "").trim(),
      created_by: user.username,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const col = await getCollection("hackathons");
    const r = await col.insertOne(doc);
    const id =
      r.insertedId && r.insertedId.toString
        ? r.insertedId.toString()
        : r.insertedId;
    res.status(201).json({
      success: true,
      message: "Hackathon created",
      data: { id, hackathon: { ...doc, _id: id } },
    });
  } catch (e: any) {
    console.error("Create hackathon error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update hackathon (admin only)
export const updateHackathon: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!["platform_admin", "instructor"].includes(user.role))
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });

    const id = req.params.id || req.query.id;
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });

    const body = req.body || {};
    const col = await getCollection("hackathons");

    // Build update document with allowed fields only
    const allowed: any = {};
    const fields = [
      "title",
      "description",
      "organizer",
      "status",
      "startDate",
      "endDate",
      "registrationDeadline",
      "location",
      "theme",
      "tracks",
      "prizes",
      "participants",
      "difficulty",
      "tags",
      "requirements",
      "schedule",
      "judges",
      "sponsors",
      "registrationUrl",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) allowed[f] = body[f];
    }
    allowed.updated_at = new Date();

    // try numeric id or _id/objectid
    let query: any = {};
    if (!isNaN(Number(id))) query = { id: Number(id) };
    else query = { _id: id };

    const r = await col.findOneAndUpdate(
      query,
      { $set: allowed },
      { returnDocument: "after" as any },
    );
    if (!r || !r.value) {
      // try ObjectId
      try {
        const { ObjectId } = await import("mongodb");
        const oid = new ObjectId(String(id));
        const r2 = await col.findOneAndUpdate(
          { _id: oid },
          { $set: allowed },
          { returnDocument: "after" as any },
        );
        if (!r2 || !r2.value)
          return res
            .status(404)
            .json({ success: false, message: "Hackathon not found" });
        const item = r2.value;
        if (item._id && item._id.toString) item._id = item._id.toString();
        return res.json({
          success: true,
          message: "Hackathon updated",
          data: { hackathon: item },
        });
      } catch (e) {
        return res
          .status(404)
          .json({ success: false, message: "Hackathon not found" });
      }
    }

    const item = r.value;
    if (item._id && item._id.toString) item._id = item._id.toString();
    res.json({
      success: true,
      message: "Hackathon updated",
      data: { hackathon: item },
    });
  } catch (e: any) {
    console.error("Update hackathon error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete hackathon (admin only)
export const deleteHackathon: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!["platform_admin", "instructor"].includes(user.role))
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });

    const id = req.params.id || req.query.id;
    if (!id)
      return res.status(400).json({ success: false, message: "id required" });

    const col = await getCollection("hackathons");
    let query: any = {};
    if (!isNaN(Number(id))) query = { id: Number(id) };
    else query = { _id: id };

    const r = await col.findOneAndDelete(query);
    if (!r || !r.value) {
      try {
        const { ObjectId } = await import("mongodb");
        const oid = new ObjectId(String(id));
        const r2 = await col.findOneAndDelete({ _id: oid });
        if (!r2 || !r2.value)
          return res
            .status(404)
            .json({ success: false, message: "Hackathon not found" });
        return res.json({ success: true, message: "Hackathon deleted" });
      } catch (e) {
        return res
          .status(404)
          .json({ success: false, message: "Hackathon not found" });
      }
    }

    res.json({ success: true, message: "Hackathon deleted" });
  } catch (e: any) {
    console.error("Delete hackathon error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
