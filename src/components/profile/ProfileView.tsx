import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Save,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { LoadingState, ErrorState } from "@/components/common/states";
import { useTasks } from "@/context/TaskContext";
import { fmtDate } from "@/lib/format";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  avatarUrl: z.string().trim().url("Must be a valid URL").or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileView() {
  const { profile, stats, updateProfile, state, reload } = useTasks();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.fullName ?? "",
      email: profile?.email ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
    },
  });

  if (state === "loading" && !profile) {
    return <LoadingState rows={4} />;
  }

  if (state === "error" && !profile) {
    return <ErrorState onRetry={reload} />;
  }

  const initials = profile.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OT";

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      await updateProfile(values);
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="User Profile"
        description="View your workspace statistics and manage your account details."
      />

      {/* User Info Overview Card */}
      <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-card sm:flex-row sm:items-center">
        <Avatar className="size-20 border-2 border-primary/20 shadow-sm">
          <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{profile.fullName}</h2>
            <span className="rounded-full bg-success-soft border border-success/20 px-2 py-0.5 text-xs font-semibold text-success">
              Active Member
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-3.5" /> {profile.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" /> Joined {fmtDate(profile.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Task Activity Summary Cards */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Task Activity Summary</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Tasks Assigned"
            value={stats.total}
            icon={ListTodo}
            hint="Workspace task total"
            tone="primary"
          />
          <StatCard
            label="Completed Tasks"
            value={stats.completed}
            icon={CheckCircle2}
            hint={`${stats.completionRate}% completion rate`}
            tone="success"
          />
          <StatCard
            label="Pending Tasks"
            value={stats.pending + stats.inProgress}
            icon={Clock}
            hint="Awaiting action"
            tone="warning"
          />
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <div className="border-b pb-4 mb-6">
          <h3 className="text-base font-semibold text-foreground">Edit Profile Information</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update your public profile details. Changes are saved to your browser session.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Full Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar Image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/avatar.jpg (optional)"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-3">
              <Button type="submit" disabled={isSaving} className="shadow-sm shadow-primary/25">
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isSaving ? "Saving changes..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
