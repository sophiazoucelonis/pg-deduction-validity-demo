import { useState, useRef } from "react";
import {
  X,
  Plus,
  Workflow,
  MoreHorizontal,
  Paperclip,
  Send,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface MSCopilotTestPanelProps {
  onClose: () => void;
  onExpandFullscreen: () => void;
  isFullscreen: boolean;
}

export function MSCopilotTestPanel({
  onClose,
  onExpandFullscreen,
  isFullscreen,
}: MSCopilotTestPanelProps) {
  const [showFlowDetails, setShowFlowDetails] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ type: "user" | "system"; content: string }>>([]);
  const [showApprovalResponse, setShowApprovalResponse] = useState(false);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.toLowerCase();
    setMessages(prev => [...prev, { type: "user", content: chatInput }]);
    setChatInput("");

    // If user types "approve" or similar, expand to fullscreen and show the approval response
    if (userMessage.includes("approve") || userMessage.includes("yes") || userMessage.includes("proceed")) {
      onExpandFullscreen();
      setTimeout(() => {
        setShowApprovalResponse(true);
      }, 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Fullscreen 3-column layout
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#fafafa] flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-[#e0e0e0] bg-white flex items-center justify-between px-4 flex-shrink-0">
          <h3 className="font-medium text-sm">Test your agent</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New test session
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Evaluate
            </Button>
            <MoreHorizontal className="w-4 h-4 text-[#616161]" />
            <div className="w-px h-5 bg-[#e0e0e0] mx-1" />
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[#f0f0f0] rounded"
            >
              <X className="w-4 h-4 text-[#616161]" />
            </button>
          </div>
        </div>

        {/* 3 Column Resizable Layout - 50% left, 25% middle, 25% right */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Column 1: Flow Steps (50%) */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={60}>
            <div className="h-full bg-white p-4 overflow-auto border-r border-[#e0e0e0]">
              <div className="flex flex-col items-center">
                {/* Flow Step Card */}
                <div 
                  className={cn(
                    "w-full border rounded-lg p-3 cursor-pointer transition-colors",
                    showFlowDetails ? "border-[#0078d4] bg-[#f0f7ff]" : "border-[#e0e0e0] hover:bg-[#f5f5f5]"
                  )}
                  onClick={() => setShowFlowDetails(true)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#0078d4] rounded flex items-center justify-center flex-shrink-0">
                      <Workflow className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm block truncate">Confirm Reallocation Approval</span>
                      <span className="text-xs text-[#616161]">Flow</span>
                    </div>
                    <span className="text-xs text-[#a0a0a0] flex-shrink-0">1.37s</span>
                  </div>
                </div>

                {/* Connector line */}
                <div className="w-0.5 h-6 bg-[#e0e0e0]" />

                {/* Complete Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e0e0e0] rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-[#1b1b1b]">Complete</span>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Column 2: Tool Details (25%) */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
            <div className="h-full bg-white overflow-auto border-r border-[#e0e0e0]">
              {showFlowDetails && (
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#0078d4] rounded flex items-center justify-center">
                        <Workflow className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="font-medium text-sm">Confirm Reallocation Appro...</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">Complete</span>
                    </div>
                    <button 
                      onClick={() => setShowFlowDetails(false)}
                      className="p-1 hover:bg-[#f0f0f0] rounded"
                    >
                      <X className="w-4 h-4 text-[#616161]" />
                    </button>
                  </div>

                  <p className="text-xs text-[#616161] mb-4">Flow</p>

                  {/* Description */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-sm mb-2">Description</h4>
                    <p className="text-sm text-[#616161] leading-relaxed">
                      Use this tool after the Supply Chain Manager approves the action.
                      Example User Queries "Approved" "Yes, go ahead" "I approve this" "Proceed" "Do it"
                    </p>
                  </div>

                  {/* Outputs */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-sm mb-2">Outputs</h4>
                    <p className="text-xs text-[#616161] mb-2">response (String)</p>
                    <div className="bg-[#f5f5f5] p-3 rounded-lg font-mono text-xs overflow-auto relative">
                      <button className="absolute right-2 top-2 p-1 hover:bg-[#e0e0e0] rounded">
                        <Copy className="w-3.5 h-3.5 text-[#616161]" />
                      </button>
                      <pre className="text-[#1b1b1b] whitespace-pre-wrap">{`{
  "title": "Approved",

  "summary": "Fulfillment from the alternate warehouse has
been approved and is now in progress.",

  "details": {
    "order_id": "3851",`}</pre>
                    </div>
                    <button className="text-[#0078d4] text-sm mt-2 hover:underline">Show more</button>
                  </div>

                  {/* Rationale */}
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-1.5">
                      Rationale
                      <HelpCircle className="w-3.5 h-3.5 text-[#616161]" />
                    </h4>
                    <button className="text-[#0078d4] text-sm mt-1 hover:underline">Show rationale</button>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Column 3: Chat Panel (25%) */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
            <div className="h-full bg-white flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {/* Approval Request Card */}
                  <div className="bg-white border border-[#e8e8e8] rounded-lg shadow-sm mb-4">
                    <div className="p-4">
                      <h4 className="font-semibold text-base mb-2">
                        Approval Requested: Fulfill from Alternate Warehouse — Order 3851
                      </h4>
                      <p className="text-sm text-[#616161] mb-4">
                        This Microsoft Teams thread has been created to request approval to fulfill this order from an alternate warehouse in order to prevent a late delivery.
                      </p>

                      {/* Order Overview */}
                      <div className="bg-[#f8f8f8] rounded-lg p-4 mb-4">
                        <h5 className="font-semibold text-sm mb-3">Order overview</h5>
                        <ul className="text-sm space-y-1">
                          <li><span className="font-medium">Order:</span> 3851</li>
                          <li><span className="font-medium">Customer:</span> NorthStar Retail Group</li>
                          <li><span className="font-medium">Current risk:</span> Predicted 10-day delivery delay</li>
                          <li><span className="font-medium">Root cause:</span> Inbound supply delay from primary carrier</li>
                          <li><span className="font-medium">Requested action:</span> Fulfill from alternate warehouse (Dallas Fulfillment Center)</li>
                          <li><span className="font-medium">Predicted improvement:</span> Reduce delay from 10 days to 2 days</li>
                        </ul>
                      </div>

                      {/* Who is in this thread */}
                      <div className="mb-4">
                        <h5 className="font-semibold text-sm mb-2">Who is in this thread</h5>
                        <ul className="text-sm space-y-1">
                          <li><span className="font-medium">Supply Chain Manager (approval owner):</span> Diego Méndez</li>
                          <li><span className="font-medium">Customer Service Manager:</span> Griffin Banta</li>
                          <li><span className="font-medium">Order Fulfillment Specialist:</span> Joan Isern</li>
                        </ul>
                      </div>

                      {/* What's needed */}
                      <div className="bg-[#f8f8f8] rounded-lg p-4">
                        <h5 className="font-semibold text-sm mb-2">What's needed</h5>
                        <p className="text-sm">
                          Please reply in this thread with <span className="font-semibold">Approve</span> or <span className="font-semibold">Reject</span>, along with any comments. The system will record the decision and proceed accordingly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#a0a0a0] mb-3">An hour ago</p>

                  {/* User messages */}
                  {messages.map((msg, idx) => (
                    <div key={idx} className="mb-3">
                      {msg.type === "user" && (
                        <div className="flex justify-end">
                          <span className="px-3 py-1.5 bg-[#0078d4] text-white text-sm rounded">
                            {msg.content}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Approval Response */}
                  {showApprovalResponse && (
                    <>
                      <div className="bg-white border border-[#e8e8e8] rounded-lg p-4 mb-3">
                        <p className="text-sm mb-3">
                          The reallocation has been successfully approved and is now in progress.
                        </p>
                        
                        <h5 className="font-semibold text-sm mb-2">Approval Summary</h5>
                        <ul className="text-sm space-y-1 mb-4">
                          <li className="flex gap-2">
                            <span className="font-medium min-w-fit">Order ID:</span>
                            <span>3851</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-medium min-w-fit">Approved By:</span>
                            <span>Supply Chain Manager</span>
                          </li>
                        </ul>

                        <h5 className="font-semibold text-sm mb-2">Actions Taken</h5>
                        <ul className="text-sm space-y-1.5 mb-4">
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>Fulfillment location updated to <span className="font-medium">Dallas Fulfillment Center</span></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>Inventory reserved for <span className="font-medium">Order 3851</span></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">⏳</span>
                            <span>Customer notification drafted and pending send</span>
                          </li>
                        </ul>

                        <h5 className="font-semibold text-sm mb-2">Impact</h5>
                        <ul className="text-sm mb-3">
                          <li><span className="font-medium">Expected Delay Reduction:</span> From <span className="font-medium">10 days</span> down to <span className="font-medium">2 days</span></li>
                        </ul>
                        <p className="text-sm">Your order is now being processed from the alternate warehouse to minimize the delay.</p>

                        <div className="flex gap-2 mt-4 pt-3 border-t border-[#e8e8e8]">
                          <ThumbsUp className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" />
                          <ThumbsDown className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" />
                        </div>
                      </div>
                      <p className="text-xs text-[#a0a0a0]">Just now</p>
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-[#e0e0e0] flex-shrink-0">
                <div className="relative border border-[#e0e0e0] rounded-lg bg-white">
                  <Input 
                    placeholder="Ask a question or describe what you need" 
                    className="border-0 pr-16 h-12 text-sm"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                    <Paperclip className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" />
                    <Send 
                      className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" 
                      onClick={handleSendMessage}
                    />
                  </div>
                  <p className="absolute left-3 bottom-2 text-[10px] text-[#a0a0a0]">0/2000</p>
                </div>
                <p className="text-[10px] text-[#a0a0a0] mt-2 leading-relaxed">
                  You're testing your agent's real responses and capabilities. <a href="#" className="text-[#0078d4]">Find troubleshooting help here</a>. Make sure AI-generated content is accurate and appropriate before using. <a href="#" className="text-[#0078d4]">See terms</a>
                </p>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Footer */}
        <div className="h-10 border-t border-[#e0e0e0] bg-white flex items-center px-4">
          <Button variant="ghost" size="sm" className="h-7 px-3 text-xs gap-1.5">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit flow
          </Button>
          <div className="ml-auto">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#616161]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Non-fullscreen: Simple side panel (drag to resize handled by parent)
  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-[#e0e0e0] flex items-center justify-between px-4 flex-shrink-0">
        <h3 className="font-medium text-sm">Test your agent</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <MoreHorizontal className="w-4 h-4 text-[#616161]" />
          <div className="w-px h-5 bg-[#e0e0e0] mx-1" />
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#f0f0f0] rounded"
          >
            <X className="w-4 h-4 text-[#616161]" />
          </button>
        </div>
      </div>

      {/* Chat Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Approval Request Card */}
          <div className="bg-white border border-[#e8e8e8] rounded-lg shadow-sm mb-4">
            <div className="p-4">
              <h4 className="font-semibold text-base mb-2">
                Approval Requested: Fulfill from Alternate Warehouse — Order 3851
              </h4>
              <p className="text-sm text-[#616161] mb-4">
                This Microsoft Teams thread has been created to request approval to fulfill this order from an alternate warehouse in order to prevent a late delivery.
              </p>

              {/* Order Overview */}
              <div className="bg-[#f8f8f8] rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-sm mb-3">Order overview</h5>
                <ul className="text-sm space-y-1.5">
                  <li><span className="font-medium">Order:</span> 3851</li>
                  <li><span className="font-medium">Customer:</span> NorthStar Retail Group</li>
                  <li><span className="font-medium">Current risk:</span> Predicted 10-day delivery delay</li>
                  <li><span className="font-medium">Root cause:</span> Inbound supply delay from primary carrier</li>
                  <li><span className="font-medium">Requested action:</span> Fulfill from alternate warehouse (Dallas Fulfillment Center)</li>
                  <li><span className="font-medium">Predicted improvement:</span> Reduce delay from 10 days to 2 days</li>
                </ul>
              </div>

              {/* Who is in this thread */}
              <div className="mb-4">
                <h5 className="font-semibold text-sm mb-2">Who is in this thread</h5>
                <ul className="text-sm space-y-1.5">
                  <li><span className="font-medium">Supply Chain Manager (approval owner):</span> Diego Méndez</li>
                  <li><span className="font-medium">Customer Service Manager:</span> Griffin Banta</li>
                  <li><span className="font-medium">Order Fulfillment Specialist:</span> Joan Isern</li>
                </ul>
              </div>

              {/* What's needed */}
              <div className="bg-[#f8f8f8] rounded-lg p-4">
                <h5 className="font-semibold text-sm mb-2">What's needed</h5>
                <p className="text-sm">
                  Please reply in this thread with <span className="font-semibold">Approve</span> or <span className="font-semibold">Reject</span>, along with any comments. The system will record the decision and proceed accordingly.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#a0a0a0] mb-3">An hour ago</p>

          {/* User messages */}
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-3">
              {msg.type === "user" && (
                <div className="flex justify-end">
                  <span className="px-3 py-1.5 bg-[#0078d4] text-white text-sm rounded">
                    {msg.content}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Approval Response */}
          {showApprovalResponse && (
            <>
              <div className="bg-white border border-[#e8e8e8] rounded-lg p-4 mb-3">
                <p className="text-sm mb-3">
                  The reallocation has been successfully approved and is now in progress.
                </p>
                
                <h5 className="font-semibold text-sm mb-2">Approval Summary</h5>
                <ul className="text-sm space-y-1 mb-4">
                  <li className="flex gap-2">
                    <span className="font-medium min-w-fit">Order ID:</span>
                    <span>3851</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium min-w-fit">Approved By:</span>
                    <span>Supply Chain Manager</span>
                  </li>
                </ul>

                <h5 className="font-semibold text-sm mb-2">Actions Taken</h5>
                <ul className="text-sm space-y-1.5 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Fulfillment location updated to <span className="font-medium">Dallas Fulfillment Center</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Inventory reserved for <span className="font-medium">Order 3851</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">⏳</span>
                    <span>Customer notification drafted and pending send</span>
                  </li>
                </ul>

                <h5 className="font-semibold text-sm mb-2">Impact</h5>
                <ul className="text-sm mb-3">
                  <li><span className="font-medium">Expected Delay Reduction:</span> From <span className="font-medium">10 days</span> down to <span className="font-medium">2 days</span></li>
                </ul>
                <p className="text-sm">Your order is now being processed from the alternate warehouse to minimize the delay.</p>

                <div className="flex gap-2 mt-4 pt-3 border-t border-[#e8e8e8]">
                  <ThumbsUp className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" />
                  <ThumbsDown className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" />
                </div>
              </div>
              <p className="text-xs text-[#a0a0a0]">Just now</p>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-[#e0e0e0] flex-shrink-0">
        <div className="relative border border-[#e0e0e0] rounded-lg bg-white">
          <Input 
            placeholder="Ask a question or describe what you need" 
            className="border-0 pr-16 h-12 text-sm"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
            <Paperclip className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" />
            <Send 
              className="w-4 h-4 text-[#616161] cursor-pointer hover:text-[#0078d4]" 
              onClick={handleSendMessage}
            />
          </div>
          <p className="absolute left-3 bottom-2 text-[10px] text-[#a0a0a0]">0/2000</p>
        </div>
        <p className="text-[10px] text-[#a0a0a0] mt-2 leading-relaxed">
          You're testing your agent's real responses and capabilities. <a href="#" className="text-[#0078d4]">Find troubleshooting help here</a>. Make sure AI-generated content is accurate and appropriate before using. <a href="#" className="text-[#0078d4]">See terms</a>
        </p>
      </div>
    </div>
  );
}
