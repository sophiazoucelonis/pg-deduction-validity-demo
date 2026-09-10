import { cn } from "@/lib/utils";

interface TemplateBannerProps {
  title: string;
  description: string;
  className?: string;
}

export function TemplateBanner({ title, description, className }: TemplateBannerProps) {
  return (
    <div className={cn("bg-muted/30 border-b border-border px-6 py-3", className)}>
      <p className="text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground ml-2">{description}</span>
      </p>
    </div>
  );
}
