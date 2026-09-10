 import { useState } from "react";
 import { cn } from "@/lib/utils";
 import { Search, Settings, Wrench, FileCode, Mail, Code, GitBranch } from "lucide-react";
 import { Input } from "@/components/ui/input";
 
 interface ModuleOption {
   id: string;
   name: string;
   icon: React.ReactNode;
   iconBg?: string;
 }
 
 interface FlowModulePickerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSelect: (moduleId: string) => void;
   className?: string;
 }
 
 const appsInScenario: ModuleOption[] = [
   { 
     id: "outlook", 
     name: "Microsoft 365 Email (Outlook)", 
     icon: <Mail className="w-5 h-5 text-white" />,
     iconBg: "bg-[#0078D4]"
   },
 ];
 
 const allApps: ModuleOption[] = [
   { 
     id: "celonis", 
     name: "Celonis", 
     icon: <span className="text-white font-bold text-sm">C</span>,
     iconBg: "bg-foreground"
   },
   { 
     id: "tools", 
     name: "Tools", 
     icon: <Wrench className="w-5 h-5 text-white" />,
     iconBg: "bg-[#8b5cf6]"
   },
   { 
     id: "flow-control", 
     name: "Flow Control", 
     icon: <Settings className="w-5 h-5 text-[#0078D4]" />,
     iconBg: "bg-white border border-[#0078D4]"
   },
   { 
     id: "outlook-2", 
     name: "Microsoft 365 Email (Outlook)", 
     icon: <Mail className="w-5 h-5 text-white" />,
     iconBg: "bg-[#0078D4]"
   },
   { 
     id: "text-parser", 
     name: "Text Parser", 
     icon: <FileCode className="w-5 h-5 text-white" />,
     iconBg: "bg-[#f97316]"
   },
 ];
 
 export function FlowModulePicker({ open, onOpenChange, onSelect, className }: FlowModulePickerProps) {
   const [searchQuery, setSearchQuery] = useState("");
 
   const filteredAppsInScenario = appsInScenario.filter(app =>
     app.name.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const filteredAllApps = allApps.filter(app =>
     app.name.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const handleSelect = (id: string) => {
     onSelect(id);
     onOpenChange(false);
     setSearchQuery("");
   };
 
   if (!open) return null;
 
   return (
     <>
       {/* Backdrop to close on click outside */}
       <div 
         className="fixed inset-0 z-40" 
         onClick={() => onOpenChange(false)} 
       />
       
       {/* Picker Panel */}
       <div className={cn(
         "w-80 bg-card border border-border rounded-lg shadow-lg z-50",
         className
       )}>
           {/* Apps in Scenario */}
           <div className="p-3 pb-2">
             <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
               Apps in Scenario
             </h4>
             <div className="space-y-1">
               {filteredAppsInScenario.map((app) => (
                 <button
                   key={app.id}
                   onClick={() => handleSelect(app.id)}
                   className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                 >
                   <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", app.iconBg)}>
                     {app.icon}
                   </div>
                   <span className="text-sm font-medium">{app.name}</span>
                 </button>
               ))}
             </div>
           </div>
 
           <div className="border-t border-border" />
 
           {/* All Apps */}
           <div className="p-3 pb-2">
             <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
               All Apps
             </h4>
             <div className="space-y-1 max-h-48 overflow-y-auto">
               {filteredAllApps.map((app) => (
                 <button
                   key={app.id}
                   onClick={() => handleSelect(app.id)}
                   className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                 >
                   <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", app.iconBg)}>
                     {app.icon}
                   </div>
                   <span className="text-sm font-medium">{app.name}</span>
                 </button>
               ))}
             </div>
           </div>
 
           <div className="border-t border-border" />
 
           {/* Search */}
           <div className="p-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input
                 placeholder="Search apps or modules"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-9"
               />
             </div>
           </div>
         </div>
     </>
   );
 }