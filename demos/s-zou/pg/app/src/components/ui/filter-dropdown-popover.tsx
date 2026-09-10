 import { useState, useMemo } from "react";
 import { cn } from "@/lib/utils";
 import { Search, Copy, RotateCcw, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
 import { Input } from "@/components/ui/input";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Button } from "@/components/ui/button";
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "@/components/ui/popover";
 
 interface FilterOption {
   value: string;
   label: string;
   count?: number | string;
 }
 
 interface FilterDropdownPopoverProps {
   label: string;
   placeholder?: string;
   options: FilterOption[];
   selectedValues?: string[];
   onSelectionChange?: (values: string[]) => void;
   className?: string;
 }
 
 export function FilterDropdownPopover({
   label,
   placeholder,
   options,
   selectedValues = [],
   onSelectionChange,
   className,
 }: FilterDropdownPopoverProps) {
   const [open, setOpen] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const [selected, setSelected] = useState<Set<string>>(new Set(selectedValues));
   const [expanded, setExpanded] = useState(true);
 
   const filteredOptions = useMemo(() => {
     if (!searchQuery.trim()) return options;
     const query = searchQuery.toLowerCase();
     return options.filter(opt => 
       opt.label.toLowerCase().includes(query) || 
       opt.value.toLowerCase().includes(query)
     );
   }, [options, searchQuery]);
 
   const handleToggle = (value: string) => {
     const next = new Set(selected);
     if (next.has(value)) {
       next.delete(value);
     } else {
       next.add(value);
     }
     setSelected(next);
     onSelectionChange?.(Array.from(next));
   };
 
   const handleReset = () => {
     setSelected(new Set());
     onSelectionChange?.([]);
   };
 
   const handleClose = () => {
     setOpen(false);
   };
 
   const formatCount = (count: number | string | undefined) => {
     if (count === undefined) return null;
     if (typeof count === 'string') return count;
     if (count >= 1000) {
       return `${(count / 1000).toFixed(count >= 10000 ? 0 : 2).replace(/\.?0+$/, '')}K`;
     }
     return count.toString();
   };
 
   return (
     <Popover open={open} onOpenChange={setOpen}>
       <PopoverTrigger asChild>
         <button
           className={cn(
             "w-full h-10 px-3 text-sm bg-card border border-border rounded-md flex items-center justify-between hover:bg-secondary/50 transition-colors",
             open && "ring-2 ring-primary/20 border-primary",
             className
           )}
         >
           <span className={cn(
             "truncate",
             selected.size === 0 ? "text-muted-foreground" : "text-foreground"
           )}>
             {selected.size > 0 ? `${selected.size} selected` : (placeholder || label)}
           </span>
           <ChevronDown className={cn(
             "h-4 w-4 text-muted-foreground transition-transform",
             open && "rotate-180"
           )} />
         </button>
       </PopoverTrigger>
       <PopoverContent 
         className="w-80 p-0 bg-card border border-border shadow-lg z-50" 
         align="start"
         sideOffset={4}
       >
         {/* Header */}
         <div className="p-4 pb-3">
           <h4 className="text-sm font-semibold text-foreground mb-3">{label}</h4>
           
           {/* Search input */}
           <div className="relative">
             <Input
               type="text"
               placeholder="Search..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full h-9 pl-3 pr-9 text-sm bg-card border-border"
             />
             <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           </div>
         </div>
 
         {/* Selection info bar */}
         <div className="px-4 py-2 flex items-center justify-between border-t border-border bg-muted/30">
           <span className="text-xs text-muted-foreground">
             {selected.size} selected
           </span>
           <div className="flex items-center gap-1">
             <button 
               className="p-1.5 rounded hover:bg-secondary transition-colors"
               title="Copy selection"
             >
               <Copy className="h-3.5 w-3.5 text-muted-foreground" />
             </button>
             <button 
               className="p-1.5 rounded hover:bg-secondary transition-colors"
               onClick={handleReset}
               title="Reset selection"
             >
               <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
             </button>
             <button 
               className="p-1.5 rounded hover:bg-secondary transition-colors"
               title="Sort options"
             >
               <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
             </button>
             <button 
               className="p-1.5 rounded hover:bg-secondary transition-colors"
               onClick={() => setExpanded(!expanded)}
               title={expanded ? "Collapse" : "Expand"}
             >
               {expanded ? (
                 <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
               ) : (
                 <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
               )}
             </button>
           </div>
         </div>
 
         {/* Options list */}
         {expanded && (
           <div className="max-h-64 overflow-auto border-t border-border">
             {filteredOptions.length === 0 ? (
               <div className="p-4 text-center text-sm text-muted-foreground">
                 No options found
               </div>
             ) : (
               filteredOptions.map((option) => (
                 <label
                   key={option.value}
                   className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 cursor-pointer transition-colors"
                 >
                   <div className="flex items-center gap-3">
                     <Checkbox
                       checked={selected.has(option.value)}
                       onCheckedChange={() => handleToggle(option.value)}
                       className="h-4 w-4 rounded border-border"
                     />
                     <span className="text-sm text-foreground">{option.label}</span>
                   </div>
                   {option.count !== undefined && (
                     <span className="text-xs text-muted-foreground">
                       {formatCount(option.count)}
                     </span>
                   )}
                 </label>
               ))
             )}
           </div>
         )}
 
         {/* Footer */}
         <div className="p-3 border-t border-border flex justify-end">
           <Button
             variant="link"
             size="sm"
             onClick={handleClose}
             className="text-primary hover:text-primary/80 h-auto p-0"
           >
             Close
           </Button>
         </div>
       </PopoverContent>
     </Popover>
   );
 }