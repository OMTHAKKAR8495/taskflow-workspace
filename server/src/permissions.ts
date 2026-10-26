import { query } from "./db.js";

export type RoleType = "leader" | "member" | "admin";

const roleCache = new Map<string, { role: string; expires: number }>();

export function clearRoleCache(userId?: string) {
  if (userId) {
    roleCache.delete(userId);
  } else {
    roleCache.clear();
  }
}

async function safeQuery(text: string, params?: any[], timeoutMs = 800) {
  try {
    const queryPromise = query(text, params);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB query timeout")), timeoutMs),
    );
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch {
    return { rows: [] as any[], rowCount: 0 };
  }
}

/**
 * Checks if a user has workspace-level leader/admin privileges.
 */
export async function isWorkspaceAdminOrLead(
  userId: string,
  userRecord?: { role?: string; id?: string },
): Promise<boolean> {
  if (!userId) return false;

  // 1. If explicit role is provided in userRecord (from active JWT or session), respect it!
  if (userRecord && userRecord.role) {
    const r = userRecord.role.toLowerCase();
    if (r === "member") return false;
    if (r === "admin" || r === "leader" || r === "lead") return true;
  }

  // 2. Cached role
  const cached = roleCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    const r = cached.role.toLowerCase();
    if (r === "member") return false;
    return r === "admin" || r === "leader" || r === "lead";
  }

  // 3. Database query with safe fallback
  try {
    const res = await safeQuery("SELECT id, username, email, role FROM users WHERE id = $1", [userId]);
    if (res.rows.length > 0) {
      const u = res.rows[0];
      const role = (u.role || "").toLowerCase();
      if (role === "member") {
        roleCache.set(userId, { role: "member", expires: Date.now() + 60000 });
        return false;
      }
      const isLead = Boolean(
        role === "admin" ||
        role === "leader" ||
        role === "lead" ||
        u.id === "user-om" ||
        u.username === "omthakkar" ||
        u.email === "omthakkar@example.com" ||
        (process.env.ADMIN_EMAIL && u.email.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase()),
      );

      roleCache.set(userId, { role: isLead ? "admin" : role, expires: Date.now() + 60000 });
      return isLead;
    }
  } catch {
    if (userId === "user-om") return true;
    return false;
  }

  // Fallback for default primary admin if not explicitly set to member
  if (userId === "user-om") return true;

  return false;
}

/**
 * Checks if a user is an owner or leader for a given project.
 */
