import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { ABSection, InputTag, OutputField, ABToolbar, PromptTool, PromptToolsSection, ABDataValidationTable, ABRagSidePanel } from "@/components/annotation";
import { TemplateBanner } from "@/components/ui/template-banner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus,
  Link2,
  AlignLeft,
  AlignCenter,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  ArrowRight,
  Copy,
  ChevronDown,
  Search as SearchIcon,
  Info,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Template input data fields
const inputFields = [
  { id: "1", label: "RecordID", type: "string" as const },
  { id: "2", label: "Category", type: "string" as const },
  { id: "3", label: "Description", type: "string" as const },
  { id: "4", label: "Amount", type: "number" as const },
  { id: "5", label: "Currency", type: "string" as const },
  { id: "6", label: "CreatedDate", type: "date" as const },
  { id: "7", label: "ModifiedDate", type: "date" as const },
  { id: "8", label: "Status", type: "string" as const },
];

// Execution log data
const executionLogData = [
  { id: "1", executionTime: "Apr 29, 2025, 8:53:21 AM", type: "Manual Execution", aiModel: "GPT 4o (Azure OpenAI)", user: "f.correia@celonis.com", rows: "100 / 100", duration: "00:00:35", status: "Successful" },
  { id: "2", executionTime: "Apr 23, 2025, 5:43:41 PM", type: "Manual Execution", aiModel: "GPT 4o (Azure OpenAI)", user: "f.correia@celonis.com", rows: "0 / 0", duration: "00:00:00", status: "Successful" },
  { id: "3", executionTime: "Apr 23, 2025, 4:28:22 PM", type: "Manual Execution", aiModel: "GPT 4o (Azure OpenAI)", user: "f.correia@celonis.com", rows: "66 / 66", duration: "00:00:13", status: "Successful" },
  { id: "4", executionTime: "Apr 23, 2025, 4:20:11 PM", type: "Manual Execution", aiModel: "GPT 4o (Azure OpenAI)", user: "f.correia@celonis.com", rows: "100 / 100", duration: "00:00:19", status: "Successful" },
];

// Template outputs
const defaultOutputs: { id: string; name: string; description: string; type: "String" | "Choice"; choices?: string }[] = [
  { id: "1", name: "Summary002", description: "Summary of the ticket.", type: "String" },
  { id: "2", name: "Category002", description: "Category of the ticket.", type: "Choice", choices: "Technical Support,Customer Success,Product Development" },
  { id: "3", name: "Sentiment002", description: "Sentiment of the ticket.", type: "Choice", choices: "Negative,Neutral,Positive" },
];

