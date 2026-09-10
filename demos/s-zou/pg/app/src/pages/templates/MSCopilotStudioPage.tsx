import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  LayoutGrid, 
  Bot, 
  Workflow, 
  Package, 
  MoreHorizontal,
  Search,
  Settings,
  HelpCircle,
  ChevronDown,
  Plus,
  Home,
  X,
  Pencil,
  Link2,
  ExternalLink,
  Wrench,
  Filter,
  ShieldCheck,
  Send
} from "lucide-react";
import celonisLogo from "@/assets/celonis-logo.png";
import microsoftLogo from "@/assets/microsoft-logo.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MSCopilotTestPanel } from "@/components/copilot/MSCopilotTestPanel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

type ViewMode = "agents" | "agent-overview" | "agent-tools" | "tool-detail" | "test-flow";

interface Tool {
  id: string;
  name: string;
  type: string;
  availableTo: string;
  trigger: string;
  lastModified: string;
  enabled: boolean;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  lastModified: string;
  published: string;
  owner: string;
  protected: boolean;
  useCelonisLogo: boolean;
}

export default function MSCopilotStudioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("agents");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [isTestFullscreen, setIsTestFullscreen] = useState(false);

  const tools: Tool[] = [
    { id: "1", name: "Get Orders At Risk Overview", type: "Flow", availableTo: "Order Fulfillment Agent", trigger: "By agent", lastModified: "John Doe  2 months ...", enabled: true },
    { id: "2", name: "Get Order Risk Details", type: "Flow", availableTo: "Order Fulfillment Agent", trigger: "By agent", lastModified: "John Doe  2 months ...", enabled: true },
    { id: "3", name: "Get Mitigation Options", type: "Flow", availableTo: "Order Fulfillment Agent", trigger: "By agent", lastModified: "John Doe  2 months ...", enabled: true },
    { id: "4", name: "Request Inventory Reallocation Approval", type: "Flow", availableTo: "Order Fulfillment Agent", trigger: "By agent", lastModified: "John Doe  2 months ...", enabled: true },
    { id: "5", name: "Check Inventory Availability", type: "Flow", availableTo: "Order Fulfillment Agent", trigger: "By agent", lastModified: "John Doe  2 months ...", enabled: true },
    { id: "6", name: "Confirm Reallocation Approval", type: "Flow", availableTo: "Order Fulfillment Agent", trigger: "By agent", lastModified: "John Doe  2 months ...", enabled: true },
  ];

  const agents: Agent[] = [
    { id: "1", name: "Celonis Dispute Resolution Agent", type: "Agent", lastModified: "John Doe  7 days ago", published: "Never", owner: "John Doe", protected: false, useCelonisLogo: true },
    { id: "2", name: "Order Fulfillment Agent", type: "Agent", lastModified: "John Doe  8 days ago", published: "2 months ago", owner: "John Doe", protected: true, useCelonisLogo: true },
    { id: "3", name: "Credit Block Removal Agent", type: "Agent", lastModified: "John Doe  23 days ago", published: "1 year ago", owner: "John Doe", protected: true, useCelonisLogo: true },
    { id: "4", name: "Material Replenishment Copilot", type: "Agent", lastModified: "John Doe  24 days ago", published: "10 months ago", owner: "John Doe", protected: true, useCelonisLogo: true },
    { id: "5", name: "Copilot for Microsoft 365", type: "Microsoft", lastModified: "", published: "Never", owner: "", protected: false, useCelonisLogo: false },
  ];

  const managedAgents = [
    { name: "Catalog Enrichment (Preview)", gradient: "from-pink-500 via-purple-500 to-cyan-500" },
    { name: "Document Processor (Preview)", gradient: "from-orange-400 via-amber-500 to-yellow-400" },
    { name: "Finance in M365 Copilot", gradient: "from-emerald-400 via-teal-500 to-cyan-500" },
    { name: "Personalized Shopping (Preview)", gradient: "from-pink-400 via-rose-500 to-red-400" },
    { name: "Variance Analysis (Preview)", gradient: "from-teal-400 via-cyan-500 to-blue-500" },
  ];

  const agentTemplates = [
    { name: "Website Q&A", description: "Instantly answer user questions using the content of your website or other knowledge.", tags: ["AI + Machine Learning", "Customer Service"], gradient: "from-orange-400 via-amber-500 to-yellow-400", icon: "💬" },
    { name: "Safe Travels", description: "Provides answers to common travel questions and related health and safety guidelines.", tags: ["Government"], gradient: "from-blue-400 via-blue-500 to-indigo-500", icon: "🧳" },
    { name: "Financial Insights", description: "Help financial services professionals get quick and concise info from their org's financial documents and other available resources.", tags: ["Finance", "Financial Services"], gradient: "from-emerald-400 via-green-500 to-teal-500", icon: "📊" },
    { name: "Benefits", description: "Benefits Agent provides personalized information on various benefits offered by the employer that are tailored to employee's unique circumstances.", tags: ["Human Resources"], gradient: "from-amber-400 via-orange-500 to-red-400", icon: "🎁" },
    { name: "Citizen Services", description: "Enable Public Sector organizations to build an agent with their publicly available websites to assist citizens navigate services and information.", tags: ["Customer Service", "Government"], gradient: "from-pink-400 via-rose-500 to-red-500", icon: "🏛️" },
    { name: "Weather", description: "Your go-to assistant for getting weather forecast.", tags: ["Hospitality & Travel"], gradient: "from-sky-400 via-cyan-500 to-teal-400", icon: "☀️" },
  ];

  // Check URL params for opening specific agent
  useEffect(() => {
    const agentId = searchParams.get("agent");
    if (agentId) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setSelectedAgent(agent);
        setViewMode("agent-overview");
        setShowTestPanel(true); // Auto-open test panel
      }
    }
  }, [searchParams]);

  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool);
    setViewMode("tool-detail");
    setShowTestPanel(true);
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setViewMode("agent-overview");
    setShowTestPanel(true);
  };

  const handleTestClick = () => {
    // Just open the test panel, don't go fullscreen
    setShowTestPanel(true);
  };

  const handleExpandFullscreen = () => {
    setIsTestFullscreen(true);
  };

  const handleCloseTest = () => {
    setIsTestFullscreen(false);
    setShowTestPanel(false);
  };

  const sidebarItems = [
    { id: "home", icon: Home, label: "Home", active: false },
    { id: "agents", icon: Bot, label: "Agents", active: viewMode === "agents" || viewMode === "agent-overview" || viewMode === "agent-tools" || viewMode === "tool-detail" },
    { id: "flows", icon: Workflow, label: "Flows", active: false },
    { id: "tools", icon: Wrench, label: "Tools", active: false },
  ];

  const renderSidebar = () => (
    <div className="w-16 bg-[#fafafa] border-r border-[#e0e0e0] flex flex-col items-center py-3">
      {/* Grid Menu */}
      <button className="w-10 h-10 flex items-center justify-center hover:bg-[#e0e0e0] rounded mb-2">
        <LayoutGrid className="w-5 h-5 text-[#616161]" />
      </button>
      
      {/* Navigation Items */}
      <div className="flex flex-col items-center gap-1">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "agents") {
                setViewMode("agents");
                setSelectedAgent(null);
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center w-14 py-2 rounded transition-colors",
              item.active ? "bg-[#e8e8e8]" : "hover:bg-[#e8e8e8]"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 mb-1",
              item.active ? "text-[#0078d4]" : "text-[#616161]"
            )} />
            <span className={cn(
              "text-[10px]",
              item.active ? "text-[#0078d4] font-medium" : "text-[#616161]"
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* More at bottom */}
      <div className="mt-auto">
        <button className="flex flex-col items-center justify-center w-14 py-2 rounded hover:bg-[#e8e8e8]">
          <MoreHorizontal className="w-5 h-5 text-[#616161] mb-1" />
        </button>
      </div>
    </div>
  );

  const renderHeader = () => (
    <div className="h-12 bg-[#333333] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button className="w-8 h-8 flex items-center justify-center hover:bg-[#444] rounded">
          <LayoutGrid className="w-5 h-5 text-white" />
        </button>
        <span className="text-white font-medium">Copilot Studio</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-white text-sm">
          <span className="text-[#a0a0a0]">Environment</span>
          <span className="font-medium">Celonis Labs GmbH (de...</span>
        </div>
        <Settings className="w-5 h-5 text-white" />
        <HelpCircle className="w-5 h-5 text-white" />
        <div className="w-8 h-8 bg-[#0078d4] rounded-full flex items-center justify-center text-white text-sm font-medium">
          FC
        </div>
      </div>
    </div>
  );

  const renderAgentsList = () => (
    <div className="flex-1 overflow-auto bg-white flex flex-col">
      {/* Header with Return to Celonis Button */}
      <div className="h-12 border-b border-[#e0e0e0] flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="text-lg font-semibold text-[#1b1b1b]">Agents</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <img src={celonisLogo} alt="Celonis" className="w-4 h-4 object-contain" />
          Return to Celonis
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create blank agent
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="gap-2">
              Import agent
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

      {/* AI Builder */}
      <div className="mb-8 p-4 bg-[#f5f5f5] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e0e0e0] rounded-full flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#616161]" />
          </div>
          <Input 
            placeholder="Start building by describing what your agent needs to do"
            className="flex-1 bg-white"
          />
          <Send className="w-5 h-5 text-[#616161]" />
        </div>
      </div>

      {/* My Agents */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1b1b1b]">My agents</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161]" />
            <Input placeholder="Search agents" className="pl-9 w-48" />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0]">
              <th className="text-left py-2 font-medium text-[#616161]">Name</th>
              <th className="text-left py-2 font-medium text-[#616161]">Type</th>
              <th className="text-left py-2 font-medium text-[#616161]">Last modified ↓</th>
              <th className="text-left py-2 font-medium text-[#616161]">Last published</th>
              <th className="text-left py-2 font-medium text-[#616161]">Owner</th>
              <th className="text-left py-2 font-medium text-[#616161]">Protection status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr 
                key={agent.id} 
                className="border-b border-[#e0e0e0] hover:bg-[#f5f5f5] cursor-pointer"
                onClick={() => handleAgentClick(agent)}
              >
                <td className="py-3 flex items-center gap-2">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {agent.useCelonisLogo ? (
                      <img src={celonisLogo} alt="Celonis" className="w-8 h-8 object-contain" />
                    ) : (
                      <img src={microsoftLogo} alt="Microsoft" className="w-8 h-8 object-contain" />
                    )}
                  </div>
                  {agent.name}
                </td>
                <td className="py-3 text-[#616161]">{agent.type}</td>
                <td className="py-3 text-[#616161]">{agent.lastModified}</td>
                <td className="py-3 text-[#616161]">{agent.published}</td>
                <td className="py-3 text-[#616161]">{agent.owner}</td>
                <td className="py-3">
                  {agent.protected && (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Protected
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Managed Agents */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[#1b1b1b] mb-4 flex items-center gap-2">
          Install a managed agent
          <HelpCircle className="w-4 h-4 text-[#616161]" />
        </h2>
        <div className="flex gap-4 overflow-x-auto">
          {managedAgents.map((agent) => (
            <div key={agent.name} className="p-4 border border-[#e0e0e0] rounded-lg min-w-[180px] hover:shadow-md cursor-pointer bg-white">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br", agent.gradient)}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-[#1b1b1b]">{agent.name}</p>
              <p className="text-xs text-[#616161]">Managed agent</p>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1b1b1b]">Start with an agent template</h2>
          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="sm" className="gap-1 text-[#616161]">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161]" />
              <Input placeholder="Search templates" className="pl-9 w-48 h-9 bg-white" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {agentTemplates.map((template) => (
            <div key={template.name} className="p-4 border border-[#e0e0e0] rounded-lg hover:shadow-md cursor-pointer bg-white">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br", template.gradient)}>
                <span className="text-xl">{template.icon}</span>
              </div>
              <p className="text-sm font-semibold text-[#1b1b1b] mb-0.5">{template.name}</p>
              <p className="text-xs text-[#0078d4] mb-2">Agent template</p>
              <p className="text-xs text-[#616161] mb-3 line-clamp-3">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                {template.tags.map(tag => (
                  <span key={tag} className="text-xs border border-[#e0e0e0] px-2 py-0.5 rounded text-[#616161]">{tag}</span>
                ))}
              </div>
            </div>
          ))}
         </div>
       </div>
       </div>
    </div>
  );

  const renderAgentTabs = () => (
    <div className="h-12 bg-white border-b border-[#e0e0e0] flex items-center px-4">
      <button 
        onClick={() => {
          setViewMode("agents");
          setSelectedAgent(null);
          setShowTestPanel(false);
        }}
        className="mr-4 hover:bg-[#f0f0f0] p-1 rounded"
      >
        <X className="w-5 h-5 text-[#616161]" />
      </button>
      {/* Agent Logo - shows Celonis or Microsoft based on selected agent */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 overflow-hidden">
        {selectedAgent?.useCelonisLogo ? (
          <img src={celonisLogo} alt="Celonis" className="w-7 h-7 object-contain" />
        ) : (
          <img src={microsoftLogo} alt="Microsoft" className="w-7 h-7 object-contain" />
        )}
      </div>
      <span className="font-medium mr-2">{selectedAgent?.name || "Order Fulfillment Agent"}</span>
      {/* Green Shield Checkmark */}
      <ShieldCheck className="w-5 h-5 text-green-500" />
      
      <div className="flex items-center ml-6 gap-6">
        {["Overview", "Knowledge", "Tools", "Agents", "Topics", "Activity", "Evaluation", "Analytics", "Channels"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "Tools") setViewMode("agent-tools");
              else if (tab === "Overview") setViewMode("agent-overview");
            }}
            className={cn(
              "text-sm py-4 border-b-2 -mb-[1px]",
              (viewMode === "agent-tools" && tab === "Tools") || (viewMode === "agent-overview" && tab === "Overview")
                ? "text-[#1b1b1b] font-medium border-[#1b1b1b]"
                : "text-[#616161] border-transparent hover:text-[#1b1b1b]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-[#616161]">Published 12/5/2025</span>
        <Button variant="outline" size="sm">Publish</Button>
        <Button variant="outline" size="sm">Settings</Button>
        <MoreHorizontal className="w-5 h-5 text-[#616161]" />
        <div className="border-l border-[#e0e0e0] h-8 mx-2" />
        <Button 
          variant={showTestPanel ? "default" : "outline"} 
          size="sm"
          onClick={handleTestClick}
          className={showTestPanel ? "bg-[#0078d4]" : ""}
        >
          Test
        </Button>
      </div>
    </div>
  );

  const renderAgentOverview = () => (
    <div className="flex-1 p-6 overflow-auto bg-[#fafafa]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Details Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Details</h2>
            <Button variant="ghost" size="sm" className="gap-1">
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            {/* Agent Logo in details */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-[#f5f5f5]">
              {selectedAgent?.useCelonisLogo ? (
                <img src={celonisLogo} alt="Celonis" className="w-10 h-10 object-contain" />
              ) : (
                <img src={microsoftLogo} alt="Microsoft" className="w-10 h-10 object-contain" />
              )}
            </div>
            <div>
              <p className="font-medium">Name</p>
              <p className="text-sm text-[#616161]">{selectedAgent?.name || "Order Fulfillment Agent"}</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium mb-1">Description</p>
            <p className="text-sm text-[#616161]">
              This Copilot helps you identify late delivery risks, understand why orders are delayed, and take corrective action by recommending and executing mitigation options. It uses real-time operational data to explain issues, highlight business impact, and guide you to the best next action.
            </p>
            <p className="text-xs text-[#a0a0a0] text-right mt-1">284/1024</p>
          </div>
        </div>

        {/* Model Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <h2 className="text-lg font-semibold mb-2">Select your agent's model</h2>
          <p className="text-sm text-[#616161] mb-4">
            Your agent will primarily use the model for reasoning and responding. Experimental models are subject to{" "}
            <a href="#" className="text-[#0078d4]">preview terms</a>. <a href="#" className="text-[#0078d4]">Learn more</a>
          </p>
          <select className="w-64 h-10 px-3 border border-[#e0e0e0] rounded">
            <option>GPT-5 Chat (Preview)</option>
          </select>
        </div>

        {/* Analytics Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Analytics</h2>
            <Button variant="outline" size="sm">Open Analytics</Button>
          </div>
          <p className="text-sm text-[#616161] mb-4">Check your agent's key performance info from the last 7 days.</p>
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-[#616161] flex items-center gap-1">
                Conversation sessions <HelpCircle className="w-3 h-3" />
              </p>
              <p className="text-2xl font-semibold">2 <span className="text-sm font-normal text-[#616161]">0%</span></p>
            </div>
            <div>
              <p className="text-sm text-[#616161] flex items-center gap-1">
                Engagement <HelpCircle className="w-3 h-3" />
              </p>
              <p className="text-2xl font-semibold">100% <span className="text-sm font-normal text-green-600">↑ 100%</span></p>
            </div>
            <div>
              <p className="text-sm text-[#616161] flex items-center gap-1">
                Satisfaction score <HelpCircle className="w-3 h-3" />
              </p>
              <p className="text-2xl font-semibold">--</p>
            </div>
          </div>
        </div>

        {/* Instructions Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Instructions</h2>
            <Button variant="ghost" size="sm" className="gap-1">
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          </div>
          <div className="text-sm text-[#616161] space-y-3">
            <p>You are an operations assistant focused on late delivery risk and mitigation.</p>
            <p>You must use deployed tools to answer user questions whenever possible instead of inventing data.</p>
            <p className="font-medium text-[#1b1b1b]">When a tool is used:</p>
            <p>- Treat the returned JSON as the single source of truth.</p>
            <p className="font-medium text-[#1b1b1b] mt-3">Based on the user's request:</p>
            <p>- Use the "Get Orders At Risk Overview" tool when they ask for delayed, late, or at-risk orders.</p>
            <p>- Use the "Get Order Risk Details" tool when they ask about a specific order.</p>
            <p>- Use the "Get Mitigation Options" tool when they ask how to fix, resolve, or mitigate a delay.</p>
            <p>- Use the "Request Inventory Reallocation Approval" tool when they ask to reallocate inventory for an order.</p>
          </div>
        </div>

        {/* Knowledge Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Knowledge</h2>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add knowledge
            </Button>
          </div>
          <p className="text-sm text-[#616161] mb-4">Add data, files, and other resources to inform and improve AI-generated responses.</p>
          <div className="flex flex-col items-center justify-center py-8 text-center bg-[#f8f8f8] rounded-lg">
            <div className="w-12 h-12 bg-[#e8f4fd] rounded-lg flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-[#0078d4]" />
            </div>
            <a href="#" className="text-[#0078d4] text-sm">Add knowledge</a>
          </div>

          {/* Web Search */}
          <div className="mt-6 pt-6 border-t border-[#e0e0e0]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Web Search</h3>
                <p className="text-sm text-[#616161]">
                  Enable your agent to search all public websites. <a href="#" className="text-[#0078d4]">Learn more</a>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={false} />
                <span className="text-sm text-[#616161]">Disabled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Tools</h2>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add tool
            </Button>
          </div>
          <p className="text-sm text-[#616161] mb-4">
            Add tools to empower the AI to complete specific tasks for improved engagement. <a href="#" className="text-[#0078d4]">Learn more</a>.
          </p>
          <div className="space-y-3">
            {["Get Orders At Risk Overview", "Get Order Risk Details", "Get Mitigation Options"].map((tool) => (
              <div key={tool} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Workflow className="w-4 h-4 text-[#0078d4]" />
                  </div>
                  <span className="text-sm">{tool}</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-[#616161]" />
              </div>
            ))}
          </div>
          <a href="#" className="text-[#0078d4] text-sm mt-3 inline-block">See all</a>
        </div>

        {/* Triggers Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Triggers</h2>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add trigger
            </Button>
          </div>
          <p className="text-sm text-[#616161] mb-4">
            Set up your agent to activate when certain events happen. <a href="#" className="text-[#0078d4]">Learn more</a>.
          </p>
          <div className="flex flex-col items-center justify-center py-8 text-center bg-[#f8f8f8] rounded-lg">
            <div className="w-12 h-12 bg-[#e8f4fd] rounded-lg flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#0078d4]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <a href="#" className="text-[#0078d4] text-sm">Add trigger</a>
          </div>
        </div>

        {/* Agents Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Agents</h2>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add agent
            </Button>
          </div>
          <p className="text-sm text-[#616161] mb-4">
            Connect your agent with another agent, dedicated to handling steps of your workflow. <a href="#" className="text-[#0078d4]">Learn more</a>
          </p>
          <div className="flex flex-col items-center justify-center py-8 text-center bg-[#f8f8f8] rounded-lg">
            <div className="w-12 h-12 bg-[#e8f4fd] rounded-lg flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-[#0078d4]" />
            </div>
            <a href="#" className="text-[#0078d4] text-sm">Add agent</a>
          </div>
        </div>

        {/* Topics Section */}
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Topics</h2>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add topic
            </Button>
          </div>
          <p className="text-sm text-[#616161] mb-4">
            Add conversation topics to focus and guide the way your agent answers.
          </p>
          <div className="space-y-3">
            {["Goodbye", "Greeting", "Start Over"].map((topic) => (
              <div key={topic} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#fff3cd] rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#856404]" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <span className="text-sm">{topic}</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-[#616161]" />
              </div>
            ))}
          </div>
          <a href="#" className="text-[#0078d4] text-sm mt-3 inline-block">See all</a>
        </div>
      </div>
    </div>
  );

  const renderAgentTools = () => (
    <div className="flex-1 p-6 overflow-auto bg-white">
      <div className="flex items-center justify-between mb-6">
        <Button className="gap-2 bg-[#0078d4] hover:bg-[#006cbd]">
          <Plus className="w-4 h-4" />
          Add a tool
        </Button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161]" />
          <Input placeholder="Search tools" className="pl-9 w-48" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" className="rounded-full">All</Button>
        <Button variant="ghost" size="sm" className="rounded-full gap-1">
          <Workflow className="w-4 h-4" />
          Flow (6)
        </Button>
      </div>

      {/* Tools Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e0e0e0]">
            <th className="text-left py-2 font-medium text-[#616161]">Name</th>
            <th className="text-left py-2 font-medium text-[#616161]">Type</th>
            <th className="text-left py-2 font-medium text-[#616161]">Available to</th>
            <th className="text-left py-2 font-medium text-[#616161]">Trigger</th>
            <th className="text-left py-2 font-medium text-[#616161]">Last modified</th>
            <th className="text-left py-2 font-medium text-[#616161]">Errors</th>
            <th className="text-left py-2 font-medium text-[#616161]">Blocked</th>
            <th className="text-left py-2 font-medium text-[#616161]">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool) => (
            <tr 
              key={tool.id} 
              className="border-b border-[#e0e0e0] hover:bg-[#f5f5f5] cursor-pointer"
              onClick={() => handleToolClick(tool)}
            >
              <td className="py-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#e8f4fd] rounded flex items-center justify-center">
                  <Workflow className="w-4 h-4 text-[#0078d4]" />
                </div>
                {tool.name}
              </td>
              <td className="py-3">
                <span className="inline-flex items-center gap-1 text-[#616161]">
                  <Workflow className="w-3 h-3" />
                  {tool.type}
                </span>
              </td>
              <td className="py-3">
                <span className="inline-flex items-center gap-1 text-[#616161]">
                  <Bot className="w-3 h-3" />
                  {tool.availableTo}
                </span>
              </td>
              <td className="py-3">
                <span className="inline-flex items-center gap-1 text-[#616161]">
                  <Bot className="w-3 h-3" />
                  {tool.trigger}
                </span>
              </td>
              <td className="py-3 text-[#616161]">{tool.lastModified}</td>
              <td className="py-3"></td>
              <td className="py-3"></td>
              <td className="py-3">
                <Switch checked={tool.enabled} />
                <span className="ml-2 text-[#616161]">On</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-[#616161]">
        This AI-powered feature is currently in preview. <a href="#" className="text-[#0078d4]">See terms</a>.
      </div>
    </div>
  );

  const renderToolDetail = () => (
    <div className="flex-1 overflow-auto bg-[#fafafa]">
      {/* Tool Header */}
      <div className="h-12 bg-white border-b border-[#e0e0e0] flex items-center px-4">
        <button 
          onClick={() => setViewMode("agent-tools")}
          className="mr-4 hover:bg-[#f0f0f0] p-1 rounded"
        >
          ←
        </button>
        <span className="font-medium mr-2">{selectedTool?.name}</span>
        <ChevronDown className="w-4 h-4 text-[#616161] mr-auto" />
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#616161]">Enabled</span>
          <Switch checked={selectedTool?.enabled} />
          <MoreHorizontal className="w-5 h-5 text-[#616161]" />
          <Button disabled variant="outline" size="sm">Save</Button>
        </div>
      </div>

      {/* Tool Content */}
      <div className="p-6">
        <div className="max-w-3xl space-y-6">
          {/* Side Navigation */}
          <div className="flex gap-8">
            <div className="w-32 space-y-2">
              <button className="text-sm font-medium text-[#1b1b1b] block">Details</button>
              <button className="text-sm text-[#616161] block">Inputs</button>
              <button className="text-sm text-[#616161] block">Completion</button>
            </div>

            <div className="flex-1 space-y-6">
              {/* Details Card */}
              <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-[#0078d4]" />
                  <h2 className="text-lg font-semibold">Details</h2>
                </div>
                <p className="text-sm text-[#616161] mb-4">
                  What it is, how it operates, and how the orchestrator identifies it. <a href="#" className="text-[#0078d4]">Learn more</a>
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Name *</label>
                    <Input defaultValue="Confirm Reallocation Approval" />
                    <p className="text-xs text-[#a0a0a0] text-right">25/64</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Description * <HelpCircle className="w-3 h-3 inline text-[#616161]" /></label>
                    <textarea 
                      className="w-full border border-[#e0e0e0] rounded p-3 text-sm min-h-[80px]"
                      defaultValue={`Use this tool after the Supply Chain Manager approves the action.
Example User Queries`}
                    />
                    <p className="text-xs text-[#a0a0a0] text-right">148/1024</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1">Agent flow</label>
                    <a href="#" className="text-[#0078d4] text-sm flex items-center gap-1">
                      <Workflow className="w-4 h-4" />
                      Confirm Reallocation Approval
                    </a>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1">Available to</label>
                    <div className="flex items-center gap-2 text-sm text-[#616161]">
                      <Bot className="w-4 h-4" />
                      Order Fulfillment Agent
                    </div>
                  </div>

                  <button className="text-[#0078d4] text-sm flex items-center gap-1">
                    <ChevronDown className="w-4 h-4" />
                    Additional details
                  </button>
                </div>
              </div>

              {/* Inputs Card */}
              <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#0078d4]" />
                    <h2 className="text-lg font-semibold">Inputs</h2>
                  </div>
                  <Button variant="outline" size="sm" disabled className="gap-1">
                    <Plus className="w-4 h-4" />
                    Add input
                  </Button>
                </div>
                <p className="text-sm text-[#616161] mb-4">
                  What the tool accepts in order to run. Inputs will be filled in the order shown.
                </p>
                <div className="text-center py-8 text-sm text-[#616161]">
                  No inputs. Add inputs to pass data to this tool.
                </div>
              </div>

              {/* Completion Card */}
              <div className="bg-white rounded-lg border border-[#e0e0e0] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-5 h-5 text-[#0078d4]" />
                  <h2 className="text-lg font-semibold">Completion</h2>
                </div>
                <p className="text-sm text-[#616161] mb-4">
                  Specify what your agent does when it finishes using this tool.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">After running:</label>
                    <select className="w-full h-10 px-3 border border-[#e0e0e0] rounded">
                      <option>Don't respond (default)</option>
                    </select>
                  </div>

                  <button className="text-[#0078d4] text-sm flex items-center gap-1">
                    <ChevronDown className="w-4 h-4" />
                    Advanced
                  </button>

                  <div>
                    <label className="text-sm font-medium block mb-1">Outputs available to the agent and other tools</label>
                    <p className="text-xs text-[#616161] mb-2">Defines which outputs are available to the agent and other tools</p>
                    <select className="w-full h-10 px-3 border border-[#e0e0e0] rounded">
                      <option>All</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">Outputs</label>
                    <div className="flex items-center justify-between p-3 border border-[#e0e0e0] rounded">
                      <div>
                        <p className="text-sm font-medium">response</p>
                        <p className="text-xs text-[#616161]">response</p>
                      </div>
                      <Settings className="w-4 h-4 text-[#616161]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-white border-t border-[#e0e0e0] flex items-center px-6">
        <Button variant="ghost" size="sm" className="gap-1">
          <Pencil className="w-4 h-4" />
          Edit flow
        </Button>
        <Link2 className="w-4 h-4 text-[#616161] ml-auto" />
      </div>
    </div>
  );

  const showNonFullscreenTestPanel = showTestPanel && !isTestFullscreen && 
    (viewMode === "agent-overview" || viewMode === "agent-tools" || viewMode === "tool-detail");

  return (
    <div className="h-screen flex flex-col bg-white">
      {renderHeader()}
      <div className="flex-1 flex overflow-hidden">
        {renderSidebar()}
        <div className="flex-1 flex flex-col overflow-hidden">
          {(viewMode === "agent-overview" || viewMode === "agent-tools" || viewMode === "tool-detail") && renderAgentTabs()}
          
          {showNonFullscreenTestPanel ? (
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={60} minSize={40}>
                <div className="h-full overflow-auto">
                  {viewMode === "agent-overview" && renderAgentOverview()}
                  {viewMode === "agent-tools" && renderAgentTools()}
                  {viewMode === "tool-detail" && renderToolDetail()}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
                <MSCopilotTestPanel
                  onClose={handleCloseTest}
                  onExpandFullscreen={handleExpandFullscreen}
                  isFullscreen={false}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {viewMode === "agents" && renderAgentsList()}
              {viewMode === "agent-overview" && renderAgentOverview()}
              {viewMode === "agent-tools" && renderAgentTools()}
              {viewMode === "tool-detail" && renderToolDetail()}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Test Panel */}
      {isTestFullscreen && showTestPanel && (
        <MSCopilotTestPanel
          onClose={handleCloseTest}
          onExpandFullscreen={handleExpandFullscreen}
          isFullscreen={true}
        />
      )}
    </div>
  );
}