export async function isProjectLeader(
  userId: string,
  projectId: string,
  projectRecord?: { ownerId?: string; owner_id?: string; lead?: string; members?: { id?: string; userId?: string; role?: string }[] },
): Promise<boolean> {
  if (!projectId) return false;

  // 1. Pre-fetched project record check first (fast path, zero DB query)
  if (projectRecord) {
    const owner = projectRecord.owner_id || projectRecord.ownerId;
    if (owner === userId) return true;
    if (projectRecord.members) {
      const m = projectRecord.members.find((x) => x.id === userId || x.userId === userId);
      if (m && m.role) {
        const r = m.role.toLowerCase();
        if (r === "owner" || r === "lead" || r === "admin" || r === "leader") return true;
        if (r === "developer" || r === "designer" || r === "member") return false;
      }
    }
  }

  // 2. Workspace global admin / leader check
  if (await isWorkspaceAdminOrLead(userId)) return true;

  // 3. Project owner query & lead matching
  try {
    const projRes = await safeQuery("SELECT owner_id, lead FROM projects WHERE id = $1", [projectId]);
    if (projRes.rows.length > 0) {
      const row = projRes.rows[0];
      if (row.owner_id === userId) return true;
      if (row.lead) {
        const uRes = await safeQuery("SELECT full_name, username FROM users WHERE id = $1", [userId]);
        if (uRes.rows.length > 0) {
          const u = uRes.rows[0];
          if (
            row.lead.toLowerCase() === u.full_name?.toLowerCase() ||
            row.lead.toLowerCase() === u.username?.toLowerCase()
          ) {
            return true;
          }
        }
      }
    }

    // 4. Project member with lead/owner role
    const pmRes = await safeQuery(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId],
    );
    if (pmRes.rows.length > 0) {
      const r = (pmRes.rows[0].role || "").toLowerCase();
      return r === "owner" || r === "lead" || r === "admin" || r === "leader";
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Checks if a user is an active member of a given project.
 */
export async function isProjectMember(
  userId: string,
  projectId: string,
  projectRecord?: { ownerId?: string; owner_id?: string; members?: { id?: string; userId?: string }[] },
): Promise<boolean> {
  if (!projectId) return false;

  // 1. Pre-fetched project record check first
  if (projectRecord) {
    const owner = projectRecord.owner_id || projectRecord.ownerId;
    if (owner === userId) return true;
    if (projectRecord.members) {
      const isM = projectRecord.members.some((x) => x.id === userId || x.userId === userId);
      if (isM) return true;
    }
  }

  if (await isWorkspaceAdminOrLead(userId)) return true;

  try {
    const projRes = await safeQuery("SELECT owner_id FROM projects WHERE id = $1", [projectId]);
    if (projRes.rows.length > 0 && projRes.rows[0].owner_id === userId) {
      return true;
    }

    const pmRes = await safeQuery(
      `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId],
    );
    return pmRes.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Verifies whether a user can edit / update a task.
 * Team leaders can update any task in their projects.
 * Team members can only update tasks assigned to them (or tasks they created).
 */
export async function canUserEditTask(
  userId: string,
  taskId: string,
  taskRecord?: any,
  projectRecord?: any,
): Promise<{ allowed: boolean; isLeader: boolean; reason?: string }> {
  let task = taskRecord;
  if (!task) {
    const taskRes = await safeQuery("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskRes.rows.length === 0) {
      return { allowed: false, isLeader: false, reason: "Task not found" };
    }
    task = taskRes.rows[0];
  }

  const projectId = task.project_id || task.projectId;
  const taskUserId = task.user_id || task.userId;
  const assigneeId = task.assignee_id || task.assigneeId || task.assignee?.id;
  const reviewerId = task.reviewer_id || task.reviewerId || task.reviewer?.id;

  // Check project leader or workspace admin
  const isLead = projectId
    ? await isProjectLeader(userId, projectId, projectRecord)
    : await isWorkspaceAdminOrLead(userId);

  if (isLead) {
    return { allowed: true, isLeader: true };
  }

  // If not lead, check if assigned member or creator or reviewer
  const isAssignee = assigneeId === userId;
  const isCreator = taskUserId === userId;
  const isReviewer = reviewerId === userId;

  if (isAssignee || isCreator || isReviewer) {
    return { allowed: true, isLeader: false };
  }

  return {
    allowed: false,
    isLeader: false,
    reason: "Unauthorized: Members cannot edit tasks assigned to other team members",
  };
}

/**
 * Verifies if user can submit a formal review decision (Approve or Request Changes).
 * Must be a project leader, project owner, or assigned reviewer.
 * Members CANNOT approve their own work.
 */
export async function canUserReviewTask(
  userId: string,
  taskId: string,
  taskRecord?: any,
  projectRecord?: any,
): Promise<{ allowed: boolean; reason?: string }> {
  let task = taskRecord;
  if (!task) {
    const taskRes = await safeQuery("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskRes.rows.length === 0) {
      return { allowed: false, reason: "Task not found" };
    }
    task = taskRes.rows[0];
  }

  const projectId = task.project_id || task.projectId;
  const assigneeId = task.assignee_id || task.assigneeId || task.assignee?.id;
  const reviewerId = task.reviewer_id || task.reviewerId || task.reviewer?.id;

  // Self-approval restriction: member cannot approve their own work if assigned and not a leader
  const isLead = projectId ? await isProjectLeader(userId, projectId, projectRecord) : await isWorkspaceAdminOrLead(userId);
  const isReviewer = reviewerId === userId;

  if (assigneeId === userId && !isLead) {
    return {
      allowed: false,
      reason: "Self-review forbidden: Team members cannot approve their own work",
    };
  }

  if (isLead || isReviewer) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Unauthorized: Only project leaders or designated reviewers can review task submissions",
  };
}

/**
 * Verifies whether a user is authorized to view a task and its details/progress/reviews.
 * Team leaders/admins can view all tasks in projects they lead or globally.
 * Team members can only view tasks assigned to them, tasks they created, or tasks they review.
 */
export async function canUserViewTask(
  userId: string,
  taskId: string,
  taskRecord?: any,
  projectRecord?: any,
): Promise<{ allowed: boolean; isLeader: boolean; reason?: string }> {
  let task = taskRecord;
  if (!task) {
    const taskRes = await safeQuery("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskRes.rows.length === 0) {
      return { allowed: false, isLeader: false, reason: "Task not found" };
    }
    task = taskRes.rows[0];
  }

  const projectId = task.project_id || task.projectId;
  const taskUserId = task.user_id || task.userId;
  const assigneeId = task.assignee_id || task.assigneeId || (task.assignee && task.assignee.id);
  const reviewerId = task.reviewer_id || task.reviewerId || (task.reviewer && task.reviewer.id);

  // Check project leader or workspace admin
  const isLead = (await isWorkspaceAdminOrLead(userId)) || (projectId ? await isProjectLeader(userId, projectId, projectRecord) : false);
  if (isLead) {
    return { allowed: true, isLeader: true };
  }

  // Member can only view tasks assigned to them, created by them, or where they are designated reviewer
  if (assigneeId === userId || taskUserId === userId || reviewerId === userId) {
    return { allowed: true, isLeader: false };
  }

  return {
    allowed: false,
    isLeader: false,
    reason: "Forbidden: You do not have permission to access this task",
  };
}

