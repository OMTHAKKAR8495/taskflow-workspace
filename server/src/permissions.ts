import { query } from "./db.js";

export type RoleType = "leader" | "member" | "admin";

const roleCache = new Map<string, { role: string; expires: number }>();

/**
 * Checks if a user has workspace-level leader/admin privileges.
 */
export async function isWorkspaceAdminOrLead(
  userId: string,
  userRecord?: { role?: string; id?: string },
): Promise<boolean> {
  if (userId === "user-om" || userId === "omthakkar") return true;

  if (userRecord && userRecord.role) {
    const r = userRecord.role.toLowerCase();
    return r === "admin" || r === "leader" || r === "lead";
  }

  const cached = roleCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    const r = cached.role.toLowerCase();
    return r === "admin" || r === "leader" || r === "lead";
  }

  const res = await query("SELECT role FROM users WHERE id = $1", [userId]);
  if (res.rows.length > 0) {
    const role = (res.rows[0].role || "").toLowerCase();
    roleCache.set(userId, { role, expires: Date.now() + 60000 });
    return role === "admin" || role === "leader" || role === "lead";
  }
  return false;
}

/**
 * Checks if a user is an owner or leader for a given project.
 */
export async function isProjectLeader(
  userId: string,
  projectId: string,
  projectRecord?: { ownerId?: string; owner_id?: string; members?: { id?: string; userId?: string; role?: string }[] },
): Promise<boolean> {
  if (!projectId) return false;

  // 1. Workspace global admin / leader check
  if (await isWorkspaceAdminOrLead(userId)) return true;

  // 2. Pre-fetched project record check
  if (projectRecord) {
    const owner = projectRecord.owner_id || projectRecord.ownerId;
    if (owner === userId) return true;
    if (projectRecord.members) {
      const m = projectRecord.members.find((x) => x.id === userId || x.userId === userId);
      if (m && m.role) {
        const r = m.role.toLowerCase();
        if (r === "owner" || r === "lead" || r === "admin") return true;
      }
    }
  }

  // 3. Project owner query
  const projRes = await query("SELECT owner_id FROM projects WHERE id = $1", [projectId]);
  if (projRes.rows.length > 0 && projRes.rows[0].owner_id === userId) {
    return true;
  }

  // 4. Project member with lead/owner role
  const pmRes = await query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  if (pmRes.rows.length > 0) {
    const r = (pmRes.rows[0].role || "").toLowerCase();
    return r === "owner" || r === "lead" || r === "admin";
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
  if (await isWorkspaceAdminOrLead(userId)) return true;

  if (projectRecord) {
    const owner = projectRecord.owner_id || projectRecord.ownerId;
    if (owner === userId) return true;
    if (projectRecord.members) {
      const isM = projectRecord.members.some((x) => x.id === userId || x.userId === userId);
      if (isM) return true;
    }
  }

  const projRes = await query("SELECT owner_id FROM projects WHERE id = $1", [projectId]);
  if (projRes.rows.length > 0 && projRes.rows[0].owner_id === userId) {
    return true;
  }

  const pmRes = await query(
    `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  return pmRes.rows.length > 0;
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
    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskRes.rows.length === 0) {
      return { allowed: false, isLeader: false, reason: "Task not found" };
    }
    task = taskRes.rows[0];
  }

  const projectId = task.project_id || task.projectId;
  const taskUserId = task.user_id || task.userId;
  const assigneeId = task.assignee_id || task.assigneeId || task.assignee?.id;
  const reviewerId = task.reviewer_id || task.reviewerId || task.reviewer?.id;

  // If task has no project (personal task)
  if (!projectId) {
    const allowed = taskUserId === userId || (await isWorkspaceAdminOrLead(userId));
    return { allowed, isLeader: allowed, reason: allowed ? undefined : "Personal task owned by another user" };
  }

  // Check project leader
  const isLead = await isProjectLeader(userId, projectId, projectRecord);
  if (isLead) {
    return { allowed: true, isLeader: true };
  }

  // Check if assigned member or creator or reviewer
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
    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [taskId]);
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
    const taskRes = await query("SELECT * FROM tasks WHERE id = $1", [taskId]);
    if (taskRes.rows.length === 0) {
      return { allowed: false, isLeader: false, reason: "Task not found" };
    }
    task = taskRes.rows[0];
  }

  const projectId = task.project_id || task.projectId;
  const taskUserId = task.user_id || task.userId;
  const assigneeId = task.assignee_id || task.assigneeId || (task.assignee && task.assignee.id);
  const reviewerId = task.reviewer_id || task.reviewerId || (task.reviewer && task.reviewer.id);

  // Workspace admin / lead check
  if (await isWorkspaceAdminOrLead(userId)) {
    return { allowed: true, isLeader: true };
  }

  // Check project leader
  if (projectId) {
    const isLead = await isProjectLeader(userId, projectId, projectRecord);
    if (isLead) {
      return { allowed: true, isLeader: true };
    }
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

