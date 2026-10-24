import { query } from "./db.js";

export interface DependencyRecord {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: "blocks" | "blocked_by" | "related";
  createdAt: string;
}

/**
 * Checks if adding an edge (taskId depends on dependsOnTaskId) would create a cycle.
 * In a blocking relationship: taskId is BLOCKED BY dependsOnTaskId.
 * This means dependsOnTaskId must finish before taskId.
 * A cycle occurs if taskId is already an ancestor of dependsOnTaskId
 * (i.e., dependsOnTaskId already directly or transitively depends on taskId).
 */
export async function wouldCreateCycle(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  if (taskId === dependsOnTaskId) {
    return true; // Self-dependency is always circular
  }

  // Check if dependsOnTaskId can reach taskId through dependencies
  // We perform targeted breadth-first traversal querying only relevant nodes
  const visited = new Set<string>();
  let currentBatch = [dependsOnTaskId];

  while (currentBatch.length > 0) {
    if (currentBatch.includes(taskId)) {
      return true;
    }

    for (const id of currentBatch) {
      visited.add(id);
    }

    // Find all prerequisite tasks that currentBatch tasks depend on
    const res = await query(
      `SELECT task_id, depends_on_task_id, dependency_type
       FROM task_dependencies
       WHERE (task_id = ANY($1) AND dependency_type = 'blocked_by')
          OR (depends_on_task_id = ANY($1) AND dependency_type = 'blocks')`,
      [currentBatch],
    );

    if (res.rows.length === 0) {
      break;
    }

    const nextBatch: string[] = [];
    for (const row of res.rows) {
      // If task_id depends_on depends_on_task_id (blocked_by), the prerequisite is depends_on_task_id
      // If type is 'blocks', depends_on_task_id depends on task_id, so if depends_on_task_id is in currentBatch, task_id is prerequisite
      const prereq = row.dependency_type === "blocked_by" ? row.depends_on_task_id : row.task_id;
      if (prereq === taskId) {
        return true;
      }
      if (!visited.has(prereq) && !nextBatch.includes(prereq)) {
        nextBatch.push(prereq);
      }
    }

    currentBatch = nextBatch;
  }

  return false;
}
