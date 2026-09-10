import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, Type, AlignLeft, Hash, CheckSquare, List, ChevronDown, Circle, Square } from "lucide-react";

interface FormComponentPickerProps {
  isOpen: boolean;
  onSelectComponent?: (componentType: string) => void;
  className?: string;
}

const basicComponents = [
  { id: "text-field", label: "Text Field", icon: Type },
  { id: "text-area", label: "Text Area", icon: AlignLeft },
  { id: "number", label: "Number", icon: Hash },
  { id: "checkbox", label: "Checkbox", icon: CheckSquare },
  { id: "multiselect", label: "Multiselect", icon: List },
  { id: "dropdown", label: "Dropdown", icon: ChevronDown },
  { id: "radio-group", label: "Radio group", icon: Circle },
  { id: "button", label: "Button", icon: Square },
];

const advancedSections = [
  { id: "advanced", label: "Advanced" },
  { id: "layout", label: "Layout" },
  { id: "data", label: "Data" },
];

export function FormComponentPicker({
  isOpen,
  onSelectComponent,
  className,
}: FormComponentPickerProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "w-64 bg-background border-l border-border h-full overflow-y-auto",
        className
      )}
    >
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for a component"
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Basic Components */}
      <div className="p-3">
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Basic</h3>
        <div className="space-y-0.5">
          {basicComponents.map((component) => (
            <button
              key={component.id}
              onClick={() => onSelectComponent?.(component.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left"
            >
              <component.icon className="w-4 h-4 text-muted-foreground" />
              <span>{component.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Sections */}
      {advancedSections.map((section) => (
        <div key={section.id} className="px-3 py-2 border-t border-border">
          <h3 className="text-xs font-medium text-muted-foreground">{section.label}</h3>
        </div>
      ))}
    </div>
  );
}
