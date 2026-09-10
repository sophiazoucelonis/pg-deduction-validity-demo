import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { Button } from "@/components/ui/button";
import { CPChatView, CPEditView } from "@/components/copilot";
import { Settings, Sparkles, HelpCircle, Pencil, X, MessageSquare } from "lucide-react";

export default function ProcessCopilotTemplate() {
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'api'>('chat');

  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  return (
    <AppLayout
      treeItems={templateTreeItems}
      activeTreeId="template-copilot"
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "Templates" },
        { label: "Process Copilot" },
      ]}
      showTree={true}
      className="p-0"
    >
      <div className="h-full flex flex-col bg-background">
        {/* Header bar with title and actions */}
        <div className="flex items-center justify-between px-4 h-12 bg-card border-b border-border">
          <h2 className="font-semibold text-lg">AP Process Copilot</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <HelpCircle className="w-4 h-4" />
            </Button>
            
            {/* Toggle buttons */}
            <div className="flex items-center border border-border rounded-md overflow-hidden ml-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'chat' 
                    ? 'bg-card text-foreground' 
                    : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                Celonis chat
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'api' 
                    ? 'bg-card text-foreground' 
                    : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                API call
              </button>
            </div>

            {isEditMode ? (
              <>
                <Button onClick={() => setIsEditMode(false)} className="gap-2 ml-2">
                  <MessageSquare className="w-4 h-4" />
                  Go to Process Copilot Chat
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-muted"
                  onClick={() => setIsEditMode(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="icon" 
                className="h-8 w-8 ml-2"
                onClick={() => setIsEditMode(true)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditMode ? <CPEditView /> : <CPChatView userName="User" suggestedQuestion="Show me what Process Copilot can do" />}
      </div>
    </AppLayout>
  );
}
