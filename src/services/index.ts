import { mockTaskService } from "./mockTaskService";
import type { TaskService } from "./taskService.types";

// Swap to `apiTaskService` from "./apiTaskService" when the backend is ready.
export const taskService: TaskService = mockTaskService;
export type { TaskService };
