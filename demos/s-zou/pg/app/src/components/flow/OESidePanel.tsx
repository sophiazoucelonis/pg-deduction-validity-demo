 import { cn } from "@/lib/utils";
 import { Workflow, Pencil, Plus } from "lucide-react";
 
 interface OESidePanelAction {
   id: string;
   label: string;
   onEdit?: () => void;
 }
 
 interface OESidePanelProps {
   isOpen: boolean;
   type: "start" | "process" | "resume";
   title: string;
   description?: string;
   actions?: OESidePanelAction[];
   onAddAction?: () => void;
   className?: string;
 }
 
 export function OESidePanel({
   isOpen,
   type,
   title,
   description,
   actions = [],
   onAddAction,
   className,
 }: OESidePanelProps) {
   if (!isOpen) return null;
 
   return (
     <div
       className={cn(
        "w-80 border-l border-border bg-card flex flex-col",
         className
       )}
     >
       {/* Header */}
       <div className="p-4 border-b border-border">
         <div className="flex items-center gap-2 mb-2">
           <Workflow className="w-4 h-4 text-muted-foreground" />
           <span className="font-medium">{title}</span>
         </div>
         {description && (
           <p className="text-sm text-muted-foreground">{description}</p>
         )}
       </div>
 
       {/* Actions List */}
       <div className="flex-1 p-4">
         <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
           Actions
         </span>
         <div className="mt-3 space-y-1">
           {actions.map((action) => (
             <div
               key={action.id}
              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted group"
             >
               <div className="flex items-center gap-2">
                 <Workflow className="w-4 h-4 text-muted-foreground" />
                 <span className="text-sm">{action.label}</span>
               </div>
               <button
                 onClick={action.onEdit}
                 className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
               >
                 <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
               </button>
             </div>
           ))}
 
           {/* Add action button */}
           <button
             onClick={onAddAction}
              className="flex items-center gap-2 w-full py-2 px-3 rounded-md text-primary hover:bg-muted transition-colors"
           >
             <Plus className="w-4 h-4" />
             <span className="text-sm font-medium">Add action</span>
           </button>
         </div>
       </div>
     </div>
   );
 }