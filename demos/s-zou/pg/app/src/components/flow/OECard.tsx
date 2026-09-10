 import { cn } from "@/lib/utils";
 import { LucideIcon, ArrowDown, Workflow, RotateCcw, CheckCircle, MoreVertical, Radio, AlertTriangle } from "lucide-react";
import celonisLogo from "@/assets/celonis-logo.png";
 
 export type OECardType = "start" | "process" | "resume" | "end";
 
 interface OECardItem {
   id: string;
   label: string;
   modules?: { type: "action" | "email" | "globe"; count?: number }[];
   hasWarning?: boolean;
   isEvent?: boolean;
 }
 
 interface OECardProps {
   type: OECardType;
   title: string;
   items: OECardItem[];
   className?: string;
   isSelected?: boolean;
   isEditMode?: boolean;
   onClick?: () => void;
   onMenuClick?: () => void;
 }
 
 const typeConfig: Record<OECardType, { icon: LucideIcon; label: string }> = {
   start: { icon: ArrowDown, label: "Start process" },
   process: { icon: Workflow, label: "Process step" },
   resume: { icon: RotateCcw, label: "Resume process" },
   end: { icon: CheckCircle, label: "End process" },
 };
 
 function ModuleIcon({ type }: { type: "action" | "email" | "globe" }) {
   const baseClasses = "w-5 h-5 rounded flex items-center justify-center";
   
   return (
     <div className={cn(baseClasses, "bg-foreground")}>
      <img src={celonisLogo} alt="" className="w-3 h-3 object-contain" />
     </div>
   );
 }
 
 export function OECard({ type, title, items, className, isSelected, isEditMode, onClick, onMenuClick }: OECardProps) {
   const config = typeConfig[type];
   const Icon = config.icon;
 
   return (
     <div
       className={cn(
         "w-80 bg-card rounded-lg overflow-hidden transition-all",
         isSelected ? "ring-2 ring-primary shadow-md" : "border border-border shadow-sm hover:shadow-md",
         isEditMode && "cursor-pointer",
         className
       )}
       onClick={onClick}
     >
       {/* Header */}
       <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50">
         <div className="flex items-center gap-2">
           <Icon className="w-4 h-4 text-muted-foreground" />
           <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
         </div>
         {isEditMode && (
           <button 
             onClick={(e) => { e.stopPropagation(); onMenuClick?.(); }}
             className="p-1 hover:bg-muted rounded"
           >
             <MoreVertical className="w-4 h-4 text-muted-foreground" />
           </button>
         )}
       </div>
 
       {/* Items */}
       <div className="p-3">
         {items.map((item) => (
           <div
             key={item.id}
             className="flex items-center justify-between p-2"
           >
             <div className="flex items-center gap-3">
               {item.isEvent ? (
                 <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                   <Radio className="w-4 h-4 text-primary" />
                 </div>
               ) : item.modules ? (
                 <div className="flex items-center gap-0.5">
                   {item.modules.slice(0, 3).map((mod, idx) => (
                     <ModuleIcon key={idx} type={mod.type} />
                   ))}
                   {item.modules.length > 3 && (
                     <span className="text-xs text-muted-foreground ml-0.5">
                       +{item.modules.length - 3}
                     </span>
                   )}
                 </div>
               ) : (
                 <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                   <Workflow className="w-4 h-4 text-muted-foreground" />
                 </div>
               )}
               <span className="text-sm font-medium">{item.label}</span>
             </div>
             {item.hasWarning && (
               <AlertTriangle className="w-4 h-4 text-warning" />
             )}
           </div>
         ))}
       </div>
     </div>
   );
 }
 
 interface OEConnectorProps {
   className?: string;
   showAddButton?: boolean;
   onAddClick?: () => void;
 }
 
 export function OEConnector({ className, showAddButton, onAddClick }: OEConnectorProps) {
   return (
     <div className={cn("flex flex-col items-center", className)}>
       <div className="w-px h-4 bg-border" />
       {showAddButton && (
         <button 
           onClick={onAddClick}
           className="w-6 h-6 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
         >
           <span className="text-lg leading-none">+</span>
         </button>
       )}
       <div className="w-px h-4 bg-border" />
     </div>
   );
 }