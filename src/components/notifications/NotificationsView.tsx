import { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  Calendar,
  FileCheck2,
  ListTodo,
  MessageSquare,
  Sparkles,
  Info,
  Clock,
} from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import type { NotificationItem, Task } from "@/types";

export function NotificationsView() {
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, tasks } =
    useTasks();
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterType === "unread") return !n.isRead;
      if (filterType !== "all") return n.type === filterType;
      return true;
    });
  }, [notifications, filterType]);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      void markNotificationRead(item.id);
    }
    if (item.entityType === "task" && item.entityId) {
      const found = tasks.find((t) => t.id === item.entityId);
      if (found) setSelectedTask(found);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <ListTodo className="size-4 text-primary" />;
      case "review":
        return <FileCheck2 className="size-4 text-purple-500" />;
      case "mention":
        return <MessageSquare className="size-4 text-blue-500" />;
      case "deadline":
        return <Clock className="size-4 text-rose-500" />;
      default:
        return <Info className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications Center</h1>
            {unreadNotificationCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                {unreadNotificationCount} Unread
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Activity stream for task assignments, code reviews, @mentions, and upcoming milestone deadlines.
          </p>
        </div>

        {unreadNotificationCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllNotificationsRead()}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCheck className="size-3.5" /> Mark All as Read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={filterType} onValueChange={setFilterType} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="all" className="text-xs">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">
            Unread ({unreadNotificationCount})
          </TabsTrigger>
          <TabsTrigger value="assignment" className="text-xs">
            Assignments
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs">
            Reviews
          </TabsTrigger>
          <TabsTrigger value="mention" className="text-xs">
            Mentions
          </TabsTrigger>
          <TabsTrigger value="deadline" className="text-xs">
            Deadlines
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center bg-card/40">
              <Bell className="mx-auto size-10 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No notifications in this view</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You're completely up to date with workspace events.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card shadow-xs overflow-hidden">
              {filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex items-start justify-between p-4 transition-colors cursor-pointer ${
                    item.isRead ? "hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="size-8 rounded-lg border bg-card flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {getIcon(item.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{item.title}</span>
                        {!item.isRead && (
                          <span className="size-2 rounded-full bg-primary shrink-0" />
                        )}
                        <Badge variant="outline" className="text-[10px] uppercase capitalize">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.message}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                        <span>By {item.actorName}</span>
                        <span>•</span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!item.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        void markNotificationRead(item.id);
                      }}
                      title="Mark as read"
                      className="size-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    >
                      <Check className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
