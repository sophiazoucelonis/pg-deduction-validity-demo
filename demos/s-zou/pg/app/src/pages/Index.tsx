import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { ProcessFlow } from "@/components/ui/process-step";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Download, Filter } from "lucide-react";

// Sample tree data - Templates folder only for the starter
const treeData: TreeNode[] = [
  ...templateTreeItems,
];

// Sample table data
interface ExpenseRow {
  headerId: string;
  itemId: string;
  expenseType: string;
  amount: string;
  date: string;
  flag: "suspected" | "not-suspected";
  category: string;
  description: string;
}

const expenseData: ExpenseRow[] = [
  { headerId: "REP47624", itemId: "EXP111364", expenseType: "Internet", amount: "49.15 €", date: "2025-06-10", flag: "not-suspected", category: "N/A", description: "Mobile internet hotspot rental" },
  { headerId: "REP50214", itemId: "EXP117441", expenseType: "Rental Car", amount: "132.71 €", date: "2025-06-02", flag: "not-suspected", category: "N/A", description: "SUV rental for client visits" },
  { headerId: "REP50751", itemId: "EXP118718", expenseType: "Food", amount: "18.18 €", date: "2025-06-07", flag: "not-suspected", category: "N/A", description: "Breakfast meeting" },
  { headerId: "REP52316", itemId: "EXP122342", expenseType: "Toll", amount: "15.08 €", date: "2025-06-10", flag: "not-suspected", category: "N/A", description: "Bridge toll payment" },
  { headerId: "REP53603", itemId: "EXP125421", expenseType: "Office Supplies", amount: "64.80 €", date: "2025-06-22", flag: "not-suspected", category: "N/A", description: "Office snacks and coffee" },
];

const columns: Column<ExpenseRow>[] = [
  { key: "headerId", header: "HeaderID", className: "font-mono text-xs" },
  { 
    key: "itemId", 
    header: "ItemID", 
    className: "font-mono text-xs",
    render: (value) => (
      <a href="#" className="text-accent hover:underline">{String(value)}</a>
    ),
  },
  { key: "expenseType", header: "ExpenseType" },
  { key: "amount", header: "Amount", className: "font-medium" },
  { key: "date", header: "Date" },
  { 
    key: "flag", 
    header: "Flag",
    render: (value) => (
      <StatusBadge variant={value === "not-suspected" ? "success" : "warning"} showIcon>
        {value === "not-suspected" ? "Not suspected" : "Suspected"}
      </StatusBadge>
    ),
  },
  { key: "category", header: "Fraud Category" },
  { key: "description", header: "Description", className: "max-w-[200px] truncate" },
];

// Process flow steps
const processSteps = [
  { id: "start", title: "Credit Block Detected", subtitle: "Start process", status: "completed" as const },
  { id: "trigger", title: "Trigger Credit Block AI Agent", subtitle: "Process step", status: "active" as const },
  { id: "update-sap", title: "Update SAP", subtitle: "Process step", status: "pending" as const },
  { id: "optimize", title: "Trigger Credit Limit Optimization AI Agent", subtitle: "Process step", status: "pending" as const },
  { id: "send-request", title: "Send Request for Credit Limit Adjustment", subtitle: "Process step", status: "pending" as const },
  { id: "approval", title: "Approval Response Received", subtitle: "Resume process", status: "pending" as const },
];


export default function Index() {
  const [activeTreeId, setActiveTreeId] = useState("otc");
  const navigate = useNavigate();

  const handleTreeSelect = (node: TreeNode) => {
    setActiveTreeId(node.id);
    
    // Navigate to template if it's a template item
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  return (
    <AppLayout
      treeItems={treeData}
      activeTreeId={activeTreeId}
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "1 - Credit Blocks" },
        { label: "FY26 - Credit Blocks" },
      ]}
      title="Intelligent Fraud Detection App"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter bar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Deploy
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Last updated */}
        <p className="text-sm text-muted-foreground">Last updated: 2025-07-25</p>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Claimed Amount" value="193K €" />
          <KpiCard label="Total Flagged Amount" value="22.0K €" />
          <KpiCard 
            label="%. Flagged" 
            value="11.39%" 
            trend={{ value: 2.3, direction: "up" }}
          />
          <KpiCard label="# Report Lines" value="732" />
          <KpiCard label="# Flagged Lines" value="55.0" />
          <KpiCard 
            label="% Flagged" 
            value="7.51%" 
            trend={{ value: 1.2, direction: "down" }}
          />
        </div>

        {/* Charts placeholder + Process Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart placeholder */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold mb-4">Breakdown Total Potential Fraud Vol.</h3>
            <div className="flex items-center justify-center h-48">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--chart-1))" strokeWidth="12" strokeDasharray="62.8 188.4" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--chart-2))" strokeWidth="12" strokeDasharray="31.4 220" strokeDashoffset="-62.8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--chart-3))" strokeWidth="12" strokeDasharray="25.1 226.2" strokeDashoffset="-94.2" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--chart-4))" strokeWidth="12" strokeDasharray="31.4 220" strokeDashoffset="-119.3" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-semibold">25.4%</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-1" /> Duplicate Expense</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-2" /> Excessive Distance</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-3" /> Vague Description</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-4" /> Travel Date Violation</span>
            </div>
          </div>

          {/* Process Orchestration */}
          <div className="bg-card rounded-lg border border-border p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Credit Management Orchestration</h3>
              <div className="flex items-center gap-2">
                <StatusBadge variant="success" showIcon>Active</StatusBadge>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <ProcessFlow steps={processSteps} />
          </div>
        </div>

        {/* Data Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Expense Reports</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          <DataTable columns={columns} data={expenseData} />
        </div>
      </div>
    </AppLayout>
  );
}
