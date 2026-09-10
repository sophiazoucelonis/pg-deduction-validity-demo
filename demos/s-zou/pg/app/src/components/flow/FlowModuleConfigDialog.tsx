 import { useState } from "react";
 import { cn } from "@/lib/utils";
 import { X, HelpCircle, ExternalLink, ChevronDown, Plus, GripVertical } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Switch } from "@/components/ui/switch";
 import { Checkbox } from "@/components/ui/checkbox";
 
export type ModuleType = "outlook" | "text-parser" | "tools";

interface Position {
  x: number;
  y: number;
}

interface FlowModuleConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  moduleType: ModuleType;
  moduleName: string;
  headerColor: string;
  modulePosition?: Position;
}

export function FlowModuleConfigDialog({
  isOpen,
  onClose,
  moduleType,
  moduleName,
  headerColor,
  modulePosition,
}: FlowModuleConfigDialogProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  // Position dialog relative to module if position provided, otherwise center
  const dialogStyle = modulePosition 
    ? { 
        left: modulePosition.x + 80,
        top: modulePosition.y - 100,
      }
    : { 
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -50%)" 
      };

  return (
    <div className="absolute z-50" style={dialogStyle} onClick={(e) => e.stopPropagation()}>
       <div className="w-[380px] bg-card rounded-lg shadow-xl border border-border overflow-hidden">
         {/* Header */}
         <div className={cn("flex items-center justify-between px-4 py-3 text-white", headerColor)}>
           <span className="font-medium">{moduleName}</span>
           <div className="flex items-center gap-2">
             <button className="p-1 hover:bg-white/20 rounded">
               <ExternalLink className="w-4 h-4" />
             </button>
             <button className="p-1 hover:bg-white/20 rounded">
               <HelpCircle className="w-4 h-4" />
             </button>
             <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
               <X className="w-4 h-4" />
             </button>
           </div>
         </div>
 
         {/* Content based on module type */}
         <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
           {moduleType === "outlook" && <OutlookConfig />}
           {moduleType === "text-parser" && <TextParserConfig />}
           {moduleType === "tools" && <ToolsConfig />}
         </div>
 
         {/* Footer */}
         <div className="px-4 py-3 border-t border-border space-y-3">
           <div className="flex items-center gap-2">
             <Switch
               checked={showAdvanced}
               onCheckedChange={setShowAdvanced}
             />
             <span className="text-sm text-muted-foreground">Show advanced settings</span>
           </div>
           
           <div className="flex items-center gap-3">
             <Button variant="outline" onClick={onClose} className="flex-1">
               Cancel
             </Button>
             <Button onClick={onClose} className="flex-1 bg-primary hover:bg-primary/90">
               Save
             </Button>
           </div>
         </div>
       </div>
     </div>
   );
 }
 
 function OutlookConfig() {
   const fields = [
     { id: "bcc", label: "Bcc Recipients", checked: false },
     { id: "body", label: "Body", checked: true },
     { id: "body-preview", label: "Body Preview", checked: false },
     { id: "categories", label: "Categories", checked: true },
     { id: "cc", label: "Cc Recipients", checked: false },
     { id: "change-key", label: "Change Key", checked: false },
   ];
 
   return (
     <>
       <ConfigSection label="Connection" required>
         <div className="flex items-center gap-2">
           <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted/30">
             <div className="w-6 h-6 rounded bg-[#0078D4] flex items-center justify-center">
               <span className="text-white text-xs font-bold">O</span>
             </div>
             <span className="text-sm">Outlook Connection Test ( )</span>
             <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
           </div>
           <Button variant="ghost" size="sm" className="text-muted-foreground">
             Add
           </Button>
         </div>
         <p className="text-xs text-muted-foreground mt-2">
           For more information on how to create a connection to Microsoft 365 Email (Outlook), see the{" "}
           <a href="#" className="text-primary underline">online Help</a>.
         </p>
       </ConfigSection>
 
       <ConfigSection label="Watch Emails" required>
         <div className="relative">
           <select className="w-full px-3 py-2 border border-border rounded-md bg-background appearance-none text-sm">
             <option>All</option>
             <option>Unread</option>
             <option>Read</option>
           </select>
           <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
         </div>
       </ConfigSection>
 
       <ConfigSection label="Mail Folder">
         <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md">
           <span className="px-2 py-0.5 bg-muted rounded text-sm">/ Inbox</span>
           <span className="px-2 py-0.5 bg-muted rounded text-sm">/</span>
           <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
             <Plus className="w-3 h-3 text-white" />
           </div>
         </div>
       </ConfigSection>
 
       <ConfigSection label="Search">
         <Input placeholder="" className="text-sm" />
         <p className="text-xs text-muted-foreground mt-1">
           More info about how to write a query <a href="#" className="text-primary underline">here</a>
         </p>
       </ConfigSection>
 
       <ConfigSection label="Fields">
         <div className="space-y-2">
           <div className="flex items-center gap-2">
             <Checkbox id="select-all" />
             <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
           </div>
           <div className="border border-border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
             {fields.map((field) => (
               <div key={field.id} className="flex items-center gap-2">
                 <Checkbox id={field.id} defaultChecked={field.checked} />
                 <label htmlFor={field.id} className="text-sm">{field.label}</label>
               </div>
             ))}
           </div>
         </div>
       </ConfigSection>
 
       <ConfigSection label="Limit" required>
         <Input defaultValue="5" className="text-sm" />
         <p className="text-xs text-muted-foreground mt-1">
           The maximum number of results to be worked with during one execution cycle.
         </p>
       </ConfigSection>
     </>
   );
 }
 
 function TextParserConfig() {
   return (
     <>
       <ConfigSection label="HTML">
         <div className="px-3 py-2 bg-[#1e293b] text-[#22d3ee] rounded-md text-sm font-mono">
           1. Body: Content
         </div>
       </ConfigSection>
     </>
   );
 }
 
 function ToolsConfig() {
   return (
     <>
       <ConfigSection label="Variables">
         <div className="border border-border rounded-md p-3 space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-sm font-medium">Item 1</span>
             <div className="flex items-center gap-1">
               <button className="p-1 text-muted-foreground hover:text-foreground">
                 <GripVertical className="w-4 h-4" />
               </button>
               <button className="p-1 text-muted-foreground hover:text-foreground">
                 <X className="w-4 h-4" />
               </button>
             </div>
           </div>
           
           <div className="space-y-2 pl-3 border-l-2 border-border">
             <div>
               <label className="text-sm font-medium">
                 Variable name <span className="text-destructive">*</span>
               </label>
               <Input defaultValue="text" className="mt-1 text-sm" />
             </div>
             <div>
               <label className="text-sm font-medium">Variable value</label>
               <div className="mt-1 px-3 py-2 bg-[#22d3ee]/20 text-[#0891b2] rounded-md text-sm font-mono">
                 6. Text
               </div>
             </div>
           </div>
         </div>
         
         <button className="flex items-center gap-2 text-sm text-primary mt-2">
           <Plus className="w-4 h-4" />
           Add item
         </button>
       </ConfigSection>
     </>
   );
 }
 
 function ConfigSection({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
   return (
     <div className="space-y-2">
       <div className="flex items-center gap-2">
         <Checkbox defaultChecked className="data-[state=checked]:bg-primary" />
         <label className="text-sm font-medium">
           {label}
           {required && <span className="text-destructive ml-0.5">*</span>}
         </label>
       </div>
       <div className="pl-6">
         {children}
       </div>
     </div>
   );
 }