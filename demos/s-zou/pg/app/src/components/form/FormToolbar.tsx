import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Pencil, X } from "lucide-react";

interface FormToolbarProps {
  formName: string;
  isEditMode?: boolean;
  onSubmissions?: () => void;
  onEdit?: () => void;
  onExitEdit?: () => void;
  className?: string;
}

export function FormToolbar({
  formName,
  isEditMode = false,
  onSubmissions,
  onEdit,
  onExitEdit,
  className,
}: FormToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 h-14 bg-card border-b border-border",
        className
      )}
    >
      {/* Left - Form name */}
      <h2 className="font-semibold text-lg">{formName}</h2>

      {/* Right - Controls */}
      <div className="flex items-center gap-3">
        {isEditMode ? (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={onExitEdit}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            {/* Submissions button */}
            <Button variant="outline" size="sm" onClick={onSubmissions} className="hover:bg-muted">
              <FileText className="w-4 h-4 mr-1.5" />
              Submissions
            </Button>

            {/* Edit button */}
            <Button variant="default" size="icon" className="rounded-lg" onClick={onEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
