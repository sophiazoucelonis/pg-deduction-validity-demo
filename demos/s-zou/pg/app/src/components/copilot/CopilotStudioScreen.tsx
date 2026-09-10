import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useStaggeredLoad } from "@/hooks/use-staggered-load";
import { StaggerIn } from "@/components/copilot/StaggerIn";
import type { CopilotStudioData } from "@/types/copilot-studio";
import {
  Search,
  Bot,
  MoreHorizontal,
  ChevronDown,
  Send,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Plus,
  X,
  HelpCircle,
} from "lucide-react";

/* ─── Sub-step type ─── */
type SubStep = "overview" | "tools" | "test";

/* ─── Copilot Studio Logo (multi-color diamond icon) ─── */
function CopilotStudioLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L14 6L10 10L6 6L10 2Z" fill="#7B2FF2" />
      <path d="M14 6L18 10L14 14L10 10L14 6Z" fill="#1B6AC9" />
      <path d="M10 10L14 14L10 18L6 14L10 10Z" fill="#0078D4" />
      <path d="M6 6L10 10L6 14L2 10L6 6Z" fill="#41A5EE" />
    </svg>
  );
}

/* ─── Toggle Switch (Fluent UI style) ─── */
function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className="relative inline-flex h-[20px] w-[40px] items-center rounded-full transition-colors shrink-0"
      style={{ background: on ? "#0078d4" : "#8a8886" }}
    >
      <span
        className="inline-block h-[14px] w-[14px] rounded-full bg-white transition-transform shadow-sm"
        style={{ transform: on ? "translateX(22px)" : "translateX(4px)" }}
      />
    </span>
  );
}

