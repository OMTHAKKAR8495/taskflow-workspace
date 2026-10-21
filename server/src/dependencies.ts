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

  // Load all "blocks" and "blocked_by" dependencies
  const res = await query("SELECT task_id, depends_on_task_id, dependency_type FROM task_dependencies");
  
  // Build adjacency list: child -> parents (task -> prerequisites it depends on)
  const adj = new Map<string, Set<string>>();
  for (const row of res.rows) {
    let t = row.task_id;
    let dep = row.depends_on_task_id;
    
    // Normalize: if type is 'blocks', row.task_id blocks row.depends_on_task_id
    // meaning depends_on_task_id depends on task_id
    if (row.dependency_type === "blocks") {
      const temp = t;
      t = dep;
      dep = temp;
    }
    
    if (!adj.has(t)) adj.set(t, new Set());
    adj.get(t)!.add(dep);
  }

  // Check if dependsOnTaskId can reach taskId through dependencies
  // If dependsOnTaskId already depends on taskId, adding taskId -> dependsOnTaskId creates a cycle!
  const visited = new Set<string>();
  const queue = [dependsOnTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) {
      return true;
    }

    if (!visited.has(current)) {
      visited.add(current);
      const prerequisites = adj.get(current);
      if (prerequisites) {
        for (const p of prerequisites) {
          if (!visited.has(p)) {
            queue.push(p);
          }
        }
      }
    }
  }

  return false;
}
