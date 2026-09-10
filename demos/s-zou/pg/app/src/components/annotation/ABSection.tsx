import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Check, Pencil, X, Trash2, Settings, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface ABSectionProps {
  stepNumber: number;
  title: string;
  description?: string;
  isComplete?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ABSection({
  stepNumber,
  title,
  description,
  isComplete = false,
  defaultExpanded = false,
  children,
  className,
}: ABSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          {isComplete ? (
            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center text-xs font-medium text-primary">
              {stepNumber}
            </div>
          )}

          {/* Title and description */}
          <div className="text-left">
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
            {description && !isExpanded && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}

interface InputTagProps {
  label: string;
  type?: "string" | "number" | "date" | "location" | "variable";
  onRemove?: () => void;
  variant?: "default" | "inline";
}

export function InputTag({ label, type = "string", onRemove, variant = "default" }: InputTagProps) {
  if (variant === "inline") {
    // Inline variable tag style (like in the screenshot with blue background)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary rounded text-sm font-medium">
        <span className="text-primary">%</span>
        <span>{label}</span>
      </span>
    );
  }
  
  const typeIcons: Record<string, string> = {
    string: "Aa",
    number: "#",
    date: "📅",
    location: "📍",
    variable: "%",
  };
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm">
      <span className="text-accent text-xs">{typeIcons[type]}</span>
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Prompt Tools Sub-section
interface PromptToolProps {
  name: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onSettings?: () => void;
}

export function PromptTool({ name, enabled, onToggle, onSettings }: PromptToolProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={onToggle} />
        <span className="text-sm">{name}</span>
      </div>
      {onSettings && (
        <button
          onClick={onSettings}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// RAG Settings Dialog
interface RAGSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inputFields: { id: string; label: string }[];
}

export function RAGSettingsDialog({ isOpen, onClose, inputFields }: RAGSettingsDialogProps) {
  const [findFor, setFindFor] = useState("Subject");
  const [findIn, setFindIn] = useState<string[]>(["Id"]);
  const [additionalData, setAdditionalData] = useState("");

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-primary font-semibold">Context from similar items (RAG)</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">
          Uses similar past items from your data as context to help the AI generate better annotations.
        </p>
        
        <div className="space-y-4 pt-6 pb-6">
          {/* Find similar items for */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Find similar items for
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
            <div className="relative">
              <select
                value={findFor}
                onChange={(e) => setFindFor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {inputFields.map((field) => (
                  <option key={field.id} value={field.label}>
                    {field.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Find similar items in */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Find similar items in
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
            <div className="flex flex-wrap gap-2 p-2 border border-border rounded-md min-h-[40px]">
              {findIn.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm border border-primary/20">
                  {item}
                  <button
                    onClick={() => setFindIn(findIn.filter((i) => i !== item))}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Additional data */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Additional data
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
            <div className="relative">
              <select
                value={additionalData}
                onChange={(e) => setAdditionalData(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select...</option>
                {inputFields.map((field) => (
                  <option key={field.id} value={field.label}>
                    {field.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button variant="outline" onClick={onClose} className="hover:bg-muted">
            Cancel
          </Button>
          <Button onClick={onClose} disabled className="bg-muted text-muted-foreground">
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface PromptToolsSectionProps {
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function PromptToolsSection({ count, children, defaultExpanded = false }: PromptToolsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-border rounded-lg mt-4 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Prompt Tools ({count})</span>
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 py-2 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

interface OutputFieldProps {
  index: number;
  name: string;
  description: string;
  outputType: "String" | "Choice";
  choices?: string;
  onNameChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
  onTypeChange?: (type: "String" | "Choice") => void;
  onChoicesChange?: (value: string) => void;
  onRemove?: () => void;
}

export function OutputField({
  index,
  name,
  description,
  outputType,
  choices = "",
  onNameChange,
  onDescriptionChange,
  onTypeChange,
  onChoicesChange,
  onRemove,
}: OutputFieldProps) {
  return (
    <div className="space-y-3 pb-4">
      <span className="text-sm font-semibold">Output {index}</span>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground font-medium">Column name</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange?.(e.target.value)}
            placeholder="Enter column name"
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={onRemove}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded-md"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">Select output type</span>
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => onTypeChange?.("String")}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium transition-colors",
                  outputType === "String"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                String
              </button>
              <button
                onClick={() => onTypeChange?.("Choice")}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium transition-colors",
                  outputType === "Choice"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                Choice
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 pl-3 border-l-2 border-border">
        <label className="text-xs text-muted-foreground font-medium">Column description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange?.(e.target.value)}
          placeholder="Enter column description"
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        
        {outputType === "Choice" && (
          <div className="space-y-2 mt-3">
            <label className="text-xs text-muted-foreground font-medium">Type choices</label>
            <textarea
              value={choices}
              onChange={(e) => onChoicesChange?.(e.target.value)}
              placeholder="Enter choices separated by commas"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[60px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Enter all choices in plain text, while separating them with a comma.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