/* ─── Main Component ─── */
export default function CopilotStudioScreen({
  data,
  onSubStepChange,
}: {
  data: CopilotStudioData;
  onSubStepChange?: (step: SubStep) => void;
}) {
  const cs = data;
  const [subStep, setSubStep] = useState<SubStep>("overview");

  const changeSubStep = (step: SubStep) => {
    setSubStep(step);
    onSubStepChange?.(step);
  };

  const tabs = ["Overview", "Knowledge", "Tools", "Topics", "Agents", "Activity", "Evaluation", "Analytics", "Channels"];
  const activeTab = subStep === "tools" ? "Tools" : "Overview";

  return (
    <div className="w-full h-full flex flex-col bg-[#f5f5f5] text-[#323130] text-[13px] overflow-hidden select-none">
      {/* ── Title Bar (white bg, matches real Copilot Studio) ── */}
      <div className="h-[48px] bg-white border-b border-[#E1DFDD] flex items-center px-4 shrink-0">
        {/* Left: Waffle + Copilot Studio branding */}
        <div className="flex items-center gap-4">
          {/* 3x3 waffle/app-launcher */}
          <svg className="w-[18px] h-[18px]" viewBox="0 0 16 16" fill="#605E5C">
            <rect x="1" y="1" width="3" height="3" rx="0.5" />
            <rect x="6.5" y="1" width="3" height="3" rx="0.5" />
            <rect x="12" y="1" width="3" height="3" rx="0.5" />
            <rect x="1" y="6.5" width="3" height="3" rx="0.5" />
            <rect x="6.5" y="6.5" width="3" height="3" rx="0.5" />
            <rect x="12" y="6.5" width="3" height="3" rx="0.5" />
            <rect x="1" y="12" width="3" height="3" rx="0.5" />
            <rect x="6.5" y="12" width="3" height="3" rx="0.5" />
            <rect x="12" y="12" width="3" height="3" rx="0.5" />
          </svg>
          <CopilotStudioLogo />
          <span className="text-[#242424] text-[15px] font-semibold -ml-2">Copilot Studio</span>
        </div>

        <div className="flex-1" />

        {/* Right: Environment + gear + help + avatar */}
        <div className="flex items-center gap-4">
          {/* Environment badge */}
          <div className="flex items-center gap-2">
            <svg className="w-[16px] h-[16px] text-[#605E5C]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 17v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
            </svg>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] text-[#605E5C]">Environment</span>
              <span className="text-[12px] text-[#242424]">Celonis Labs GmbH (de...</span>
            </div>
          </div>
          {/* Gear icon */}
          <svg className="w-[18px] h-[18px] text-[#605E5C]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          {/* Help icon */}
          <HelpCircle className="w-[18px] h-[18px] text-[#605E5C]" />
          {/* User avatar */}
          <div className="w-[32px] h-[32px] rounded-full bg-[#5B5FC7] flex items-center justify-center text-white text-[12px] font-bold">DT</div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left Sidebar (matches Copilot Studio) ── */}
        <div className="w-[56px] bg-white border-r border-[#E1DFDD] flex flex-col items-center pt-1 pb-3 shrink-0">
          {[
            { icon: <SvgHome />, label: "Home", active: false, color: "#605E5C" },
            { icon: <SvgAgents />, label: "Agents", active: true, color: "#5B5FC7" },
            { icon: <SvgFlows />, label: "Flows", active: false, color: "#605E5C" },
            { icon: <SvgTools />, label: "Tools", active: false, color: "#605E5C" },
          ].map((item) => (
            <div
              key={item.label}
              className="relative w-full flex flex-col items-center py-[6px] cursor-default"
            >
              {item.active && (
                <div className="absolute left-0 top-[6px] bottom-[6px] w-[3px] bg-[#5B5FC7] rounded-r" />
              )}
              <div className={cn(
                "w-[32px] h-[32px] rounded-md flex items-center justify-center",
                item.active ? "bg-[#EBEBEB]" : "hover:bg-[#F5F5F5]"
              )}>
                <span style={{ color: item.color }}>{item.icon}</span>
              </div>
              <span
                className="text-[10px] mt-[1px] leading-tight"
                style={{ color: item.color, fontWeight: item.active ? 600 : 400 }}
              >
                {item.label}
              </span>
            </div>
          ))}
          <div className="flex-1" />
          <div className="w-full flex flex-col items-center py-[6px]">
            <div className="w-[32px] h-[32px] rounded-md flex items-center justify-center hover:bg-[#F5F5F5]">
              <MoreHorizontal className="w-[18px] h-[18px] text-[#605E5C]" />
            </div>
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Agent Header Bar */}
          <div className="h-[48px] bg-white border-b border-[#EDEBE9] flex items-center px-5 gap-2.5 shrink-0">
            <div className="w-[32px] h-[32px] rounded-lg bg-[#292929] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[14px] text-[#242424]">{cs.agentName}</span>
            <span className="w-[18px] h-[18px] rounded-full bg-[#107C10] flex items-center justify-center flex-shrink-0">
              <svg className="w-[10px] h-[10px] text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#605E5C]" />
              <span className="text-[12px] text-[#605E5C]">Published 12/5/2025</span>
              <button className="px-4 py-[6px] bg-[#0078D4] text-white text-[13px] font-semibold rounded-[4px] hover:bg-[#106EBE]">
                Publish
              </button>
              <button className="px-4 py-[6px] bg-white border border-[#8A8886] text-[#323130] text-[13px] font-semibold rounded-[4px] hover:bg-[#F3F2F1]">
                Settings
              </button>
              <MoreHorizontal className="w-4 h-4 text-[#605E5C]" />
            </div>
            {/* Test button */}
            {(() => {
              const canOpenTest = subStep === "tools" && !!cs.testConversation;
              return (
                <div
                  className={cn(
                    "relative border-l border-[#EDEBE9] pl-3 ml-1 flex flex-col items-center",
                    canOpenTest ? "cursor-pointer" : ""
                  )}
                  onClick={canOpenTest ? () => changeSubStep("test") : undefined}
                >
                  <svg className="w-4 h-4 text-[#605E5C]" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span className="text-[9px] text-[#605E5C]">Test</span>
                </div>
              );
            })()}
          </div>

          {/* Tab Bar */}
          <div className="h-[40px] bg-white border-b border-[#EDEBE9] flex items-end px-5 shrink-0">
            {tabs.map((tab) => {
              const isActive = tab === activeTab;
              const isClickable =
                (tab === "Tools" && subStep === "overview") ||
                (tab === "Overview" && subStep !== "overview");
              return (
                <div
                  key={tab}
                  onClick={
                    tab === "Tools" && subStep === "overview"
                      ? () => changeSubStep("tools")
                      : tab === "Overview" && subStep !== "overview"
                        ? () => changeSubStep("overview")
                        : undefined
                  }
                  className={cn(
                    "relative px-3 pb-[10px] text-[13px] border-b-[3px]",
                    isActive
                      ? "text-[#242424] font-semibold border-[#5B5FC7]"
                      : "text-[#616161] font-normal border-transparent",
                    isClickable ? "cursor-pointer hover:text-[#242424]" : "cursor-default"
                  )}
                >
                  {tab}
                </div>
              );
            })}
          </div>

          {/* Content Area. The test step shares the Tools sub-page on the
           *  left so the agent's tools/triggers remain visible while the
           *  test conversation panel opens on the right. */}
          <div className="flex-1 overflow-y-auto">
            {subStep === "tools" || subStep === "test" ? (
              <ToolsTab key="tools" cs={cs} />
            ) : (
              <OverviewTab key="overview" cs={cs} />
            )}
          </div>
        </div>

        {/* ── Test Panel (right side) ── Only opens explicitly via the
         *  "Test your agent" button from the Tools sub-page. The overview
         *  sub-page no longer auto-shows the chat sidebar. */}
        {subStep === "test" && cs.testConversation && (
          <TestConversationPanel
            key="test-conv"
            agentName={cs.agentName}
            testConversation={cs.testConversation}
            onBack={() => changeSubStep("overview")}
          />
        )}
      </div>
    </div>
  );
}

