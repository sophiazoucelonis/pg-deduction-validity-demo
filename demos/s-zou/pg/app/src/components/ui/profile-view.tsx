import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Share2, Settings, Filter, Info, Check, ChevronDown, GripVertical } from "lucide-react";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ProfileViewProps {
  id: string;
  data: Record<string, string | number>;
  onClose: () => void;
  className?: string;
}

interface ActivityItem {
  id: string;
  date: string;
  description: string;
  user: string;
  userInitial: string;
  userColor: string;
  timestamp: string;
}

// Sample activity data
const sampleActivities: ActivityItem[] = [
  {
    id: "1",
    date: "Feb 04, 2026",
    description: "Task Action 'Add Contract' successful for Task 'Inefficiency: Missing OLA'.",
    user: "aarti.rahul.mahatme",
    userInitial: "A",
    userColor: "bg-orange-100 text-orange-600",
    timestamp: "Feb 04, 2026 at 02:47 PM"
  },
  {
    id: "2",
    date: "Jan 23, 2026",
    description: "Task Action 'Add Contract' successful for Task 'Inefficiency: Missing OLA'.",
    user: "Gianmarco Iorio",
    userInitial: "G",
    userColor: "bg-green-100 text-green-600",
    timestamp: "Jan 23, 2026 at 12:31 PM"
  },
  {
    id: "3",
    date: "Dec 17, 2025",
    description: "Augmented Attribute 'Status' value changed from 'Open' to 'Ready for approval'.",
    user: "pi.khandelwal",
    userInitial: "P",
    userColor: "bg-purple-100 text-purple-600",
    timestamp: "Dec 17, 2025 at 06:21 AM"
  },
  {
    id: "4",
    date: "Dec 15, 2025",
    description: "Task Action 'Add Contract' successful for Task 'Inefficiency: Missing OLA'.",
    user: "c.conlan",
    userInitial: "C",
    userColor: "bg-teal-100 text-teal-600",
    timestamp: "Dec 15, 2025 at 05:44 PM"
  }
];

export function ProfileView({ id, data, onClose, className }: ProfileViewProps) {
  const [width, setWidth] = useState(900);
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(700, Math.min(1200, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const tabs = [
    { id: "activity", label: "Activity History" },
    { id: "comments", label: "Requisition Item Comments" }
  ];

  // Group activities by date
  const groupedActivities = sampleActivities.reduce((acc, activity) => {
    if (!acc[activity.date]) {
      acc[activity.date] = [];
    }
    acc[activity.date].push(activity);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  return (
    <div 
      className={cn(
        "fixed right-0 top-0 h-full bg-card border-l border-border shadow-lg z-50 flex",
        isResizing && "select-none",
        className
      )}
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50 transition-colors flex items-center"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-1 rounded bg-border opacity-0 hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border">
          <h2 className="font-semibold text-base">Requisition Item Details</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2 border-b border-border">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <div className="relative">
              <Filter className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                0
              </span>
            </div>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Main content - two column layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left column - main content */}
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* Recommendations Card */}
            <div className="border border-border rounded-lg bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">C</span>
                  </div>
                  <span className="font-medium text-sm">Celonis Recommendations</span>
                </div>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  🔍 Data Repository
                </button>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">1 Tasks</p>

                {/* Task card */}
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Inefficiency: Missing OLA</span>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 text-xs font-medium border border-border rounded-md flex items-center gap-1 hover:bg-secondary">
                        Open
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-orange-600">A</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">Recommended Contract</span>
                    <span className="text-foreground">4600000039 - 00010 | Supplier: 0000003020 - World Wide Computer Warehouse</span>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary text-center">
                        Add Contract
                      </button>
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <button className="w-full px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary text-center">
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity History Section */}
            <div className="space-y-4">
              <UnderlineTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

              <h4 className="text-sm font-semibold">Activity History</h4>

              {/* Activity timeline */}
              <div className="space-y-4">
                {Object.entries(groupedActivities).map(([date, activities]) => (
                  <div key={date} className="space-y-3">
                    <button className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      {date}
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 pl-2">
                        {/* Timeline dot and line */}
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-1.5" />
                          <div className="w-px flex-1 bg-muted-foreground/20 min-h-[40px]" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex items-start justify-between pb-4">
                          <p className="text-sm text-foreground max-w-md">{activity.description}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">{activity.user}</span>
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className={cn("text-xs", activity.userColor)}>
                                {activity.userInitial}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground text-xs whitespace-nowrap">{activity.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - attributes sidebar */}
          <div className="w-56 border-l border-border bg-muted/30 overflow-auto p-4 space-y-4">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="space-y-0.5">
                <dt className="text-xs font-semibold text-foreground">{key}</dt>
                <dd className="text-sm text-foreground">{String(value)}</dd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
