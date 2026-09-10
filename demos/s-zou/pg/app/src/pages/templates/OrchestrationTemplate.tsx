import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { FlowCanvas, OECard, OEConnector, OEToolbar, OESidePanel, OEEditProcessStepDialog, OEAddEventDialog } from "@/components/flow";
import { TemplateBanner } from "@/components/ui/template-banner";

interface FlowCard {
  id: string;
  type: "start" | "process" | "resume" | "end";
  title: string;
  items: {
    id: string;
    label: string;
    modules?: { type: "action" | "email" | "globe"; count?: number }[];
    hasWarning?: boolean;
    isEvent?: boolean;
  }[];
}

// Template orchestration flow - customize for your use case
const exampleFlow: FlowCard[] = [
  {
    id: "1",
    type: "start",
    title: "Start process",
    items: [
      { id: "1-1", label: "Vendor-PO-Confirmation-Missing", isEvent: true },
    ],
  },
  {
    id: "2",
    type: "process",
    title: "Process step",
    items: [
      { 
        id: "2-1", 
        label: "Send Vendor Confirmation Form", 
        modules: [{ type: "action" }, { type: "action" }, { type: "action" }, { type: "action" }]
      },
    ],
  },
  {
    id: "3",
    type: "resume",
    title: "Resume process",
    items: [
      { id: "3-1", label: "Receive-Vendor-Form-Response", isEvent: true },
    ],
  },
  {
    id: "4",
    type: "process",
    title: "Process step",
    items: [
      { 
        id: "4-1", 
        label: "AI Powered Alternative Supplier", 
        modules: [{ type: "action" }, { type: "action" }, { type: "action" }]
      },
    ],
  },
  {
    id: "5",
    type: "process",
    title: "Process step",
    items: [
      { 
        id: "5-1", 
        label: "Update Source System", 
        modules: [{ type: "action" }, { type: "action" }, { type: "action" }],
        hasWarning: true
      },
    ],
  },
];

export default function OrchestrationTemplate() {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isProcessStepDialogOpen, setIsProcessStepDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  const selectedCardData = exampleFlow.find(c => c.id === selectedCard);
  const isEventCard = selectedCardData?.type === "start" || selectedCardData?.type === "resume";

  const handleCardClick = (cardId: string) => {
    if (isEditMode) {
      setSelectedCard(cardId);
    }
  };

  const handleAddAction = () => {
    if (isEventCard) {
      setIsEventDialogOpen(true);
    } else {
      setIsProcessStepDialogOpen(true);
    }
  };

  return (
    <AppLayout
      treeItems={templateTreeItems}
      activeTreeId="template-orchestration"
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "Templates" },
        { label: "Orchestration Engine" },
      ]}
      showTree={true}
      className="p-0"
    >
      <div className="h-full flex flex-col">
        {/* OE Toolbar */}
        <OEToolbar
          flowName="2. Purchasing Orchestration"
          isActive={isActive}
          isEditMode={isEditMode}
          onActiveChange={setIsActive}
          onLogs={() => console.log("Open logs")}
          onEdit={() => setIsEditMode(!isEditMode)}
          onExitEdit={() => {
            setIsEditMode(false);
            setSelectedCard(null);
          }}
        />

        {/* Template Banner */}
        {!isEditMode && (
          <TemplateBanner
            title="Orchestration Engine Template"
            description="Define multi-step processes with human-in-the-loop approvals. Drag to pan, scroll to zoom."
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Flow Canvas */}
          <FlowCanvas 
            onAddModule={() => console.log("Add step")}
            showAddButton={false}
            toolbarItems={[]}
            favoriteItems={[]}
          >
            <div className="flex flex-col items-center py-12">
              {exampleFlow.map((card, index) => (
                <div key={card.id}>
                  <OECard
                    type={card.type}
                    title={card.title}
                    items={card.items}
                    isSelected={selectedCard === card.id}
                    isEditMode={isEditMode}
                    onClick={() => handleCardClick(card.id)}
                  />
                  {index < exampleFlow.length - 1 && (
                    <OEConnector 
                      showAddButton={isEditMode}
                      onAddClick={() => console.log("Add between", index)}
                    />
                  )}
                </div>
              ))}
            </div>
          </FlowCanvas>

          {/* Side Panel */}
          <OESidePanel
            isOpen={isEditMode && selectedCard !== null}
            type={selectedCardData?.type === "start" ? "start" : selectedCardData?.type === "resume" ? "resume" : "process"}
            title="Process step"
            description="Add actions to your process orchestration."
            actions={selectedCardData?.items.map(item => ({
              id: item.id,
              label: item.label,
              onEdit: handleAddAction,
            })) || []}
            onAddAction={handleAddAction}
          />
        </div>

        {/* Dialogs */}
        <OEEditProcessStepDialog
          isOpen={isProcessStepDialogOpen}
          onClose={() => setIsProcessStepDialogOpen(false)}
          onSelect={(id) => console.log("Selected action flow:", id)}
        />

        <OEAddEventDialog
          isOpen={isEventDialogOpen}
          onClose={() => setIsEventDialogOpen(false)}
          onSelect={(id) => console.log("Selected event:", id)}
        />
      </div>
    </AppLayout>
  );
}
