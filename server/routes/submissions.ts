import { getCollection } from "../config/mongo";
import type { RequestHandler } from "express";

export const getSubmission: RequestHandler = async (req, res) => {
  try {
    const user = (req as any).user;
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, message: "id required" });
    const col = await getCollection("submissions");
    let item: any = null;
    try {
      // Try direct _id string
      item = await col.findOne({ _id: id });
    } catch {}
    if (!item) {
      try {
        const { ObjectId } = await import("mongodb");
        const oid = new ObjectId(String(id));
        item = await col.findOne({ _id: oid });
      } catch {}
    }
    if (!item) {
      // try numeric id field
      if (!isNaN(Number(id))) {
        item = await col.findOne({ id: Number(id) });
      }
    }
    if (!item) return res.status(404).json({ success: false, message: "Submission not found" });
    // normalize _id
    if (item._id && item._id.toString) item._id = item._id.toString();

    // Authorization: allow owner or admins
    if (user && user.username && item.user_id && item.user_id !== user.username) {
      if (!user.role || !["platform_admin", "instructor"].includes(user.role)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    res.json({ success: true, message: "Submission retrieved", data: { submission: item } });
  } catch (e: any) {
    console.error("Get submission error:", e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
