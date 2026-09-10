import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface CPToolCardProps {
  name: string;
  id: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export function CPToolCard({
  name,
  id,
  enabled = false,
  onToggle,
  className,
}: CPToolCardProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border bg-card",
        className
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{name}</span>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      <p className="text-xs text-muted-foreground mb-2">ID: {id}</p>
      <span className="inline-block px-2 py-0.5 text-xs rounded border border-border bg-muted/30 text-muted-foreground">
        Intelligent
      </span>
    </div>
  );
}
