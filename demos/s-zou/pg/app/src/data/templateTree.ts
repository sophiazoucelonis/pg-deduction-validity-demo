import { LayoutDashboard, Zap, GitBranch, AudioWaveform, Fingerprint, Network, FileText } from "lucide-react";
import { TreeNode } from "@/components/layout/TreeNav";

export const templateTreeItems: TreeNode[] = [
  {
    id: "templates",
    label: "Templates",
    type: "folder",
    children: [
      { id: "template-view", label: "View", type: "view", icon: LayoutDashboard, showHome: true },
      { id: "template-action-flow", label: "Action Flow", type: "orchestration", icon: Zap },
      { id: "template-orchestration", label: "Process Orchestration", type: "orchestration", icon: GitBranch },
      { id: "template-form", label: "Form", type: "view", icon: FileText },
      { id: "template-copilot", label: "Process Copilot", type: "assistant", icon: AudioWaveform },
      { id: "template-annotation", label: "AI Annotation Builder", type: "view", icon: Fingerprint },
      { id: "template-knowledge", label: "Knowledge Model", type: "knowledge", icon: Network },
      { id: "template-process-explorer", label: "Process Explorer View", type: "view", icon: LayoutDashboard },
    ],
  },
];

export const templateRoutes: Record<string, string> = {
  "template-view": "/",
  "template-dashboard": "/",
  "template-action-flow": "/templates/action-flow",
  "template-orchestration": "/templates/orchestration",
  "template-form": "/templates/form",
  "template-annotation": "/templates/annotation-builder",
  "template-copilot": "/templates/process-copilot",
  "template-process-explorer": "/templates/process-explorer",
  "template-knowledge": "/templates/knowledge-model",
};
