import { GraduationCap } from "lucide-react";
import { usePrepMode } from "@/contexts/PrepModeContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PREP_BLUE = "#264aff";

export function PrepToggle() {
  const { prepMode, togglePrepMode } = usePrepMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={togglePrepMode}
          aria-label="Toggle preparation mode"
          aria-pressed={prepMode}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors text-[13px] font-medium",
            prepMode
              ? "text-white hover:opacity-90"
              : "hover:bg-secondary",
          )}
          style={
            prepMode
              ? { backgroundColor: PREP_BLUE }
              : { color: PREP_BLUE }
          }
        >
          <GraduationCap className="w-4 h-4" strokeWidth={prepMode ? 2.5 : 2} />
          Preparation Mode
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {prepMode ? "Exit preparation mode" : "Preparation mode"} (⌘⇧P)
      </TooltipContent>
    </Tooltip>
  );
}
