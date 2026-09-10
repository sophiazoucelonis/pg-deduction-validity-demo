import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { TemplateBanner } from "@/components/ui/template-banner";
import { ProfileView } from "@/components/ui/profile-view";
import { KpiSection } from "@/components/ui/kpi-section";
import { ViewFilterPanel } from "@/components/ui/view-filter-panel";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { DataTableEnhanced, EnhancedColumn, StatusPill, PriorityIndicator } from "@/components/ui/data-table-enhanced";
import { Button } from "@/components/ui/button";
import { Bookmark, Share, Settings2, Sparkles, RefreshCw, Pencil, Filter, Info } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Template data - replace with your actual data
interface DataRow {
  id: string;
  name: string;
  value: string;
  status: string;
  statusVariant: "success" | "warning" | "error" | "info" | "neutral";
  priority: "high" | "medium" | "low";
  date: string;
  category: string;
  amount: number;
}
const placeholderData: DataRow[] = [{
  id: "REQ-001",
  name: "Purchase Requisition Alpha",
  value: "12,450",
  status: "Open",
  statusVariant: "success",
  priority: "high",
  date: "2025-01-15",
  category: "Direct Material",
  amount: 12450
}, {
  id: "REQ-002",
  name: "Office Supplies Order",
  value: "2,340",
  status: "Late",
  statusVariant: "error",
  priority: "high",
  date: "2025-01-14",
  category: "Indirect",
  amount: 2340
}, {
  id: "REQ-003",
  name: "IT Equipment Request",
  value: "45,600",
  status: "In Progress",
  statusVariant: "warning",
  priority: "medium",
  date: "2025-01-13",
  category: "CapEx",
  amount: 45600
}, {
  id: "REQ-004",
  name: "Maintenance Services",
  value: "8,900",
  status: "Approved",
  statusVariant: "success",
  priority: "low",
  date: "2025-01-12",
  category: "Services",
  amount: 8900
}, {
  id: "REQ-005",
  name: "Raw Materials Batch",
  value: "156,000",
  status: "Open",
  statusVariant: "success",
  priority: "medium",
  date: "2025-01-11",
  category: "Direct Material",
  amount: 156000
}, {
  id: "REQ-006",
  name: "Consulting Services",
  value: "25,000",
  status: "Pending",
  statusVariant: "neutral",
  priority: "low",
  date: "2025-01-10",
  category: "Services",
  amount: 25000
}, {
  id: "REQ-007",
  name: "Safety Equipment",
  value: "4,200",
  status: "Late",
  statusVariant: "error",
  priority: "high",
  date: "2025-01-09",
  category: "Indirect",
  amount: 4200
}, {
  id: "REQ-008",
  name: "Packaging Materials",
  value: "18,750",
  status: "In Progress",
  statusVariant: "warning",
  priority: "medium",
  date: "2025-01-08",
  category: "Direct Material",
  amount: 18750
}];

