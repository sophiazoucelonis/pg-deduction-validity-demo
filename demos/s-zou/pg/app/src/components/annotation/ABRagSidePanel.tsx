 import { useState } from "react";
 import { cn } from "@/lib/utils";
 import { ChevronDown, X, Info, Trash2 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 
 interface ABRagSidePanelProps {
   isOpen: boolean;
   onClose: () => void;
   inputFields: { id: string; label: string }[];
 }
 
 export function ABRagSidePanel({ isOpen, onClose, inputFields }: ABRagSidePanelProps) {
   const [findFor, setFindFor] = useState("Subject");
   const [findIn, setFindIn] = useState<string[]>(["Id"]);
   const [additionalData, setAdditionalData] = useState("");
 
   if (!isOpen) return null;
 
   return (
     <div className="w-[280px] border-l border-border bg-card flex flex-col h-full shrink-0">
       {/* Header */}
       <div className="p-4 border-b border-border">
         <div className="flex items-start justify-between">
           <div>
             <h3 className="font-semibold text-sm text-foreground">Context from similar items (RAG)</h3>
             <p className="text-xs text-muted-foreground mt-1">
               Uses similar past items from your data as context to help the AI generate better annotations.
             </p>
           </div>
           <button 
             onClick={onClose}
             className="p-1 text-muted-foreground hover:text-foreground rounded"
           >
             <Trash2 className="w-4 h-4" />
           </button>
         </div>
       </div>
 
       {/* Content */}
       <div className="flex-1 overflow-auto p-4 space-y-4">
         {/* Find similar items for */}
         <div className="space-y-2">
           <label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
             Find similar items for
             <Info className="w-3 h-3" />
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
           <label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
             Find similar items in
             <Info className="w-3 h-3" />
           </label>
           <div className="flex flex-wrap gap-2 p-2 border border-border rounded-md min-h-[40px] bg-background">
             {findIn.map((item) => (
               <span key={item} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs border border-primary/20">
                 <span className="text-primary font-medium">Aa</span>
                 {item}
                 <button
                   onClick={() => setFindIn(findIn.filter((i) => i !== item))}
                   className="ml-0.5 text-muted-foreground hover:text-foreground"
                 >
                   <X className="w-3 h-3" />
                 </button>
               </span>
             ))}
             <div className="flex-1 min-w-[60px]">
               <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
             </div>
           </div>
         </div>
 
         {/* Additional data */}
         <div className="space-y-2">
           <label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
             Additional data
             <Info className="w-3 h-3" />
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
 
       {/* Footer */}
       <div className="p-4 border-t border-border flex gap-2">
         <Button variant="outline" onClick={onClose} className="flex-1 hover:bg-muted text-sm">
           Cancel
         </Button>
         <Button onClick={onClose} disabled className="flex-1 bg-muted text-muted-foreground text-sm">
           Save
         </Button>
       </div>
     </div>
   );
 }