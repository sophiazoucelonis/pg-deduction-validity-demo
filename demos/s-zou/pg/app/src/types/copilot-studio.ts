export interface CopilotStudioData {
  agentName: string;
  agentDescription: string;
  agentInstructions: string;
  model: string;
  trigger: {
    label: string;
    description: string;
  };
  mcpTools: {
    name: string;
    type: string;
    availableTo: string;
    iconUrl?: string;
  }[];
  documents: { name: string; format: string }[];
  topics: string[];
  testGreeting: string;
  testPrompts: string[];
  testConversation?: {
    userMessage: string;
    agentPreamble: string;
    dataCard: {
      title: string;
      rows: { label: string; value: string }[];
    };
    agentRecommendation: string;
    followUp: string;
  };
}

export const copilotSampleData: CopilotStudioData = {
  agentName: "Invoice Matching Agent",
  agentDescription:
    "Evaluates invoice discrepancies by leveraging Celonis process intelligence — including event logs, 3-way match results, vendor history, and predicted resolution paths. The agent determines whether the invoice should be auto-approved, adjusted, escalated, or returned to the vendor.",
  agentInstructions:
    "Always start by summarizing the invoice discrepancy type (quantity, price, or duplicate). Then recommend the action to take. Always pull event log traces, process metrics, vendor history, and match results before making a recommendation.\n\nOutputs from tools are used as inputs in subsequent actions — run them sequentially one after the other and wait until previous one finishes. Always include a recommended action (Auto-Approve, Adjust & Post, Escalate to Buyer, or Return to Vendor), a confidence score, and a rationale summary.\n\nPresent them as short labeled points if possible, but only include categories where data is available. Avoid generic summaries — instead, explicitly ground the rationale in the data sources retrieved.",
  model: "GPT-5 Chat",
  trigger: {
    label: "When Celonis Process Signal is received",
    description:
      "GR/IR mismatch detected — invoice quantity or price deviates beyond tolerance",
  },
  mcpTools: [
    { name: "Celonis MCP Get Invoice Match Results", type: "Model Context Protocol", availableTo: "Invoice Matching Agent" },
    { name: "Celonis MCP Get Process Conformance", type: "Model Context Protocol", availableTo: "Invoice Matching Agent" },
    { name: "Celonis MCP Get Vendor Reliability Score", type: "Model Context Protocol", availableTo: "Invoice Matching Agent" },
    { name: "Celonis MCP Get Case Event Log", type: "Model Context Protocol", availableTo: "Invoice Matching Agent" },
    { name: "Celonis MCP Get Resolution Prediction", type: "Model Context Protocol", availableTo: "Invoice Matching Agent" },
  ],
  documents: [
    { name: "Delivery notes", format: "PDF" },
    { name: "Material certificates", format: "PDF" },
    { name: "Vendor correspondence", format: "Email" },
    { name: "Company matching policy", format: "PDF" },
  ],
  topics: ["Goodbye", "Greeting", "Start Over"],
  testGreeting:
    "I can help resolve invoice discrepancies using Celonis Process Intelligence. Try asking:",
  testPrompts: [
    "What is the recommended action for invoice #4700089234?",
    "Show me the match results for PO 450001782.",
    "Which invoices have the highest discrepancy risk?",
  ],
  testConversation: {
    userMessage:
      "Invoice #4700089234 from Müller Stahlwerke is blocked with a quantity mismatch. What's the recommended action?",
    agentPreamble:
      "I queried the Process Intelligence Graph for invoice #4700089234:",
    dataCard: {
      title: "Process Intelligence Graph",
      rows: [
        { label: "Vendor", value: "Müller Stahlwerke GmbH" },
        { label: "Discrepancy", value: "19% qty (€47,200)" },
        { label: "PO", value: "#4500087231" },
        { label: "First-time match", value: "52% (12-mo)" },
        { label: "Vendor reliability", value: "0.68 / medium" },
        { label: "Conformance", value: "3-way match blocked at GR" },
      ],
    },
    agentRecommendation:
      "Recommendation: Adjust & Post — clear the variance to GR/IR. Müller Stahlwerke accounts for 38% of rework volume but only 12% of invoice volume; in 84% of similar past cases the variance was accepted under the €50K policy threshold.",
    followUp: "Shall I post the variance and notify Sarah Chen?",
  },
};
