import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type TaskSearchProps = {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
};

export function TaskSearch({ value, onChange, isLoading }: TaskSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
      <Input
        id="task-search"
        type="text"
        placeholder="Search tasks by title or assignee..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 animate-spin" />
      )}
    </div>
  );
}
