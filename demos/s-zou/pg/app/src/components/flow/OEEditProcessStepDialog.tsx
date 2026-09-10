 import { useState } from "react";
 import { cn } from "@/lib/utils";
import celonisLogo from "@/assets/celonis-logo.png";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Checkbox } from "@/components/ui/checkbox";
 import { UnderlineTabs } from "@/components/ui/underline-tabs";
 import { Search, Plus, RefreshCw, AlertTriangle, Mail, Globe } from "lucide-react";
 
 interface ActionFlowItem {
   id: string;
   name: string;
   modules: { type: "action" | "email" | "globe"; count?: number }[];
   hasWarning?: boolean;
 }
 
 interface OEEditProcessStepDialogProps {
   isOpen: boolean;
   onClose: () => void;
   onSelect?: (actionFlowId: string) => void;
 }
 
 const sampleActionFlows: ActionFlowItem[] = [
   {
     id: "1",
     name: "Send Vendor Confirmation Form",
     modules: [
       { type: "action" },
       { type: "action" },
       { type: "action", count: 4 },
     ],
     hasWarning: false,
   },
   {
     id: "2",
     name: "Send Email Notification",
     modules: [{ type: "action" }, { type: "email" }],
     hasWarning: true,
   },
   {
     id: "3",
     name: "Send Vendor Confirmation Form",
     modules: [
       { type: "action" },
       { type: "action" },
       { type: "action", count: 3 },
     ],
     hasWarning: true,
   },
   {
     id: "4",
     name: "Alternative Supplier AI Agent",
     modules: [{ type: "action" }, { type: "globe" }, { type: "action" }],
     hasWarning: true,
   },
   {
     id: "5",
     name: "Update Source System",
     modules: [{ type: "action" }, { type: "action" }, { type: "action" }],
     hasWarning: true,
   },
   {
     id: "6",
     name: "Start Orchestration",
     modules: [{ type: "action" }],
     hasWarning: false,
   },
   {
     id: "7",
     name: "Send Email Notification (LLM)",
     modules: [{ type: "action" }, { type: "action" }, { type: "email" }],
     hasWarning: true,
   },
   {
     id: "8",
     name: "AI Powered Alternative Supplier",
     modules: [
       { type: "action" },
       { type: "action" },
       { type: "action", count: 3 },
     ],
     hasWarning: false,
   },
   {
     id: "9",
     name: "Clean Package",
     modules: [{ type: "globe" }],
     hasWarning: true,
   },
 ];
 
 function ModuleIcon({ type }: { type: "action" | "email" | "globe" }) {
   const baseClasses = "w-5 h-5 rounded flex items-center justify-center";
   
   switch (type) {
     case "email":
       return (
         <div className={cn(baseClasses, "bg-orange-100")}>
           <Mail className="w-3 h-3 text-orange-600" />
         </div>
       );
     case "globe":
       return (
         <div className={cn(baseClasses, "bg-blue-100")}>
           <Globe className="w-3 h-3 text-blue-600" />
         </div>
       );
     default:
       return (
         <div className={cn(baseClasses, "bg-foreground")}>
          <img src={celonisLogo} alt="" className="w-3 h-3 object-contain" />
         </div>
       );
   }
 }
 
 export function OEEditProcessStepDialog({
   isOpen,
   onClose,
   onSelect,
 }: OEEditProcessStepDialogProps) {
   const [searchQuery, setSearchQuery] = useState("");
   const [selectedItems, setSelectedItems] = useState<string[]>(["1"]);
   const [activeTab, setActiveTab] = useState("action-flow");
 
   const tabs = [{ id: "action-flow", label: "Action Flow", count: 10 }];
 
   const filteredFlows = sampleActionFlows.filter((flow) =>
     flow.name.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const toggleSelection = (id: string) => {
     setSelectedItems((prev) =>
       prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
     );
   };
 
   const handleNext = () => {
     if (selectedItems.length > 0 && onSelect) {
       onSelect(selectedItems[0]);
     }
     onClose();
   };
 
   return (
     <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
         <DialogHeader className="p-6 pb-4">
           <DialogTitle className="text-xl font-semibold">
             Edit process step
           </DialogTitle>
         </DialogHeader>
 
         <div className="px-6 space-y-4 flex-1 overflow-hidden flex flex-col">
           {/* Conditions Section */}
           <div className="flex items-center justify-between">
             <span className="font-medium">Conditions</span>
             <Button variant="link" className="text-primary p-0 h-auto">
               <Plus className="w-4 h-4 mr-1" />
               Create conditions
             </Button>
           </div>
 
           <div className="border-t border-border pt-4">
             <UnderlineTabs
               tabs={tabs}
               activeTab={activeTab}
               onTabChange={setActiveTab}
             />
           </div>
 
           {/* Search and Actions */}
           <div className="flex items-center gap-2">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input
                 placeholder="Search"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-9"
               />
             </div>
             <Button variant="ghost" size="icon">
               <RefreshCw className="w-4 h-4" />
             </Button>
             <Button variant="link" className="text-primary">
               <Plus className="w-4 h-4 mr-1" />
               Create Action Flow
             </Button>
           </div>
 
           {/* Instructions */}
           <p className="text-sm text-muted-foreground">
             Select Action Flows in the order you want them to be executed. Then
             click "Next" below to map inputs.
           </p>
 
           {/* Action Flow List */}
           <div className="flex-1 overflow-y-auto space-y-2 pb-4">
             {/* Selected Items */}
             {filteredFlows
               .filter((flow) => selectedItems.includes(flow.id))
               .map((flow) => (
                 <div
                   key={flow.id}
                   className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5 cursor-pointer"
                   onClick={() => toggleSelection(flow.id)}
                 >
                   <Checkbox checked={true} />
                   <div className="flex items-center gap-1">
                     {flow.modules.map((mod, idx) => (
                       <div key={idx} className="flex items-center">
                         <ModuleIcon type={mod.type} />
                         {mod.count && (
                           <span className="text-xs ml-0.5 text-muted-foreground">
                             +{mod.count}
                           </span>
                         )}
                       </div>
                     ))}
                   </div>
                   <span className="text-sm font-medium">{flow.name}</span>
                 </div>
               ))}
 
             {/* Available Items Header */}
             <div className="text-sm text-muted-foreground pt-2">
               Available Action Flows ({filteredFlows.filter((f) => !selectedItems.includes(f.id)).length})
             </div>
 
             {/* Available Items */}
             {filteredFlows
               .filter((flow) => !selectedItems.includes(flow.id))
               .map((flow) => (
                 <div
                   key={flow.id}
                   className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                   onClick={() => toggleSelection(flow.id)}
                 >
                   {flow.hasWarning ? (
                     <AlertTriangle className="w-4 h-4 text-warning" />
                   ) : (
                     <Checkbox checked={false} />
                   )}
                   <div className="flex items-center gap-1">
                     {flow.modules.map((mod, idx) => (
                       <div key={idx} className="flex items-center">
                         <ModuleIcon type={mod.type} />
                         {mod.count && (
                           <span className="text-xs ml-0.5 text-muted-foreground">
                             +{mod.count}
                           </span>
                         )}
                       </div>
                     ))}
                   </div>
                   <span className="text-sm font-medium">{flow.name}</span>
                 </div>
               ))}
           </div>
         </div>
 
         {/* Footer */}
         <div className="flex items-center justify-between p-6 border-t border-border">
           <Button variant="ghost" onClick={onClose}>
             Cancel
           </Button>
           <Button onClick={handleNext}>Next</Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }