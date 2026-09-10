import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CPSection } from "./CPSection";
import { CPToolCard } from "./CPToolCard";
import { CPAddToolsDialog } from "./CPAddToolsDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles, Database, Settings2, Info, Search, AlertTriangle, Copy, Download, ArrowUpDown, ExternalLink } from "lucide-react";
import microsoftLogo from "@/assets/microsoft-logo.svg";

interface Tool {
  id: string;
  name: string;
  enabled: boolean;
}

interface Metric {
  id: string;
  name: string;
  description: string;
  formula: string;
  selected: boolean;
}

export function CPEditView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"visual" | "yaml">("visual");
  const [knowledgeTab, setKnowledgeTab] = useState<string>("metrics");
  const [isKnowledgeEditable, setIsKnowledgeEditable] = useState(false);
  const [tools, setTools] = useState<Tool[]>([
    { id: "display_chart", name: "Display Chart", enabled: true },
    { id: "display_kpi", name: "Display KPI", enabled: false },
    { id: "display_table", name: "Display Table", enabled: true },
    { id: "get_insights", name: "Get Insights", enabled: true },
  ]);
  const [isAddToolsOpen, setIsAddToolsOpen] = useState(false);
  const [apiEnabled, setApiEnabled] = useState(false);
  const [metrics, setMetrics] = useState<Metric[]>([
    { id: "avg_dpo", name: "Days Payable Outstanding (DPO)", description: "Average Days Payable Outstanding (DPO)", formula: 'AVG("Invoice"."DPO")', selected: true },
    { id: "invoice_value", name: "Total Invoice Value", description: "The total invoice value", formula: 'SUM("Invoice"."NET_INVOICE_VALUE")', selected: true },
  ]);

  const [attributes, setAttributes] = useState([
    { id: "invoice", name: "Invoice", description: "", formula: '"Invoice"', selected: false },
    { id: "company_code", name: "Company Code", description: "The entity responsible for the transaction", formula: '"Invoice"."COMPANY_CODE"', selected: false },
    { id: "country", name: "Country", description: "The country where the vendor is located", formula: '"Invoice"."COUNTRY"', selected: false },
    { id: "created_date", name: "Created Date", description: "The document date of the invoice", formula: '"Invoice"."CREATED_DATE"', selected: false },
    { id: "id", name: "Id", description: "The ID of the invoice", formula: '"Invoice"."ID"', selected: false },
    { id: "payment_date", name: "Payment Date", description: "The date the invoice was paid", formula: '"Invoice"."PAYMENT_DATE"', selected: false },
    { id: "payment_terms", name: "Payment Terms", description: "The payment terms on the invoice", formula: '"Invoice"."PAYMENT_TERMS"', selected: false },
    { id: "vendor_name", name: "Vendor Name", description: "The name of the vendor", formula: '"Invoice"."VENDOR_NAME"', selected: false },
  ]);

  const toggleTool = (toolId: string, enabled: boolean) => {
    setTools(tools.map(t => 
      t.id === toolId ? { ...t, enabled } : t
    ));
  };

  const toggleMetric = (metricId: string) => {
    if (!isKnowledgeEditable) return;
    setMetrics(metrics.map(m => 
      m.id === metricId ? { ...m, selected: !m.selected } : m
    ));
  };

  const toggleAttribute = (attributeId: string) => {
    if (!isKnowledgeEditable) return;
    setAttributes(attributes.map(a => 
      a.id === attributeId ? { ...a, selected: !a.selected } : a
    ));
  };

  const clearMetricSelection = () => {
    if (!isKnowledgeEditable) return;
    setMetrics(metrics.map(m => ({ ...m, selected: false })));
  };

  const addTool = (toolId: string) => {
    if (!tools.find(t => t.id === toolId)) {
      setTools([...tools, { id: toolId, name: toolId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), enabled: true }]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Editor Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "visual" | "yaml")} className="mb-6">
          <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto">
            <TabsTrigger 
              value="visual"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2"
            >
              Visual Editor
            </TabsTrigger>
            <TabsTrigger 
              value="yaml"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2"
            >
              YAML Editor
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sections */}
        <div className="space-y-4">
          {/* AI Instructions */}
          <CPSection
            title="AI Instructions"
            description="Provide instructions on how your Process Copilot should perform its task or use the available tools."
            status="complete"
            defaultExpanded={true}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium">Task</label>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline">See prompt example</a>
                </div>
                <Textarea
                  className="min-h-[100px]"
                  defaultValue={`You are an AP Process Copilot. Your task is to help users analyze and improve their Days Payable Outstanding (DPO) metrics.

When users ask about DPO, provide insights on:
- Current DPO values and trends
- Factors affecting payment timing
- Recommendations for optimization`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium">Terminology</label>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">Optional</span>
                </div>
                <Textarea
                  className="min-h-[60px]"
                  placeholder="Define your domain-specific terminology here. For example: DPO = Days Payable Outstanding, the average number of days to pay invoices."
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium">Select LLM</label>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <select className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option>Automatic Selection</option>
                  <option>GPT 4o (Azure OpenAI)</option>
                  <option>GPT 4 Turbo</option>
                  <option>Claude 3 Opus</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm font-medium">Fine-tune Process Copilot's responses</label>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">Optional</span>
                </div>
                <div className="flex gap-3">
                  <Input
                    className="flex-1"
                    placeholder="Example question..."
                  />
                  <Input
                    className="flex-1"
                    placeholder="Expected response format..."
                  />
                </div>
                <button className="mt-2 text-sm text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            </div>
          </CPSection>

          {/* Knowledge Input */}
          <CPSection
            title="Knowledge Input"
            description="Select the knowledge objects this Process Copilot needs to generate responses for its intended use case."
            status="complete"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Knowledge Model:</span>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">AP Analysis</a>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Data Model:</span>
                  <span className="text-sm font-medium">ap_data_model</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 border-b border-border">
                <button 
                  onClick={() => setKnowledgeTab("metrics")}
                  className={`text-sm pb-2 border-b-2 ${knowledgeTab === "metrics" ? "font-medium border-foreground" : "text-muted-foreground border-transparent"}`}
                >
                  Metrics (2)
                </button>
                <button 
                  onClick={() => setKnowledgeTab("attributes")}
                  className={`text-sm pb-2 border-b-2 ${knowledgeTab === "attributes" ? "font-medium border-foreground" : "text-muted-foreground border-transparent"}`}
                >
                  Record Attributes (7)
                </button>
                <button 
                  onClick={() => setKnowledgeTab("eventlogs")}
                  className={`text-sm pb-2 border-b-2 ${knowledgeTab === "eventlogs" ? "font-medium border-foreground" : "text-muted-foreground border-transparent"}`}
                >
                  Event Logs (0)
                </button>
                <button 
                  onClick={() => setKnowledgeTab("filters")}
                  className={`text-sm pb-2 border-b-2 ${knowledgeTab === "filters" ? "font-medium border-foreground" : "text-muted-foreground border-transparent"}`}
                >
                  Preset Filters (0)
                </button>
              </div>

              {/* Instruction text */}

              {/* Search and clear */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search" disabled={!isKnowledgeEditable} />
                </div>
                <button 
                  onClick={clearMetricSelection}
                  disabled={!isKnowledgeEditable}
                  className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  Clear Metrics selection
                </button>
              </div>

              {knowledgeTab === "metrics" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Use the checkmark to select the metrics that your Process Copilot should have access to.
                  </p>
                  {/* Table */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="w-10 px-4 py-2"></th>
                          <th className="text-left px-4 py-2 font-medium">
                            <div className="flex items-center gap-1">
                              Display Name
                              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            <div className="flex items-center gap-1">
                              Id
                              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            <div className="flex items-center gap-1">
                              Description
                              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            <div className="flex items-center gap-1">
                              PQL Formula
                              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </th>
                          <th className="text-left px-4 py-2 font-medium">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((metric) => (
                          <tr key={metric.id} className="border-t border-border">
                            <td className="px-4 py-3">
                              <Checkbox 
                                disabled={!isKnowledgeEditable}
                                checked={metric.selected} 
                                onCheckedChange={() => toggleMetric(metric.id)}
                              />
                            </td>
                            <td className="px-4 py-3">{metric.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{metric.id}</td>
                            <td className="px-4 py-3 text-muted-foreground">{metric.description}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{metric.formula}</td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {knowledgeTab === "attributes" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Use the checkmark to select the record attributes that your Process Copilot should have access to.
                  </p>
                  {/* Table */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="w-10 px-4 py-2"></th>
                      <th className="text-left px-4 py-2 font-medium">
                        <div className="flex items-center gap-1">
                          Display Name
                          <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        <div className="flex items-center gap-1">
                          Id
                          <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        <div className="flex items-center gap-1">
                          Description
                          <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        <div className="flex items-center gap-1">
                          PQL Formula
                          <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </th>
                      <th className="text-left px-4 py-2 font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                      {attributes.map((attr) => (
                        <tr key={attr.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <Checkbox 
                            disabled={!isKnowledgeEditable}
                            checked={attr.selected} 
                            onCheckedChange={() => toggleAttribute(attr.id)}
                          />
                        </td>
                        <td className="px-4 py-3">{attr.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{attr.id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{attr.description}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{attr.formula}</td>
                        <td className="px-4 py-3"></td>
                      </tr>
                      ))}
                  </tbody>
                </table>
                  </div>
                </>
              )}

              {knowledgeTab !== "metrics" && knowledgeTab !== "attributes" && (
                <div className="border border-border rounded-lg p-8 text-center bg-muted/10">
                  <p className="text-muted-foreground">No items available for this category</p>
              </div>
              )}

              <div className="flex justify-end">
                <Button 
                  size="sm"
                  onClick={() => setIsKnowledgeEditable(!isKnowledgeEditable)}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  {isKnowledgeEditable ? (knowledgeTab === "metrics" ? "Save Metrics" : "Save Record Attributes") : (knowledgeTab === "metrics" ? "Manage Metrics" : "Manage Record Attributes")}
                </Button>
              </div>
            </div>
          </CPSection>

          {/* Tool Activation */}
          <CPSection
            title="Tool Activation"
            description="Choose which tools your Process Copilot needs for its intended task."
            status="complete"
          >
            <div className="space-y-4">
              {/* Warning banner */}
              <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-md text-sm" style={{color: '#8B6F47'}}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-warning" />
                <span>Selecting too many tools can negatively impact your accuracy</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {tools.map((tool) => (
                  <CPToolCard
                    key={tool.id}
                    name={tool.name}
                    id={tool.id}
                    enabled={tool.enabled}
                    onToggle={(enabled) => toggleTool(tool.id, enabled)}
                  />
                ))}
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={() => setIsAddToolsOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tools
                </Button>
              </div>
            </div>
          </CPSection>

          {/* Start Screen */}
          <CPSection
            title="Start Screen"
            description="Define welcome message and example questions to present to the users and start the conversation."
            status="complete"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <label className="text-sm font-medium">Welcome message</label>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">Optional</span>
                  </div>
                  <div className="relative">
                    <Input
                      className="pr-10"
                      defaultValue="I can help you with your process queries. Ask me anything about your data and workflows."
                    />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7">
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <label className="text-sm font-medium">Predefined questions</label>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">Optional</span>
                  </div>
                  <Input
                    placeholder="What is the current DPO for vendor ABC Corp?"
                  />
                  <button className="mt-2 text-sm text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div>
                <p className="text-sm text-muted-foreground mb-2 text-right">Your start screen will look like this</p>
                <div className="border border-border rounded-lg p-4 bg-muted/20">
                  <div className="h-2 w-24 bg-foreground/20 rounded mb-2"></div>
                  <div className="h-1 w-32 bg-muted-foreground/30 rounded mb-4"></div>
                  <div className="border border-border rounded-md p-3 bg-background">
                    <div className="h-1 w-20 bg-muted-foreground/30 rounded mb-2"></div>
                    <div className="flex justify-end">
                      <div className="w-4 h-4 rounded bg-muted"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CPSection>

          {/* External Use - New Section */}
          <CPSection
            title="External Use"
            description="Select how this Process Copilot interacts with other systems."
            status="incomplete"
            sectionNumber={5}
          >
            <div className="space-y-4">
              {/* API Access Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Enable API access</label>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <Switch checked={apiEnabled} onCheckedChange={setApiEnabled} />
              </div>

              {apiEnabled && (
                <>
                  {/* API URL */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">API URL</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        readOnly 
                        value="https://api.celonis.cloud/process-copilot/v1/chat/ap-process-copilot"
                        className="flex-1 bg-muted/30"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard("https://api.celonis.cloud/process-copilot/v1/chat/ap-process-copilot")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Not available via API:</span>{" "}
                    <span>Display Chart, Display KPI, Display Process, Display Table</span>
                  </div>
                </>
              )}

              {/* Export and MSFT Copilot Studio Button */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export (.json)
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/ms-copilot-login")}
                  className="gap-2"
                >
                  <img src={microsoftLogo} alt="Microsoft" className="w-4 h-4" />
                  Open MSFT Copilot Studio
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CPSection>
        </div>
      </div>

      <CPAddToolsDialog
        open={isAddToolsOpen}
        onOpenChange={setIsAddToolsOpen}
        onAddTool={addTool}
      />
    </div>
  );
}
