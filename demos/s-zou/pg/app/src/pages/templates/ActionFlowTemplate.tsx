import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { DraggableFlowModule, FlowConnection, FlowToolbar, FlowCanvas, FlowModulePicker, FlowModuleConfigDialog, ModuleType, FlowControlPicker, FlowControlItem } from "@/components/flow";
import { TemplateBanner } from "@/components/ui/template-banner";
import { 
  Mail,
  FileCode,
  Wrench,
  Repeat,
  ArrowRightLeft,
  Layers,
  GitFork,
} from "lucide-react";
import { toast } from "sonner";

interface Position {
  x: number;
  y: number;
}

interface ModuleConfig {
  id: string;
  icon: typeof Mail;
  title: string;
  subtitle: string;
  badge: number;
  variant: "trigger" | "parser" | "tools" | "sap" | "action";
  configType: ModuleType;
  headerColor: string;
  color: string;
  position: Position;
}

// Template modules - customize for your use case
const initialModules: ModuleConfig[] = [
  {
    id: "1",
    icon: Mail,
    title: "Microsoft 365 Email (Outlook)",
    subtitle: "Watch Emails",
    badge: 1,
    variant: "trigger" as const,
    configType: "outlook" as ModuleType,
    headerColor: "bg-[#0078D4]",
    color: "#0078D4",
    position: { x: -300, y: 0 },
  },
  {
    id: "2",
    icon: FileCode,
    title: "Text parser",
    subtitle: "HTML to text",
    badge: 2,
    variant: "parser" as const,
    configType: "text-parser" as ModuleType,
    headerColor: "bg-[#f97316]",
    color: "#f97316",
    position: { x: -100, y: 0 },
  },
  {
    id: "3",
    icon: Wrench,
    title: "Tools",
    subtitle: "Set multiple variables",
    badge: 3,
    variant: "tools" as const,
    configType: "tools" as ModuleType,
    headerColor: "bg-[#8b5cf6]",
    color: "#8b5cf6",
    position: { x: 100, y: 0 },
  },
  {
    id: "4",
    icon: FileCode,
    title: "SAP",
    subtitle: "Change Sales Order",
    badge: 4,
    variant: "sap" as const,
    configType: "tools" as ModuleType,
    headerColor: "bg-[#1B3A6D]",
    color: "#1B3A6D",
    position: { x: 300, y: 0 },
  },
];

// Initial connections between modules (by ID)
const initialConnections = [
  { from: "1", to: "2" },
  { from: "2", to: "3" },
  { from: "3", to: "4" },
];

