 import { Table2, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
 
 interface DataRow {
   id: string;
   description: string;
   subject: string;
   category: string;
 }
 
 interface ABDataValidationTableProps {
   isOpen: boolean;
   onToggle: () => void;
   data?: DataRow[];
 }
 
 const sampleData: DataRow[] = [
   { id: "40551", description: "Can you guide me on how to configure the mobile app to sync with the desktop version in real-time?", subject: "Syncing Mobile App with Desktop Version", category: "Product Usage Questions" },
   { id: "40550", description: "I'm looking to enhance security. How do I set up two-factor authentication for all team members?", subject: "Setting Up Two-Factor Authentication", category: "Product Usage Questions" },
   { id: "40549", description: "How can I retrieve a report that shows all completed tasks by a specific team?", subject: "Retrieving Report on Completed Tasks by Team", category: "Product Usage Questions" },
   { id: "40548", description: "How do I use your software to conduct an inventory audit?", subject: "Conducting an Inventory Audit with Software", category: "Product Usage Questions" },
   { id: "40547", description: "Is there a quick way to see all attachments sent by a specific user within the platform?", subject: "Viewing Attachments Sent by a Specific User", category: "Product Usage Questions" },
   { id: "40546", description: "It would be great if there was a feature to receive alerts about new updates or features directly in the app.", subject: "Alerts for New Updates or Features", category: "Feature Request" },
   { id: "40545", description: "Can you introduce a collaborative brainstorming tool with interactive mind maps?", subject: "Collaborative Brainstorming with Interactive Mind Maps", category: "Feature Request" },
   { id: "40544", description: "A drag-and-drop interface for organizing workflow more visually would be very helpful.", subject: "Visual Workflow Organization via Drag-and-Drop", category: "Feature Request" },
   { id: "40543", description: "Consider adding a reminder feature that can be set for important dates directly from the dashboard.", subject: "Reminder Setting for Important Dates", category: "Feature Request" },
   { id: "40542", description: "Can you add a feature for audio notes within the note-taking section?", subject: "Audio Notes in Note-Taking Section", category: "Feature Request" },
 ];
 
export function ABDataValidationTable({ isOpen, onToggle, data = sampleData }: ABDataValidationTableProps) {
   return (
     <div className="bg-background flex flex-col border-t border-border">
       {/* Table content - opens upward */}
       {isOpen && (
         <div className="max-h-[280px] overflow-auto border-b border-border">
           <Table>
             <TableHeader>
               <TableRow className="bg-muted/40 hover:bg-muted/40">
                 <TableHead className="w-20">
                   <button className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-foreground/80">
                     Id
                     <ArrowUpDown className="w-3 h-3" />
                   </button>
                 </TableHead>
                 <TableHead>
                   <button className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-foreground/80">
                     Description
                     <ArrowUpDown className="w-3 h-3" />
                   </button>
                 </TableHead>
                 <TableHead>
                   <button className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-foreground/80">
                     Subject
                     <ArrowUpDown className="w-3 h-3" />
                   </button>
                 </TableHead>
                 <TableHead className="w-48">
                   <button className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-foreground/80">
                     Category
                     <ArrowUpDown className="w-3 h-3" />
                   </button>
                 </TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {data.map((row) => (
                 <TableRow key={row.id} className="text-[13px] hover:bg-muted/20">
                   <TableCell className="font-normal py-2.5">{row.id}</TableCell>
                   <TableCell className="py-2.5">{row.description}</TableCell>
                   <TableCell className="py-2.5">{row.subject}</TableCell>
                   <TableCell className="py-2.5">{row.category}</TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </div>
       )}
       
       {/* Header bar - always at bottom */}
       <div className="px-4 py-2.5 flex items-center justify-between bg-background">
         <span className="text-sm font-medium text-foreground">Data Validation Table</span>
         <button
           onClick={onToggle}
           className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
         >
           <Table2 className="w-4 h-4" />
           {isOpen ? "Hide table" : "Show table"}
         </button>
       </div>
     </div>
   );
 }