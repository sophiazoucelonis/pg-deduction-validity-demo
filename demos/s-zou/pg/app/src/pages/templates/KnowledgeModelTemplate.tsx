import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { TemplateBanner } from "@/components/ui/template-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  ChevronUp,
  SlidersHorizontal,
  ArrowUpDown,
  Share2,
  Wrench,
  Copy,
  Clock,
  Shield,
  BarChart3,
  X,
  Pencil,
  Eye,
  Settings2,
  RefreshCw,
  Code,
  Info,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Sidebar categories with legacy flag
const categories = [
  { id: "event-logs", label: "Event Logs", count: 0, legacy: false },
  { id: "records", label: "Records", count: 23, legacy: false },
  { id: "kpis", label: "KPIs", count: 1, legacy: false },
  { id: "augmented-attributes", label: "Augmented Attributes", count: 0, legacy: false },
  { id: "filters", label: "Filters", count: 1, legacy: false },
  { id: "triggers", label: "Triggers", count: 0, legacy: false },
  { id: "flags", label: "Flags", count: 0, legacy: true },
  { id: "variables", label: "Variables", count: 0, legacy: true },
  { id: "actions", label: "Actions", count: 0, legacy: true },
  { id: "event-logs-legacy", label: "Event Logs", count: 12, legacy: true },
  { id: "custom-objects", label: "Custom Objects", count: 0, legacy: false },
];

// Record type badges
type RecordType = "Case Table" | "Activity Table";

interface RecordAttribute {
  id: string;
  name: string;
  identifier: string;
  viewsUsage: number;
  referencedBy: number;
}

interface RecordData {
  id: string;
  name: string;
  identifier: string;
  type: RecordType;
  isDefault?: boolean;
  viewsUsage: string;
  referencedBy: string;
  attributes?: RecordAttribute[];
}

// Sample records data
const recordsData: RecordData[] = [
  { 
    id: "1", 
    name: "Contract", 
    identifier: "O_CUSTOM_CONTRACT", 
    type: "Case Table", 
    viewsUsage: "-", 
    referencedBy: "-",
    attributes: [
      { id: "a1", name: "Id", identifier: "ID", viewsUsage: 0, referencedBy: 0 },
      { id: "a2", name: "CreationTime", identifier: "CREATIONTIME", viewsUsage: 0, referencedBy: 0 },
      { id: "a3", name: "Variant", identifier: "VARIANT", viewsUsage: 0, referencedBy: 0 },
      { id: "a4", name: "Vendor", identifier: "VENDOR", viewsUsage: 1, referencedBy: 3 },
      { id: "a5", name: "VendorSustainabilityRating", identifier: "VENDORSUSTAINABILITYRATING", viewsUsage: 1, referencedBy: 0 },
      { id: "a6", name: "Material", identifier: "MATERIAL", viewsUsage: 1, referencedBy: 1 },
      { id: "a7", name: "MaterialMaterialGroup", identifier: "MATERIALMATERIALGROUP", viewsUsage: 0, referencedBy: 0 },
      { id: "a8", name: "MaterialContractUsage", identifier: "MATERIALCONTRACTUSAGE", viewsUsage: 0, referencedBy: 0 },
    ]
  },
  { id: "2", name: "Contract Event Log", identifier: "EL_CUSTOM_CONTRACT", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "3", name: "ContractItem", identifier: "O_CUSTOM_CONTRACTITEM", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "4", name: "ContractItem Event Log", identifier: "EL_CUSTOM_CONTRACTITEM", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "5", name: "Delivery", identifier: "O_CUSTOM_DELIVERY", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "6", name: "Delivery Event Log", identifier: "EL_CUSTOM_DELIVERY", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "7", name: "DeliveryItem", identifier: "O_CUSTOM_DELIVERYITEM", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "8", name: "DeliveryItem Event Log", identifier: "EL_CUSTOM_DELIVERYITEM", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "9", name: "GoodsReceipt", identifier: "O_CUSTOM_GOODSRECEIPT", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "10", name: "GoodsReceipt Event Log", identifier: "EL_CUSTOM_GOODSRECEIPT", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "11", name: "Procurement Event Log", identifier: "EL__PROCUREMENT", type: "Activity Table", isDefault: true, viewsUsage: "-", referencedBy: "-" },
  { id: "12", name: "PurchaseOrder", identifier: "O_CUSTOM_PURCHASEORDER", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "13", name: "PurchaseOrder Event Log", identifier: "EL_CUSTOM_PURCHASEORDER", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "14", name: "PurchaseOrderItem", identifier: "O_CUSTOM_PURCHASEORDERITEM", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "15", name: "PurchaseOrderItem Event Log", identifier: "EL_CUSTOM_PURCHASEORDERITEM", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "16", name: "PurchaseRequisitionItem", identifier: "O_CUSTOM_PURCHASEREQUISITIONITEM", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "17", name: "PurchaseRequisitionItem Event Log", identifier: "EL_CUSTOM_PURCHASEREQUISITIONITEM", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "18", name: "VendorConfirmation", identifier: "O_CUSTOM_VENDORCONFIRMATION", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
  { id: "19", name: "VendorConfirmation Event Log", identifier: "EL_CUSTOM_VENDORCONFIRMATION", type: "Activity Table", viewsUsage: "-", referencedBy: "-" },
  { id: "20", name: "VendorInvoice", identifier: "O_CUSTOM_VENDORINVOICE", type: "Case Table", viewsUsage: "-", referencedBy: "-" },
];

// Type badge component
function TypeBadge({ type }: { type: RecordType }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-muted/50 text-muted-foreground">
      {type}
    </span>
  );
}