// Chart data
const barChartData = [{
  name: "Jan",
  value: 42000,
  target: 40000
}, {
  name: "Feb",
  value: 38000,
  target: 40000
}, {
  name: "Mar",
  value: 55000,
  target: 45000
}, {
  name: "Apr",
  value: 47000,
  target: 45000
}, {
  name: "May",
  value: 62000,
  target: 50000
}, {
  name: "Jun",
  value: 51000,
  target: 50000
}];
const pieChartData = [{
  name: "Direct Material",
  value: 45,
  color: "hsl(217, 91%, 60%)"
}, {
  name: "Services",
  value: 25,
  color: "hsl(217, 91%, 70%)"
}, {
  name: "Indirect",
  value: 18,
  color: "hsl(217, 91%, 80%)"
}, {
  name: "CapEx",
  value: 12,
  color: "hsl(217, 91%, 45%)"
}];
const chartConfig = {
  value: {
    label: "Actual",
    color: "hsl(210, 100%, 50%)"
  },
  target: {
    label: "Target",
    color: "hsl(var(--muted))"
  }
};
export default function DashboardTemplate() {
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState<DataRow | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };
  const columns: EnhancedColumn<DataRow>[] = [{
    key: "id",
    header: "Requisition ID",
    className: "font-mono text-xs",
    render: (value, row) => <button className="text-[hsl(231,100%,50%)] hover:text-[hsl(231,100%,40%)] underline font-medium" onClick={e => {
      e.stopPropagation();
      setSelectedRecord(row);
    }}>
          {String(value)}
        </button>
  }, {
    key: "name",
    header: "Description"
  }, {
    key: "value",
    header: "Value (USD)",
    className: "font-medium text-right"
  }, {
    key: "status",
    header: "Status",
    render: (value, row) => <StatusPill status={String(value)} variant={row.statusVariant} />
  }, {
    key: "priority",
    header: "Priority",
    render: (value, row) => <PriorityIndicator level={row.priority} label={row.priority.charAt(0).toUpperCase() + row.priority.slice(1)} />
  }, {
    key: "category",
    header: "Category"
  }, {
    key: "date",
    header: "Created Date"
  }];
  const tabs = [{
    id: "all",
    label: "All Requisitions",
    count: 8
  }, {
    id: "open",
    label: "Open",
    count: 2
  }, {
    id: "late",
    label: "Late",
    count: 2
  }, {
    id: "approved",
    label: "Approved",
    count: 1
  }];
  const kpis = [{
    label: "Total Requisitions",
    value: "1,247",
    tooltip: "Total requisitions created in the selected period"
  }, {
    label: "Open Value",
    value: "$2.4M",
    tooltip: "Total value of open requisitions"
  }, {
    label: "On-Time Rate",
    value: "84%",
    tooltip: "Percentage of requisitions processed on time"
  }, {
    label: "Avg. Cycle Time",
    value: "4.2d",
    tooltip: "Average days from creation to approval"
  }, {
    label: "Late Items",
    value: "156",
    tooltip: "Number of requisitions past due date"
  }];
  const filterConfig = {
    toggleFilters: {
      label: "Filter by Inefficiencies",
      options: [{
        id: "no-inefficiencies",
        label: "Requisitions w/o Inefficiencies"
      }, {
        id: "contract-leakage",
        label: "Contract Leakage"
      }, {
        id: "free-text",
        label: "Free-Text Matched"
      }]
    },
    dateFilter: {
      label: "Filter by Creation Date",
      presets: [{
        id: "1m",
        label: "This Month"
      }, {
        id: "3m",
        label: "3 Months"
      }, {
        id: "6m",
        label: "6 Months"
      }, {
        id: "12m",
        label: "12 Months"
      }]
    },
    dropdownFilterGroups: [{
      id: "organization",
      label: "Filter by Organization",
      filters: [{
        id: "purchasing-org",
        label: "Purchasing Organization",
        placeholder: "Purchasing Organization",
        options: [{
          value: "org-0",
          label: "0",
          count: 180000
        }, {
          value: "org-1",
          label: "1 - Zentraleinkauf EU",
          count: 13
        }, {
          value: "org-1000",
          label: "1000 - Best Run Germany",
          count: 1490
        }, {
          value: "org-2000",
          label: "2000 - Best Run UK",
          count: 4
        }, {
          value: "org-2100",
          label: "2100 - Best Run Portugal",
          count: 6
        }, {
          value: "org-2200",
          label: "2200 - Best Run France",
          count: 1
        }, {
          value: "org-2400",
          label: "2400 - Best Run Italien",
          count: 32
        }, {
          value: "org-2500",
          label: "2500 - Best Run Niederlande",
          count: 3
        }]
      }, {
        id: "plant",
        label: "Plant",
        placeholder: "Plant",
        options: [{
          value: "plant-1",
          label: "Plant 1 - Munich",
          count: 245
        }, {
          value: "plant-2",
          label: "Plant 2 - Berlin",
          count: 189
        }, {
          value: "plant-3",
          label: "Plant 3 - Hamburg",
          count: 156
        }]
      }, {
        id: "material-number",
        label: "Material Number",
        placeholder: "Material Number",
        options: [{
          value: "mat-001",
          label: "MAT-001",
          count: 42
        }, {
          value: "mat-002",
          label: "MAT-002",
          count: 38
        }]
      }, {
        id: "material-group",
        label: "Material Group",
        placeholder: "Material Group",
        options: [{
          value: "group-a",
          label: "Group A",
          count: 120
        }, {
          value: "group-b",
          label: "Group B",
          count: 95
        }]
      }]
    }, {
      id: "order-info",
      label: "Filter by Order Info",
      filters: [{
        id: "supplier",
        label: "Supplier",
        placeholder: "Supplier",
        options: [{
          value: "supplier-1",
          label: "Supplier A",
          count: 89
        }, {
          value: "supplier-2",
          label: "Supplier B",
          count: 67
        }]
      }, {
        id: "nodel",
        label: "Nodel",
        placeholder: "Nodel",
        options: [{
          value: "nodel-1",
          label: "Nodel 1",
          count: 54
        }, {
          value: "nodel-2",
          label: "Nodel 2",
          count: 43
        }]
      }]
    }]
  };
  return <AppLayout treeItems={templateTreeItems} activeTreeId="template-dashboard" onTreeSelect={handleTreeSelect} breadcrumbs={[{
    label: "Studio"
  }, {
    label: "Templates"
  }, {
    label: "Dashboard"
  }]} showTree={true} className="p-0">
      <div className="h-full flex">
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header bar with title and actions */}
          <div className="flex items-center justify-between px-4 h-14 bg-card border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-lg">​Sample View  </h2>
              <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-1">
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Bookmark className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bookmark</TooltipContent>
                  </UITooltip>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Share className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export</TooltipContent>
                  </UITooltip>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Settings</TooltipContent>
                  </UITooltip>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>AI Tools</TooltipContent>
                  </UITooltip>
                </div>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={showFilterPanel ? "secondary" : "ghost"} size="sm" onClick={() => setShowFilterPanel(!showFilterPanel)} className="h-8">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Template Banner */}
          <TemplateBanner title="View Template" description="Use this template for data-focused dashboards. Customize the KPIs, charts, and tables below to match your use case." />

          {/* Content - white background */}
          <div className="flex-1 overflow-auto p-6 space-y-6 bg-white">
            {/* KPI Section */}
            <KpiSection title="Requisition Metrics" kpis={kpis} />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Spend by Category</h3>
                  <TooltipProvider delayDuration={300}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Distribution of spend across categories</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }} formatter={(value: number) => [`${value}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {pieChartData.map((item, index) => <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{
                    backgroundColor: item.color
                  }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>)}
                </div>
              </div>

              {/* Bar Chart with Axis Titles */}
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Late Requisitions over time</h3>
                  <TooltipProvider delayDuration={300}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Monthly trend of late requisitions</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                {/* Y-axis label - positioned under title */}
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="text-primary">↑</span> # Requisitions
                </div>
                <div className="h-64 relative">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <BarChart data={barChartData}>
                      <XAxis dataKey="name" tickLine={false} axisLine={{
                      stroke: 'hsl(var(--border))'
                    }} tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 12
                    }} label={{
                      value: 'Month →',
                      position: 'insideBottomRight',
                      offset: -5,
                      style: {
                        fontSize: 12,
                        fill: 'hsl(var(--muted-foreground))'
                      }
                    }} />
                      <YAxis tickLine={false} axisLine={{
                      stroke: 'hsl(var(--border))'
                    }} tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 12
                    }} tickFormatter={value => value >= 1000 ? `${Math.round(value / 1000)}K` : String(value)} width={40} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="hsl(217, 91%, 70%)" radius={[4, 4, 0, 0]} name="Requisitions" />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </div>

            {/* Data Table Section */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Requisitions</h3>
                  <TooltipProvider delayDuration={300}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>List of all requisitions matching current filters</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Underline Tabs */}
              <UnderlineTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

              {/* Enhanced Data Table */}
              <DataTableEnhanced columns={columns} data={placeholderData} showCheckbox={true} showPagination={true} pageSize={5} />
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && <ViewFilterPanel title="Filter Dimensions" toggleFilters={filterConfig.toggleFilters} dateFilter={filterConfig.dateFilter} dropdownFilterGroups={filterConfig.dropdownFilterGroups} onClose={() => setShowFilterPanel(false)} />}
      </div>

      {/* Profile View Slide-out */}
      {selectedRecord && <ProfileView id={selectedRecord.id} data={{
      "Requisition Number": "0010044192",
      "Item Nr.": "00010",
      "Inefficiency": "Yes",
      "Status": "Ready for approval",
      "Quantity": "200",
      "Price": "55,000.00",
      "Short Desc.": "PC Installation / Configuration",
      "Supplier Name": "-",
      "Contract OLA": "None",
      "Material Group": "007 - Services",
      "Material Number": "I-1000",
      "Item Delivery Date": "2021-09-21",
      "Requester": "-"
    }} onClose={() => setSelectedRecord(null)} />}
    </AppLayout>;
}