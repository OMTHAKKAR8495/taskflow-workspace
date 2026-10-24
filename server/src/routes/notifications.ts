import { Router, type Response } from "express";
import { query } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../auth.js";

const router = Router();

function getUserId(req: AuthenticatedRequest): string {
  if (req.userId) return req.userId;
  return "user-om";
}

// GET /api/notifications - List user's notifications
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { unreadOnly, type, limit = 50 } = req.query;

    let sql = "SELECT * FROM notifications WHERE user_id = $1";
    const params: any[] = [userId];

    if (unreadOnly === "true") {
      sql += " AND is_read = FALSE";
    }

    if (type && typeof type === "string" && type !== "all") {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }

    sql += " ORDER BY created_at DESC";
    params.push(parseInt(String(limit), 10) || 50);
    sql += ` LIMIT $${params.length}`;

    const [result, unreadCountRes] = await Promise.all([
      query(sql, params),
      query(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        [userId],
      ),
    ]);
    const unreadCount = parseInt(unreadCountRes.rows[0]?.count || "0", 10);

    const items = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      type: row.type,
      title: row.title,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: Boolean(row.is_read),
      createdAt: new Date(row.created_at).toISOString(),
    }));

    res.json({
      notifications: items,
      unreadCount,
    });
  } catch (err: any) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// POST /api/notifications/:id/read - Mark one notification as read
router.post("/:id/read", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const result = await query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Error marking notification read:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post("/read-all", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    await query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error marking all read:", err);
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    await query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// DELETE /api/notifications/clear-all - Delete all read notifications
router.delete("/clear-all", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    await query("DELETE FROM notifications WHERE user_id = $1 AND is_read = TRUE", [userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error clearing notifications:", err);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;