// Default badge component
function DefaultBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-primary/30 bg-primary/10 text-primary">
      Default
    </span>
  );
}

export default function KnowledgeModelTemplate() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("records");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id))
  );

  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  const toggleCategoryVisibility = (id: string) => {
    setVisibleCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredCategories = categories.filter(c => visibleCategories.has(c.id));

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRecordClick = (record: RecordData) => {
    setSelectedRecord(record);
    setSidePanelOpen(true);
    if (!expandedRows.has(record.id)) {
      toggleRowExpansion(record.id);
    }
  };

  return (
    <AppLayout
      treeItems={templateTreeItems}
      activeTreeId="template-knowledge"
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "AI Demo Space", type: "space" as const },
        { label: "Test", type: "package" as const, hasDropdown: true },
      ]}
      showTree={true}
      className="p-0"
    >
      <div className="h-full flex flex-col">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between h-10 px-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="w-4 h-4" />
            </Button>
            <h1 className="text-[13px] font-semibold text-foreground">Knowledge Model</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Wrench className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Copy className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 text-success rounded text-[11px] font-medium ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="max-w-[140px] truncate">Prediction_Builder_DM - cl...</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Clock className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Shield className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Template Banner */}
        <TemplateBanner
          title="Knowledge Model Template"
          description="Define data structures, records, KPIs, and business logic for your process mining applications."
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar - Categories */}
          <div className="w-52 border-r border-border bg-card flex flex-col">
            {/* Icon tab */}
            <div className="p-2 border-b border-border">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-sidebar-active text-sidebar-active-foreground"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Category list */}
            <div className="flex-1 overflow-y-auto py-1">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-[13px] transition-colors",
                    selectedCategory === category.id
                      ? "bg-sidebar-active text-sidebar-active-foreground border-l-2 border-sidebar-active-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-primary border-l-2 border-transparent"
                  )}
                >
                  <span className="flex items-center gap-1">
                    {category.label}
                    {category.legacy && (
                      <span className="text-[10px] text-muted-foreground">(Legacy)</span>
                    )}
                  </span>
                  <span className={cn(
                    "text-[11px]",
                    selectedCategory === category.id ? "text-sidebar-active-foreground" : "text-muted-foreground"
                  )}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>

            {/* View Options */}
            <div className="border-t border-border p-2">
              <Popover open={viewOptionsOpen} onOpenChange={setViewOptionsOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-muted-foreground hover:text-primary transition-colors w-full">
                    <Settings className="w-4 h-4" />
                    <span>View Options</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  align="start" 
                  className="w-64 p-0"
                  sideOffset={8}
                >
                  <div className="p-3 border-b border-border">
                    <h4 className="text-sm font-semibold">Show/Hide</h4>
                  </div>
                  <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                    {categories.map((category) => (
                      <div 
                        key={category.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`view-${category.id}`}
                            checked={visibleCategories.has(category.id)}
                            onCheckedChange={() => toggleCategoryVisibility(category.id)}
                            className="h-4 w-4"
                          />
                          <label 
                            htmlFor={`view-${category.id}`}
                            className="text-[13px] cursor-pointer flex items-center gap-1"
                          >
                            {category.label}
                            {category.legacy && (
                              <span className="text-[11px] text-muted-foreground">(Legacy)</span>
                            )}
                          </label>
                        </div>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={cn("flex-1 flex flex-col bg-background transition-all", sidePanelOpen && "mr-[400px]")}>
            {/* Search Bar */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <div className="flex-1" />
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-[13px] bg-card"
                />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Content Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[15px] font-semibold text-foreground">
                {selectedCategoryData?.label || "Records"}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[13px] px-3 hover:bg-muted">
                  Check AI Readiness
                </Button>
                <Button size="sm" className="h-7 text-[13px] px-3 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Create Record
                </Button>
              </div>
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-muted-foreground w-8"></th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Name
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        ID
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Views usage
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Referenced by
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Source
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recordsData.map((record) => {
                    const isExpanded = expandedRows.has(record.id);
                    const isSelected = selectedRecord?.id === record.id;
                    return (
                      <>
                        <tr 
                          key={record.id} 
                          className={cn(
                            "border-b border-border transition-colors group cursor-pointer",
                            isSelected ? "bg-sidebar-active" : "hover:bg-secondary/30"
                          )}
                          onClick={() => handleRecordClick(record)}
                        >
                          <td className="py-2 px-3 w-8">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(record.id);
                              }}
                              className="p-0.5 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[13px]",
                                isSelected ? "text-primary font-medium" : "text-primary"
                              )}>{record.name}</span>
                              <TypeBadge type={record.type} />
                              {record.isDefault && <DefaultBadge />}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className={cn(
                              "text-[13px]",
                              isSelected ? "text-primary" : "text-primary"
                            )}>{record.identifier}</span>
                          </td>
                          <td className="py-2 px-3 text-[13px] text-muted-foreground">
                            {record.viewsUsage}
                          </td>
                          <td className="py-2 px-3 text-[13px] text-muted-foreground">
                            {record.referencedBy}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
                                <Settings2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded attributes */}
                        {isExpanded && record.attributes && record.attributes.map((attr) => (
                          <tr 
                            key={attr.id}
                            className="border-b border-border hover:bg-secondary/20 transition-colors"
                          >
                            <td className="py-2 px-3 w-8"></td>
                            <td className="py-2 px-3 pl-10">
                              <span className="text-[13px] text-foreground">{attr.name}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[13px] text-muted-foreground">{attr.identifier}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[12px]",
                                attr.viewsUsage > 0 ? "text-primary" : "text-muted-foreground"
                              )}>
                                <Eye className="w-3 h-3" />
                                {attr.viewsUsage} {attr.viewsUsage === 1 ? "view" : "views"}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[12px]",
                                attr.referencedBy > 0 ? "text-primary" : "text-muted-foreground"
                              )}>
                                <Code className="w-3 h-3" />
                                {attr.referencedBy} {attr.referencedBy === 1 ? "entity" : "entities"}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
                                <SlidersHorizontal className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Side Panel */}
          {sidePanelOpen && selectedRecord && (
            <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-card border-l border-border flex flex-col shadow-lg">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-[15px] font-semibold">{selectedRecord.name}</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 hover:bg-muted">
                    <RefreshCw className="w-3 h-3" />
                    Differs from Base
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 hover:bg-muted">
                    <SlidersHorizontal className="w-3 h-3" />
                    Autogenerated
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => setSidePanelOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Warning Banner */}
              <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-md">
                <Info className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-[12px] text-foreground">Please be aware that any change could impact other usages of this object.</span>
              </div>

              {/* Panel Content */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground">Display Name</label>
                    <Input 
                      value={selectedRecord.name}
                      className="h-8 text-[13px]"
                      readOnly
                    />
                  </div>

                  {/* Short Display Name and Id */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Short Display Name</label>
                      <Input className="h-8 text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Id</label>
                      <div className="flex items-center gap-1">
                        <Input 
                          value={selectedRecord.identifier}
                          className="h-8 text-[13px] flex-1"
                          readOnly
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Description and Internal Note */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Description</label>
                      <Textarea className="h-20 text-[13px] resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Internal Note</label>
                      <Textarea className="h-20 text-[13px] resize-none" />
                    </div>
                  </div>

                  {/* PQL Formula */}
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted-foreground">PQL Formula</label>
                    <div className="relative">
                      <div className="bg-[#1e293b] rounded-md p-3 font-mono text-[12px] text-primary min-h-[60px]">
                        "{selectedRecord.identifier}"
                      </div>
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Identifier */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-[12px] font-medium text-muted-foreground">Identifier</label>
                    <Button variant="ghost" size="sm" className="h-7 text-[12px] text-primary hover:bg-muted gap-1">
                      <Plus className="w-3 h-3" />
                      Create Identifier
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Identifier defines which part of the record will be the unique attribute.{" "}
                      <a href="#" className="text-primary hover:underline">Learn more about Records and Identifier.</a>
                    </p>
                  </div>

                  {/* Search within panel */}
                  <div className="flex items-center gap-2 pt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input placeholder="Search" className="h-8 pl-8 text-[12px]" />
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-muted">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Collapsible sections */}
                  <div className="space-y-1">
                    <button className="w-full flex items-center justify-between py-2 text-[13px] hover:bg-muted/50 rounded px-2 -mx-2">
                      <span>Attributes</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">37</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                    <button className="w-full flex items-center justify-between py-2 text-[13px] hover:bg-muted/50 rounded px-2 -mx-2">
                      <span>Augmented Attributes</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">0</span>
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                    <button className="w-full flex items-center justify-between py-2 text-[13px] hover:bg-muted/50 rounded px-2 -mx-2">
                      <span>Flags</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">0</span>
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  </div>

                  {/* Record Triggers */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium">Record Triggers</span>
                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-[12px] text-primary hover:bg-muted gap-1">
                        <Plus className="w-3 h-3" />
                        Create Trigger
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center py-4">
                      Triggers will detect new relevant record items to run an Automation
                    </p>
                  </div>
                </div>
              </ScrollArea>

              {/* Panel Footer */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                <Button variant="ghost" className="hover:bg-muted" onClick={() => setSidePanelOpen(false)}>
                  Cancel
                </Button>
                <Button>Save</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