/* ─── SVG Icons for Sidebar ─── */

function SvgHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SvgAgents() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <circle cx="12" cy="11" r="3" />
      <path d="M8 18v-1a4 4 0 018 0v1" />
    </svg>
  );
}

function SvgFlows() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v12" />
      <path d="M18 9v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M6 6a6 6 0 0012 0" />
    </svg>
  );
}

function SvgTools() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ cs }: { cs: CopilotStudioData }) {
  const vis = useStaggeredLoad(4);
  return (
    <div className="p-6 space-y-5">
      <StaggerIn show={vis[0]}>
      <SectionCard title="Details" action={<EditBtn />}>
        <div className="flex items-start gap-4">
          <div className="w-[56px] h-[56px] rounded-xl bg-[#292929] flex items-center justify-center shrink-0">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-[#605E5C] mb-0.5">Name</div>
            <div className="font-semibold text-[14px] text-[#242424] mb-3">{cs.agentName}</div>
            <div className="flex items-center gap-2 text-[12px] text-[#605E5C] mb-0.5">
              <span>Description</span>
              <span className="text-[#A19F9D]">{cs.agentDescription.length}/1024</span>
            </div>
            <div className="text-[13px] text-[#242424] leading-[1.5]">{cs.agentDescription}</div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#EDEBE9]">
          <div className="text-[13px] font-semibold text-[#242424] mb-1">Select your agent's model</div>
          <div className="text-[12px] text-[#605E5C] mb-2">Your agent will primarily use the model for reasoning and responding. Experimental models are subject to <span className="text-[#0078D4]">preview terms</span>. <span className="text-[#0078D4]">Learn more</span></div>
          <div className="inline-flex items-center gap-2 px-3 py-[7px] bg-white rounded-[4px] border border-[#8A8886] text-[13px] text-[#242424] cursor-default">
            {cs.model}
            <ChevronDown className="w-3 h-3 text-[#605E5C]" />
          </div>
        </div>
      </SectionCard>
      </StaggerIn>

      <StaggerIn show={vis[1]}>
      <SectionCard title="Triggers" action={<AddBtn label="Add trigger" />}>
        <div className="flex items-center gap-3 p-3.5 bg-[#F3F2F1] rounded-lg border border-[#E1DFDD]">
          <div className="w-[32px] h-[32px] rounded-md bg-[#E8F5E8] flex items-center justify-center shrink-0">
            <svg className="w-[16px] h-[16px] text-[#107C10]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] text-[#242424]">{cs.trigger.label}</div>
            <div className="text-[12px] text-[#605E5C] mt-0.5">{cs.trigger.description}</div>
          </div>
        </div>
      </SectionCard>
      </StaggerIn>

      <StaggerIn show={vis[2]}>
      <SectionCard title="Instructions" action={<EditBtn />}>
        <div className="text-[13px] text-[#242424] leading-[1.6] whitespace-pre-line">{cs.agentInstructions}</div>
      </SectionCard>
      </StaggerIn>

      <StaggerIn show={vis[3]}>
      <SectionCard title="Topics" action={<AddBtn label="Add topic" />}>
        <div className="space-y-0">
          {cs.topics.map((topic) => (
            <div key={topic} className="flex items-center gap-2.5 py-2.5 border-b border-[#F3F2F1] last:border-b-0">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-[#0078D4]/10">
                <MessageSquare className="w-3 h-3 text-[#0078D4]" />
              </div>
              <span className="text-[13px] text-[#242424]">{topic}</span>
              <div className="flex-1" />
              <MoreHorizontal className="w-4 h-4 text-[#A19F9D]" />
            </div>
          ))}
          <div className="pt-2">
            <span className="text-[13px] text-[#0078D4] cursor-default">See all</span>
          </div>
        </div>
      </SectionCard>
      </StaggerIn>
    </div>
  );
}

/* ─── Tools Tab ─── */
function ToolsTab({ cs }: { cs: CopilotStudioData }) {
  const vis = useStaggeredLoad(3);
  return (
    <div className="p-5">
      <StaggerIn show={vis[0]}>
      <div className="mb-4">
        <button className="px-4 py-[7px] bg-[#0078D4] text-white rounded-[4px] text-[13px] font-semibold flex items-center gap-1.5 hover:bg-[#106EBE]">
          <Plus className="w-4 h-4" /> Add a tool
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <FilterPill label="All" active />
        <FilterPill label={`Model Context Protocol (${cs.mcpTools.length})`} icon={<McpTypeIcon />} />
        <FilterPill label={`Knowledge (${cs.documents.length})`} icon={<DocTypeIcon />} />
      </div>
      </StaggerIn>

      <StaggerIn show={vis[1]}>
      <div className="flex items-center justify-between mb-3">
        <div />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-[5px] bg-white border border-[#8A8886] rounded-[4px] w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#605E5C]" />
            <span className="text-[12px] text-[#A19F9D]">Search tools</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#A19F9D]">
            <svg className="w-3.5 h-3.5 text-[#A19F9D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Last refreshed now</span>
          </div>
        </div>
      </div>
      </StaggerIn>

      <StaggerIn show={vis[2]}>
      <div className="relative bg-white rounded-[4px] border border-[#E1DFDD] overflow-hidden">
        <div className="grid grid-cols-[2fr_1.2fr_1.2fr_0.7fr_1fr_0.5fr_0.5fr_0.6fr] border-b border-[#E1DFDD] bg-[#FAF9F8]">
          <TH>Name</TH>
          <TH>Type</TH>
          <TH>Available to</TH>
          <TH>Trigger</TH>
          <TH>Last modified</TH>
          <TH>Errors</TH>
          <TH>Blocked</TH>
          <TH>Enabled</TH>
        </div>

        {cs.mcpTools.map((tool, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1.2fr_1.2fr_0.7fr_1fr_0.5fr_0.5fr_0.6fr] border-b border-[#F3F2F1] last:border-b-0 hover:bg-[#FAF9F8] transition-colors"
          >
            <TD>
              <div className="flex items-center gap-2.5 min-w-0">
                <McpIcon src={tool.iconUrl} />
                <span className="text-[13px] text-[#242424] truncate">{tool.name}</span>
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-1.5">
                <McpTypeIcon />
                <span className="text-[13px] text-[#605E5C]">Model Context Protocol</span>
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-[18px] h-[18px] rounded-full bg-[#292929] flex items-center justify-center shrink-0">
                  <Bot className="w-[10px] h-[10px] text-white" />
                </div>
                <span className="text-[13px] text-[#605E5C] truncate">{tool.availableTo}</span>
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-1.5">
                <div className="w-[18px] h-[18px] rounded-full bg-[#F3F2F1] flex items-center justify-center shrink-0">
                  <Bot className="w-[10px] h-[10px] text-[#605E5C]" />
                </div>
                <span className="text-[13px] text-[#605E5C]">By agent</span>
              </div>
            </TD>
            <TD>
              <span className="text-[13px] text-[#605E5C]">1 month ago</span>
            </TD>
            <TD><span /></TD>
            <TD><span /></TD>
            <TD>
              <div className="flex items-center gap-1.5">
                <ToggleSwitch on />
                <span className="text-[12px] text-[#242424]">On</span>
              </div>
            </TD>
          </div>
        ))}

        {cs.documents.map((doc, i) => (
          <div
            key={`doc-${i}`}
            className="grid grid-cols-[2fr_1.2fr_1.2fr_0.7fr_1fr_0.5fr_0.5fr_0.6fr] border-b border-[#F3F2F1] last:border-b-0 hover:bg-[#FAF9F8] transition-colors"
          >
            <TD>
              <div className="flex items-center gap-2.5 min-w-0">
                <DocIcon />
                <span className="text-[13px] text-[#242424] truncate">{doc.name}</span>
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-1.5 min-w-0">
                <DocTypeIcon />
                <span className="text-[13px] text-[#605E5C]">Knowledge</span>
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-[18px] h-[18px] rounded-full bg-[#292929] flex items-center justify-center shrink-0">
                  <Bot className="w-[10px] h-[10px] text-white" />
                </div>
                <span className="text-[13px] text-[#605E5C] truncate">{cs.agentName}</span>
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-1.5">
                <div className="w-[18px] h-[18px] rounded-full bg-[#F3F2F1] flex items-center justify-center shrink-0">
                  <Bot className="w-[10px] h-[10px] text-[#605E5C]" />
                </div>
                <span className="text-[13px] text-[#605E5C]">By agent</span>
              </div>
            </TD>
            <TD>
              <span className="text-[13px] text-[#605E5C]">2 months ago</span>
            </TD>
            <TD><span /></TD>
            <TD><span /></TD>
            <TD>
              <div className="flex items-center gap-1.5">
                <ToggleSwitch on />
                <span className="text-[12px] text-[#242424]">On</span>
              </div>
            </TD>
          </div>
        ))}
      </div>
      </StaggerIn>
    </div>
  );
}

/* ─── Test Chat Panel ─── */
function TestChatPanel({ agentName, testGreeting, testPrompts }: { agentName: string; testGreeting: string; testPrompts: string[] }) {
  return (
    <div className="w-[380px] border-l border-[#E1DFDD] bg-[#FAF9F8] flex flex-col shrink-0">
      <div className="h-[44px] border-b border-[#E1DFDD] flex items-center px-4 shrink-0 bg-white">
        <span className="font-semibold text-[14px] text-[#242424]">Test your agent</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Plus className="w-4 h-4 text-[#605E5C]" />
          <svg className="w-4 h-4 text-[#605E5C]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />
          </svg>
          <MoreHorizontal className="w-4 h-4 text-[#605E5C]" />
          <div className="w-px h-4 bg-[#E1DFDD] mx-1" />
          <X className="w-4 h-4 text-[#605E5C]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-2.5">
          <div className="w-[28px] h-[28px] rounded-full bg-[#292929] flex items-center justify-center shrink-0 mt-1">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl rounded-tl-[4px] p-4 text-[13px] text-[#242424] leading-[1.6] shadow-sm border border-[#E1DFDD]">
              <p>Hello, I'm the {agentName}, a virtual assistant.</p>
              <p className="mt-2">{testGreeting}</p>
              <ul className="mt-2 space-y-1.5">
                {testPrompts.map((prompt, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#242424] mt-[2px]">&bull;</span>
                    <span>{prompt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2.5 mt-2 ml-1">
              <ThumbsUp className="w-[14px] h-[14px] text-[#A19F9D]" />
              <ThumbsDown className="w-[14px] h-[14px] text-[#A19F9D]" />
            </div>
            <div className="text-[11px] text-[#A19F9D] mt-1.5 ml-1">Just now</div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-white border-t border-[#E1DFDD]">
        <div className="flex items-center gap-2 px-3 py-[10px] bg-[#F5F5F5] rounded-lg border border-[#E1DFDD]">
          <span className="text-[13px] text-[#A19F9D] flex-1">Ask a question or describe what you need</span>
          <Paperclip className="w-4 h-4 text-[#605E5C]" />
          <div className="w-[28px] h-[28px] rounded-md bg-[#0078D4] flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        <div className="text-[11px] text-[#A19F9D] mt-1 px-1">0/2000</div>
      </div>

      <div className="px-4 py-2.5 text-[10px] text-[#A19F9D] text-center border-t border-[#E1DFDD] leading-[1.4]">
        You're testing your agent's real responses and capabilities. <span className="text-[#0078D4]">Find troubleshooting help here</span>. Make sure AI-generated content is accurate and appropriate before using. <span className="text-[#0078D4]">See terms</span>
      </div>
    </div>
  );
}

/* ─── Test Conversation Panel (auto-playing sample conversation) ─── */

type TestConversation = NonNullable<CopilotStudioData["testConversation"]>;

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[5px] h-[5px] rounded-full bg-[#605E5C]"
          style={{ animation: `cs-dot-bounce 1.4s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </span>
  );
}

function TestConversationPanel({
  agentName,
  testConversation,
  onBack,
}: {
  agentName: string;
  testConversation: TestConversation;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-[380px] border-l border-[#E1DFDD] bg-[#FAF9F8] flex flex-col shrink-0">
      <div className="h-[44px] border-b border-[#E1DFDD] flex items-center px-4 shrink-0 bg-white">
        <span className="font-semibold text-[14px] text-[#242424]">Test your agent</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Plus className="w-4 h-4 text-[#605E5C]" />
          <svg className="w-4 h-4 text-[#605E5C]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" />
          </svg>
          <MoreHorizontal className="w-4 h-4 text-[#605E5C]" />
          <div className="w-px h-4 bg-[#E1DFDD] mx-1" />
          <X className="w-4 h-4 text-[#605E5C] cursor-pointer" onClick={onBack} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {phase === 1 && (
          <div
            className="flex justify-end"
            style={{ animation: "cs-fade-up 0.25s ease forwards" }}
          >
            <div className="bg-[#E8E8F0] rounded-xl rounded-tr-[4px] px-3 py-2.5 shadow-sm border border-[#E1DFDD]">
              <TypingDots />
            </div>
          </div>
        )}

        {phase >= 2 && (
          <div
            className="flex justify-end"
            style={{ animation: "cs-fade-up 0.25s ease forwards" }}
          >
            <div className="max-w-[85%] bg-[#EDEBE9] rounded-xl rounded-tr-[4px] px-3.5 py-2.5 text-[13px] text-[#242424] leading-[1.5] shadow-sm border border-[#E1DFDD]">
              {testConversation.userMessage}
            </div>
          </div>
        )}

        {phase === 3 && (
          <div
            className="flex items-start gap-2.5"
            style={{ animation: "cs-fade-up 0.25s ease forwards" }}
          >
            <div className="w-[28px] h-[28px] rounded-full bg-[#292929] flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white rounded-xl rounded-tl-[4px] px-3 py-2.5 shadow-sm border border-[#E1DFDD]">
              <TypingDots />
            </div>
          </div>
        )}

        {phase >= 4 && (
          <div
            className="flex items-start gap-2.5"
            style={{ animation: "cs-fade-up 0.25s ease forwards" }}
          >
            <div className="w-[28px] h-[28px] rounded-full bg-[#292929] flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl rounded-tl-[4px] p-3.5 text-[13px] text-[#242424] leading-[1.55] shadow-sm border border-[#E1DFDD] space-y-3">
                <p>{testConversation.agentPreamble}</p>

                <div className="rounded-lg overflow-hidden border border-[#D1D1E0]">
                  <div className="bg-[#0078D4] text-white text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80" />
                    {testConversation.dataCard.title}
                  </div>
                  <table className="w-full text-[12px]">
                    <tbody>
                      {testConversation.dataCard.rows.map((row, i) => (
                        <tr
                          key={i}
                          className={cn(
                            "border-b border-[#EDEBE9]",
                            i === testConversation.dataCard.rows.length - 1 && "border-b-0"
                          )}
                        >
                          <td className="px-3 py-1.5 text-[#605E5C] w-[42%]">{row.label}</td>
                          <td className="px-3 py-1.5 text-[#242424] font-medium">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-1.5 bg-[#F5F5F5] text-[10px] text-[#605E5C] flex items-center gap-1.5 border-t border-[#EDEBE9]">
                    <span className="inline-block w-3 h-3 rounded-sm bg-[#5B5FC7] text-white text-[8px] font-bold flex items-center justify-center leading-none">M</span>
                    via Celonis MCP &middot; {agentName}
                  </div>
                </div>

                <p>{testConversation.agentRecommendation}</p>
                <p className="text-[#0078D4] font-medium">{testConversation.followUp}</p>
              </div>
              <div className="flex items-center gap-2.5 mt-2 ml-1">
                <ThumbsUp className="w-[14px] h-[14px] text-[#A19F9D]" />
                <ThumbsDown className="w-[14px] h-[14px] text-[#A19F9D]" />
              </div>
              <div className="text-[11px] text-[#A19F9D] mt-1.5 ml-1">Just now</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-[#E1DFDD]">
        <div className="flex items-center gap-2 px-3 py-[10px] bg-[#F5F5F5] rounded-lg border border-[#E1DFDD]">
          <span className="text-[13px] text-[#A19F9D] flex-1">Ask a question or describe what you need</span>
          <Paperclip className="w-4 h-4 text-[#605E5C]" />
          <div className="w-[28px] h-[28px] rounded-md bg-[#0078D4] flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        <div className="text-[11px] text-[#A19F9D] mt-1 px-1">0/2000</div>
      </div>

      <div className="px-4 py-2.5 text-[10px] text-[#A19F9D] text-center border-t border-[#E1DFDD] leading-[1.4]">
        You're testing your agent's real responses and capabilities. <span className="text-[#0078D4]">Find troubleshooting help here</span>. Make sure AI-generated content is accurate and appropriate before using. <span className="text-[#0078D4]">See terms</span>
      </div>
    </div>
  );
}

/* ─── Shared UI Primitives ─── */

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E1DFDD] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[15px] text-[#242424]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EditBtn() {
  return (
    <button className="flex items-center gap-1.5 text-[13px] text-[#0078D4] hover:underline">
      <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      Edit
    </button>
  );
}

function AddBtn({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1 text-[13px] text-[#0078D4] hover:underline">
      <Plus className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function FilterPill({ label, active, icon }: { label: string; active?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      className={cn(
        "px-3 py-[5px] rounded-full text-[13px] font-medium flex items-center gap-1.5 border",
        active
          ? "bg-[#0078D4] text-white border-[#0078D4]"
          : "bg-white text-[#605E5C] border-[#E1DFDD] hover:bg-[#F3F2F1]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function TH({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-2.5 text-[12px] font-semibold text-[#605E5C]">{children}</div>;
}

function TD({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3 flex items-center min-w-0">{children}</div>;
}

function McpIcon({ small, src }: { small?: boolean; src?: string }) {
  const sz = small ? 16 : 22;
  return (
    <img
      src={src ?? "/mcp_logo.png"}
      alt="MCP"
      className="shrink-0 rounded-[3px]"
      style={{ width: sz, height: sz, objectFit: "contain" }}
    />
  );
}

function McpTypeIcon() {
  return (
    <img
      src="/mcp_logo.png"
      alt="MCP"
      className="shrink-0"
      style={{ width: 16, height: 16 }}
    />
  );
}

function DocIcon() {
  return (
    <div className="w-[22px] h-[22px] rounded-[3px] bg-[#0078D4] flex items-center justify-center shrink-0">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    </div>
  );
}

function DocTypeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8886" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