export default function AnnotationBuilderTemplate() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [outputs, setOutputs] = useState(defaultOutputs);
  const [includeReasoning, setIncludeReasoning] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragSettingsOpen, setRagSettingsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sectionsComplete, setSectionsComplete] = useState({
    dataAndFilters: false,
    systemPrompt: false,
    expectedOutputs: false,
  });

  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  const addOutput = () => {
    setOutputs([
      ...outputs,
      { id: String(outputs.length + 1), name: "", description: "", type: "String" as const, choices: "" },
    ]);
  };

  return (
    <AppLayout
      treeItems={templateTreeItems}
      activeTreeId="template-annotation"
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "Templates" },
        { label: "Annotation Builder" },
      ]}
      showTree={true}
      className="p-0"
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* Toolbar */}
        <ABToolbar
          name="Sample Annotation Builder"
          isDeployed={true}
          onTestConfig={() => console.log("Test config")}
          onHistory={() => console.log("History")}
          onRun={() => console.log("Run")}
          onEdit={() => setIsEditMode(!isEditMode)}
        />

        {/* Tabs */}
        <div className="border-b border-border bg-card px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2"
              >
                Execution Logs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
          {activeTab === "overview" ? (
            isEditMode ? (
              <div className="max-w-3xl mx-auto py-8 px-4 space-y-0">

                {/* Section 1: Data and Filters */}
                <ABSection
                  stepNumber={1}
                  title="Data and filters"
                  description="Click to edit"
                  isComplete={sectionsComplete.dataAndFilters}
                  defaultExpanded={false}
                >
                  <div className="pt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Select the knowledge and process context that this Annotation Builder needs to access.
                    </p>

                    {/* Knowledge Model */}
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Knowledge Model:</span>
                      <button className="text-sm font-medium hover:underline">
                        Sample Knowledge Model
                      </button>
                    </div>

                    {/* Input data */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Input data</span>
                        <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs">?</span>
                      </div>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                        {inputFields.map((field) => (
                          <InputTag
                            key={field.id}
                            label={field.label}
                            type={field.type}
                            onRemove={() => console.log("Remove", field.label)}
                          />
                        ))}
                        <button className="text-muted-foreground hover:text-foreground">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Rows count */}
                    <p className="text-sm">
                      <span className="font-medium">Rows to annotate:</span>{" "}
                      <span className="text-muted-foreground">1,234</span>
                    </p>

                    {/* Save button */}
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-muted"
                        onClick={() => setSectionsComplete({ ...sectionsComplete, dataAndFilters: true })}
                      >
                        Save & Continue
                      </Button>
                    </div>
                  </div>
                </ABSection>

                {/* Vertical connector */}
                <div className="flex justify-start ml-8">
                  <div className="w-0.5 h-6 bg-muted-foreground/30" />
                </div>

                {/* Section 2: System Prompt */}
                <ABSection
                  stepNumber={2}
                  title="System Prompt"
                  description="Describe the problem you want this Annotation Builder to work on, define its role and give tasks."
                  isComplete={sectionsComplete.systemPrompt}
                  defaultExpanded={true}
                >
                  <div className="pt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Describe the problem you want this Annotation Builder to work on, define its role and give tasks.
                    </p>

                    {/* Info banner */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/10 border border-primary/30 rounded-md">
                      <Info className="w-4 h-4 text-primary" />
                      <span className="text-sm">Add data inputs by typing "@" below!</span>
                      <button className="ml-auto text-muted-foreground hover:text-foreground">
                        ×
                      </button>
                    </div>

                    {/* Editor header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Describe your use case</span>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Rich text toolbar */}
                    <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-t-lg border border-border border-b-0">
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <Italic className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <Underline className="w-4 h-4" />
                      </button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <button className="p-1.5 hover:bg-muted rounded-md text-sm font-medium">
                        H₁
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded-md text-sm font-medium">
                        H₂
                      </button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <Strikethrough className="w-4 h-4" />
                      </button>
                      <div className="flex-1" />
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-muted rounded-md">
                        <Copy className="w-4 h-4" />
                      </button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <Button variant="outline" size="sm" className="h-7 text-xs hover:bg-muted">
                        Claude 3.5 Sonnet (AWS)
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </div>

                    {/* Editor content */}
                    <div className="min-h-[160px] p-4 bg-background border border-border rounded-b-lg text-sm space-y-3">
                      <p>
                        Based on the ticket and Subject : <InputTag label="Subject" variant="inline" /> and description : <InputTag label="Description" variant="inline" /> your tasks are:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-foreground ml-2">
                        <li>Categorize the ticket into one of the following <strong>categories</strong>: Technical Support, Customer Success, Product Development.</li>
                        <li>Create a concise <strong>summary</strong> of the ticket.</li>
                        <li>Determine the <strong>sentiment</strong>: Negative, Neutral, or Positive.</li>
                      </ul>
                      <p className="text-muted-foreground">
                        Leverage the descriptions: <InputTag label="Description_b" variant="inline" /> and categories: <InputTag label="Category_b" variant="inline" /> from past cases to support your answers.
                      </p>
                    </div>

                    {/* Prompt Tools */}
                    <PromptToolsSection count={1}>
                      <PromptTool
                        name="Context from similar items (RAG)"
                        enabled={ragEnabled}
                        onToggle={setRagEnabled}
                        onSettings={() => setRagSettingsOpen(true)}
                      />
                    </PromptToolsSection>

                    {/* Save button */}
                    <div className="flex justify-end pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-muted"
                        onClick={() => setSectionsComplete({ ...sectionsComplete, systemPrompt: true })}
                      >
                        Save & Continue
                      </Button>
                    </div>
                  </div>
                </ABSection>

                {/* Vertical connector */}
                <div className="flex justify-start ml-8">
                  <div className="w-0.5 h-6 bg-muted-foreground/30" />
                </div>

                {/* Section 3: Expected Outputs */}
                <ABSection
                  stepNumber={3}
                  title="Expected Outputs"
                  description="Click to edit"
                  isComplete={sectionsComplete.expectedOutputs}
                  defaultExpanded={false}
                >
                  <div className="pt-4 space-y-6">
                    <p className="text-sm text-muted-foreground">
                      Describe which output columns should be generated by the Annotation Builder.
                    </p>

                    {/* Output fields */}
                    {outputs.map((output, index) => (
                      <OutputField
                        key={output.id}
                        index={index + 1}
                        name={output.name}
                        description={output.description}
                        outputType={output.type}
                        choices={output.choices}
                        onNameChange={(value) => {
                          const updated = [...outputs];
                          updated[index].name = value;
                          setOutputs(updated);
                        }}
                        onDescriptionChange={(value) => {
                          const updated = [...outputs];
                          updated[index].description = value;
                          setOutputs(updated);
                        }}
                        onTypeChange={(type) => {
                          const updated = [...outputs];
                          updated[index].type = type;
                          setOutputs(updated);
                        }}
                        onChoicesChange={(value) => {
                          const updated = [...outputs];
                          updated[index].choices = value;
                          setOutputs(updated);
                        }}
                        onRemove={() => {
                          setOutputs(outputs.filter((_, i) => i !== index));
                        }}
                      />
                    ))}

                    {/* Add output button */}
                    <button
                      onClick={addOutput}
                      className="flex items-center gap-2 text-sm hover:underline mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add Output
                    </button>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={includeReasoning}
                          onCheckedChange={setIncludeReasoning}
                        />
                        <span className="text-sm">Include Reasoning column</span>
                      </div>
                      <Button 
                        className="hover:bg-primary/90"
                        onClick={() => setSectionsComplete({ ...sectionsComplete, expectedOutputs: true })}
                      >
                        Save & Test configuration
                      </Button>
                    </div>
                  </div>
                </ABSection>

                {/* AI disclaimer */}
                <p className="text-xs text-center text-muted-foreground pt-4">
                  Output is generated by AI, please verify as errors may occur.
                </p>
              </div>
            ) : (
              /* Default Overview - Empty State (matches screenshot 3) */
              <div className="p-6">
                {/* LLM info bar */}
                <div className="flex items-center justify-between mb-8">
                  <span className="text-sm text-muted-foreground">azure-openai-gpt-4o</span>
                  <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
                    <Sparkles className="w-4 h-4" />
                    Go to View
                  </button>
                </div>
                
                {/* Empty state */}
                <div className="flex flex-col items-center justify-center py-32">
                  <div className="w-24 h-24 mb-6 flex items-center justify-center">
                    {/* Dashed circle with icon */}
                    <div className="relative w-20 h-20">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="8 6"
                          className="text-muted-foreground/30"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No data to preview</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Run the assistant to show the result of the operation.
                  </p>
                </div>
              </div>
            )
          ) : (
            /* Execution Logs Tab */
            <div className="flex-1 p-6">
              {/* Filters */}
              <div className="flex items-center justify-end gap-3 mb-6">
                <Button variant="outline" size="sm" className="hover:bg-muted">
                  Statuses
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
                <Button variant="outline" size="sm" className="hover:bg-muted">
                  Types
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
                <Button variant="outline" size="sm" className="hover:bg-muted">
                  Date range
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </div>

              {/* Execution Logs Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold">Execution Time</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">AI Model</TableHead>
                      <TableHead className="text-xs font-semibold">User</TableHead>
                      <TableHead className="text-xs font-semibold"># Rows</TableHead>
                      <TableHead className="text-xs font-semibold">Duration</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executionLogData.map((log) => (
                      <TableRow key={log.id} className="text-sm">
                        <TableCell>{log.executionTime}</TableCell>
                        <TableCell>{log.type}</TableCell>
                        <TableCell>{log.aiModel}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{log.rows}</TableCell>
                        <TableCell>{log.duration}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {log.status}
                          </span>
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* RAG Side Panel */}
        <ABRagSidePanel
          isOpen={ragSettingsOpen}
          onClose={() => setRagSettingsOpen(false)}
          inputFields={inputFields}
        />
        </div>
        
        {/* Data Validation Table Panel - only in edit mode, at very bottom */}
        {isEditMode && activeTab === "overview" && (
          <ABDataValidationTable
            isOpen={showDataTable}
            onToggle={() => setShowDataTable(!showDataTable)}
          />
        )}
        </div>
      </div>
    </AppLayout>
  );
}