export default function ActionFlowTemplate() {
  const navigate = useNavigate();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isFlowControlOpen, setIsFlowControlOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [modules, setModules] = useState<ModuleConfig[]>(initialModules);
  const [connections, setConnections] = useState(initialConnections);
  const [zoom, setZoom] = useState(100);
  
  // Connection dragging state
  const [connectionDragSource, setConnectionDragSource] = useState<{ moduleId: string; side: "left" | "right" } | null>(null);

  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  const handleModuleClick = (module: ModuleConfig) => {
    if (isEditMode) {
      setSelectedModule(module);
    }
  };

  const handlePositionChange = useCallback((id: string, newPosition: Position) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, position: newPosition } : m
    ));
  }, []);

  const handleAddModule = (moduleId: string) => {
    console.log("Adding module:", moduleId);
    // In a real implementation, this would add the module to the flow
  };

  // Map flow control items to module icons
  const flowControlIconMap: Record<string, typeof Repeat> = {
    "repeater": Repeat,
    "iterator": ArrowRightLeft,
    "array-aggregator": Layers,
    "router": GitFork,
  };

  const handleFlowControlSelect = (item: FlowControlItem) => {
    const newId = String(Date.now());
    const newModule: ModuleConfig = {
      id: newId,
      icon: flowControlIconMap[item.id] || Wrench,
      title: item.title,
      subtitle: item.subtitle || "Flow Control",
      badge: modules.length + 1,
      variant: "action" as const,
      configType: "tools" as ModuleType,
      headerColor: "bg-[#22c55e]",
      color: "#22c55e",
      // Spawn at a random position near center
      position: { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 },
    };
    setModules(prev => [...prev, newModule]);
    toast.success(`Added ${item.title} module`);
  };

  const handleRun = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    toast.loading("Running flow...", { id: "flow-run" });
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success("Flow executed successfully!", { 
      id: "flow-run",
      description: "All 3 modules completed without errors."
    });
    setIsRunning(false);
  };

  // Helper to get connected module positions for docker direction
  const getConnectedPositions = (moduleId: string) => {
    const incomingConnection = connections.find(c => c.to === moduleId);
    const outgoingConnection = connections.find(c => c.from === moduleId);
    
    const incomingModule = incomingConnection ? modules.find(m => m.id === incomingConnection.from) : null;
    const outgoingModule = outgoingConnection ? modules.find(m => m.id === outgoingConnection.to) : null;
    
    return {
      incomingPosition: incomingModule?.position || null,
      outgoingPosition: outgoingModule?.position || null,
    };
  };

  // Connection drag handlers
  const handleConnectionDragStart = useCallback((moduleId: string, side: "left" | "right") => {
    setConnectionDragSource({ moduleId, side });
  }, []);

  const handleConnectionDragEnd = useCallback((targetModuleId: string, targetSide: "left" | "right") => {
    if (!connectionDragSource) return;
    
    // Create the connection based on which sides were used
    // If dragging from right side, this module is the source
    // If dragging from left side, this module receives from the target
    let newConnection: { from: string; to: string };
    
    if (connectionDragSource.side === "right") {
      // Source module's right -> Target module's left
      newConnection = { from: connectionDragSource.moduleId, to: targetModuleId };
    } else {
      // Target module's right -> Source module's left
      newConnection = { from: targetModuleId, to: connectionDragSource.moduleId };
    }
    
    // Check if connection already exists
    const exists = connections.some(c => c.from === newConnection.from && c.to === newConnection.to);
    if (!exists) {
      setConnections(prev => [...prev, newConnection]);
      toast.success("Connection created");
    }
    
    setConnectionDragSource(null);
  }, [connectionDragSource, connections]);

  const handleCanvasMouseUp = useCallback(() => {
    // Clear connection drag if released on empty space
    if (connectionDragSource) {
      setConnectionDragSource(null);
    }
  }, [connectionDragSource]);

  const handleDeleteModule = useCallback((moduleId: string) => {
    // Remove the module
    setModules(prev => prev.filter(m => m.id !== moduleId));
    // Remove any connections involving this module
    setConnections(prev => prev.filter(c => c.from !== moduleId && c.to !== moduleId));
    // Clear selection if this module was selected
    if (selectedModule?.id === moduleId) {
      setSelectedModule(null);
    }
    toast.success("Module deleted");
  }, [selectedModule]);

  return (
    <AppLayout
      treeItems={templateTreeItems}
      activeTreeId="template-action-flow"
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "Templates" },
        { label: "Action Flow" },
      ]}
      showTree={true}
      className="p-0"
    >
      <div className="h-full flex flex-col">
        {/* Flow Toolbar */}
        <FlowToolbar
          flowName="Sample Action Flow"
          flowKey="sample-action-flow"
          onRun={handleRun}
          onEdit={() => setIsEditMode(!isEditMode)}
          onClose={() => navigate("/")}
          onExitEdit={() => {
            setIsEditMode(false);
            setSelectedModule(null);
          }}
          isEditMode={isEditMode}
        />

        {/* Template Banner - only show when not in edit mode */}
        {!isEditMode && (
          <TemplateBanner
            title="Action Flow Template"
            description="Build automation flows by connecting modules. Click modules to configure, drag to reorder."
          />
        )}

        {/* Flow Canvas */}
        <FlowCanvas 
          onAddModule={() => setIsPickerOpen(true)}
          showAddButton={true}
          onZoomChange={setZoom}
          onCanvasClick={() => {
            setSelectedModule(null);
            setIsFlowControlOpen(false);
            handleCanvasMouseUp();
          }}
          onFlowControlClick={() => setIsFlowControlOpen(!isFlowControlOpen)}
          isEditMode={isEditMode}
          flowControlPicker={
            <FlowControlPicker
              open={isFlowControlOpen && isEditMode}
              onOpenChange={setIsFlowControlOpen}
              onSelect={handleFlowControlSelect}
              className="absolute bottom-20 left-4"
            />
          }
        >
          {/* SVG Connections Layer */}
          {connections.map(connection => {
            const fromModule = modules.find(m => m.id === connection.from);
            const toModule = modules.find(m => m.id === connection.to);
            if (!fromModule || !toModule) return null;
            
            return (
              <FlowConnection
                key={`${connection.from}-${connection.to}`}
                from={fromModule.position}
                to={toModule.position}
                fromColor={fromModule.color}
                toColor={toModule.color}
              />
            );
          })}

          {/* Draggable Modules */}
          {modules.map((module) => {
            const { incomingPosition, outgoingPosition } = getConnectedPositions(module.id);
            
            return (
              <DraggableFlowModule
                key={module.id}
                id={module.id}
                icon={module.icon}
                title={module.title}
                subtitle={module.subtitle}
                badge={module.badge}
                variant={module.variant}
                position={module.position}
                onPositionChange={handlePositionChange}
                onClick={() => handleModuleClick(module)}
                isSelected={selectedModule?.id === module.id}
                isEditMode={isEditMode}
                incomingPosition={incomingPosition}
                outgoingPosition={outgoingPosition}
                zoom={zoom}
                onConnectionDragStart={handleConnectionDragStart}
                onConnectionDragEnd={handleConnectionDragEnd}
                isConnectionDragging={!!connectionDragSource}
                connectionDragSource={connectionDragSource}
                onDelete={handleDeleteModule}
              />
            );
          })}

          {/* Module Configuration Dialog */}
          {selectedModule && (
            <FlowModuleConfigDialog
              isOpen={!!selectedModule}
              onClose={() => setSelectedModule(null)}
              moduleType={selectedModule.configType}
              moduleName={selectedModule.title}
              headerColor={selectedModule.headerColor}
              modulePosition={selectedModule.position}
            />
          )}
        </FlowCanvas>

        {/* Module Picker - positioned at bottom left near add button */}
        <FlowModulePicker
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          onSelect={handleAddModule}
          className="absolute bottom-4 left-[220px]"
        />
      </div>
    </AppLayout>
  );
}
