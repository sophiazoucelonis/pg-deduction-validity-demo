 import { useState } from "react";
 import { cn } from "@/lib/utils";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { UnderlineTabs } from "@/components/ui/underline-tabs";
 import { Search, Plus, Radio } from "lucide-react";
 
 interface EventItem {
   id: string;
   key: string;
   name: string;
 }
 
 interface OEAddEventDialogProps {
   isOpen: boolean;
   onClose: () => void;
   onSelect?: (eventId: string) => void;
 }
 
 const sampleEvents: EventItem[] = [
   {
     id: "1",
     key: "Vendor-PO-Confirmation-Missing",
     name: "Vendor PO Confirmation Missing",
   },
   { id: "2", key: "TestEventMarcin", name: "TestEventMarcin" },
   { id: "3", key: "Receive-Form-New", name: "Receive Form New" },
   {
     id: "4",
     key: "Received-Vendor-Assessment",
     name: "Received Vendor Assessment",
   },
   {
     id: "5",
     key: "Vendor-confirmation-notification-sent",
     name: "Vendor confirmation notification sent",
   },
   {
     id: "6",
     key: "Source-System-Write-back",
     name: "Source System Write-back",
   },
   {
     id: "7",
     key: "Receive-Vendor-Form-Response",
     name: "Receive Vendor Form Response",
   },
   {
     id: "8",
     key: "Send-Vendor-Confirmation-Form",
     name: "Send Vendor Confirmation Form",
   },
 ];
 
 export function OEAddEventDialog({
   isOpen,
   onClose,
   onSelect,
 }: OEAddEventDialogProps) {
   const [searchQuery, setSearchQuery] = useState("");
   const [selectedEvent, setSelectedEvent] = useState<string>("1");
   const [activeTab, setActiveTab] = useState("event");
 
   const tabs = [
     { id: "event", label: "Event", count: 7 },
     { id: "timer-event", label: "Timer event" },
   ];
 
   const filteredEvents = sampleEvents.filter(
     (event) =>
       event.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
       event.name.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const handleAdd = () => {
     if (selectedEvent && onSelect) {
       onSelect(selectedEvent);
     }
     onClose();
   };
 
   return (
     <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
         <DialogHeader className="p-6 pb-4">
           <DialogTitle className="text-xl font-semibold">Add event</DialogTitle>
         </DialogHeader>
 
         <div className="px-6 space-y-4 flex-1 overflow-hidden flex flex-col">
           <UnderlineTabs
             tabs={tabs}
             activeTab={activeTab}
             onTabChange={setActiveTab}
           />
 
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
             <Button variant="link" className="text-primary">
               <Plus className="w-4 h-4 mr-1" />
               Create event
             </Button>
           </div>
 
           {/* Events List */}
           <div className="flex-1 overflow-y-auto space-y-2 pb-4">
             {/* Selected Event */}
             {filteredEvents
               .filter((event) => event.id === selectedEvent)
               .map((event) => (
                 <div
                   key={event.id}
                   className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5 cursor-pointer"
                   onClick={() => setSelectedEvent(event.id)}
                 >
                   <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                     <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                     <Radio className="w-4 h-4 text-blue-600" />
                   </div>
                   <div>
                     <div className="text-sm font-medium">{event.key}</div>
                     <div className="text-xs text-muted-foreground">
                       {event.name}
                     </div>
                   </div>
                 </div>
               ))}
 
             {/* Available Events Header */}
             <div className="text-sm text-muted-foreground pt-2">
               Available events
             </div>
 
             {/* Available Events */}
             {filteredEvents
               .filter((event) => event.id !== selectedEvent)
               .map((event) => (
                 <div
                   key={event.id}
                   className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/30 cursor-pointer"
                   onClick={() => setSelectedEvent(event.id)}
                 >
                   <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                   <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                     <Radio className="w-4 h-4 text-blue-600" />
                   </div>
                   <div>
                     <div className="text-sm font-medium">{event.key}</div>
                     <div className="text-xs text-muted-foreground">
                       {event.name}
                     </div>
                   </div>
                 </div>
               ))}
           </div>
         </div>
 
         {/* Footer */}
         <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
           <Button variant="ghost" onClick={onClose}>
             Cancel
           </Button>
           <Button onClick={handleAdd}>Add</Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }