import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreateTaskFormSchema,
  UpdateTaskFormSchema,
  type CreateTaskFormValues,
  type UpdateTaskFormValues,
  type Task,
} from "@/features/tasks/types/task";
import { Loader2 } from "lucide-react";

// ─── Create form ─────────────────────────────────────────────────

type CreateFormProps = {
  onSubmit: (data: CreateTaskFormValues) => void;
  isPending: boolean;
  error?: string | null;
};

export function CreateTaskForm({ onSubmit, isPending, error }: CreateFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(CreateTaskFormSchema),
    defaultValues: {
      title: "",
      status: "todo",
      priority: "medium",
      assignee: "",
    },
  });

  const statusValue = watch("status");
  const priorityValue = watch("priority");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="create-title">Title</Label>
        <Input
          id="create-title"
          placeholder="What needs to be done?"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={statusValue}
            onValueChange={(v) => setValue("status", v as CreateTaskFormValues["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priorityValue}
            onValueChange={(v) => setValue("priority", v as CreateTaskFormValues["priority"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="create-assignee">Assignee</Label>
        <Input
          id="create-assignee"
          placeholder="Who's responsible?"
          {...register("assignee")}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? "Creating..." : "Create Task"}
      </Button>
    </form>
  );
}

// ─── Edit form ───────────────────────────────────────────────────

type EditFormProps = {
  task: Task;
  onSubmit: (data: UpdateTaskFormValues) => void;
  isPending: boolean;
  error?: string | null;
};

export function EditTaskForm({ task, onSubmit, isPending, error }: EditFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateTaskFormValues>({
    resolver: zodResolver(UpdateTaskFormSchema),
    defaultValues: {
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee ?? "",
    },
  });

  const statusValue = watch("status");
  const priorityValue = watch("priority");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" {...register("title")} />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={statusValue}
            onValueChange={(v) => setValue("status", v as UpdateTaskFormValues["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priorityValue}
            onValueChange={(v) => setValue("priority", v as UpdateTaskFormValues["priority"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-assignee">Assignee</Label>
        <Input id="edit-assignee" {...register("assignee")} />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
