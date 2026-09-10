import { useState, useRef, useEffect } from "react";
import type {
  CelonisStudioCopilotSpec,
  ChartBarSpec,
  ChartLineSpec,
} from "@/types/screen-instance";
import { ChartBar } from "./ChartBar";
import { ChartLine } from "./ChartLine";

interface Props {
  spec: CelonisStudioCopilotSpec;
}

type ScriptedResponse = NonNullable<CelonisStudioCopilotSpec["responses"]>[number];

interface Turn {
  role: "user" | "agent";
  text: string;
  reasoning?: string;
  kpi?: { label: string; value: string; caption?: string };
  chart?: ChartBarSpec | ChartLineSpec;
}

export function CelonisStudioCopilot({ spec }: Props) {
  const {
    greeting = "Hi,",
    welcome_message = "This is an example welcome message",
    input_placeholder = "What would you like to explore?",
    quick_actions = [],
  } = spec;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = turns.length === 0 && !isTyping;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isTyping]);

  function sendMessage(text: string) {
    if (!text.trim() || isTyping) return;
    setTurns((prev) => [...prev, { role: "user", text: text.trim() }]);
    setInputValue("");
    setIsTyping(true);
    setTimeout(() => {
      const r = generateResponse(text.trim());
      setTurns((prev) => [
        ...prev,
        { role: "agent", text: (r.text ?? "").trim(), reasoning: r.reasoning, kpi: r.kpi, chart: r.chart },
      ]);
      setIsTyping(false);
    }, 1400);
  }

  function generateResponse(msg: string): ScriptedResponse {
    const lower = msg.toLowerCase();
    const scripted = spec.responses ?? [];
    for (const entry of scripted) {
      if (!entry.match) continue;
      if (entry.match.some((kw) => lower.includes(kw.toLowerCase()))) return entry;
    }
    const fallback = scripted.find((e) => !e.match);
    if (fallback) return fallback;
    return {
      text: "Ich konnte Ihre Anfrage keinem bekannten Thema zuordnen. Versuchen Sie es mit einem der Vorschläge oben.",
    };
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }

  const inputBar = (
    <InputBar
      inputRef={inputRef}
      value={inputValue}
      placeholder={input_placeholder}
      sending={isTyping}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onSend={() => sendMessage(inputValue)}
    />
  );

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* Agent-bubble + animation styles — always mounted (must NOT live inside a
          conditionally-rendered node, or replies lose styling once shown). */}
      <style>{`
        @keyframes msgIn { from { opacity:0; transform: translateY(6px) scale(.98); } to { opacity:1; transform: none; } }
        .msg-in { animation: msgIn .2s ease-out; }
        @keyframes copilotShimmer { 0%{background-position:130% 0} 100%{background-position:-130% 0} }
        .loading-text { background: linear-gradient(90deg,#9aa5be 0%,#0a1f44 35%,#c3ccde 50%,#0a1f44 65%,#9aa5be 100%); background-size:260% 100%; -webkit-background-clip:text; background-clip:text; color:transparent; animation: copilotShimmer 2.2s ease-in-out infinite; }
        @keyframes reasonIn { from{opacity:0;max-height:0} to{opacity:1;max-height:400px} }
        .reason-in { animation: reasonIn .25s ease-out; overflow:hidden; }
        .agent-bubble h2 { font-size: 14px; font-weight: 700; margin: 10px 0 4px; }
        .agent-bubble h3 { font-size: 13px; font-weight: 600; margin: 8px 0 4px; }
        .agent-bubble ul { list-style: disc; padding-left: 18px; margin: 4px 0; }
        .agent-bubble ol { list-style: decimal; padding-left: 20px; margin: 4px 0; }
        .agent-bubble li.nested { list-style: circle; margin-left: 12px; }
        .agent-bubble li { margin: 2px 0; }
        .agent-bubble p { margin: 4px 0; }
        .agent-bubble p:first-child { margin-top: 0; }
        .agent-bubble p:last-child { margin-bottom: 0; }
        .agent-bubble table { border-collapse: collapse; font-size: 12px; margin: 6px 0; width: 100%; }
        .agent-bubble th { background: #e4e8f0; padding: 4px 8px; text-align: left; font-weight: 600; }
        .agent-bubble td { padding: 3px 8px; border-bottom: 1px solid #e4e8f0; }
        .agent-bubble tbody tr:nth-child(even) { background: #f5f7fa; }
      `}</style>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-white">
        {/* ── Header — matches the real Studio Copilot control cluster ── */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-[#e0e4ea] bg-white flex-shrink-0">
          <h1 className="text-[14px] font-normal text-[#0a1f44] leading-none m-0">
            <strong>{spec.package_title ?? "Operational Copilot"}</strong>
          </h1>
          <div className="flex items-center gap-1">
            <HeaderIconBtn title="Chat history">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#0A1F44" d="M19.5 12A7.5 7.5 0 0 0 6.9 6.5h1.35a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75v-3a.75.75 0 0 1 1.5 0v1.042a9 9 0 1 1-2.895 5.331.75.75 0 0 1 .752-.623c.46 0 .791.438.724.892A7.5 7.5 0 1 0 19.5 12m-7-4.25a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h2.5a.75.75 0 0 0 0-1.5H12.5z"/></svg>
            </HeaderIconBtn>
            <HeaderIconBtn title="Start a new conversation">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#0A1F44" d="M6.78 2.72a.75.75 0 0 1 0 1.06L4.56 6h8.69a7.75 7.75 0 1 1-7.75 7.75.75.75 0 0 1 1.5 0 6.25 6.25 0 1 0 6.25-6.25H4.56l2.22 2.22a.75.75 0 1 1-1.06 1.06l-3.5-3.5a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0"/></svg>
            </HeaderIconBtn>
            <HeaderIconBtn title="Share">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#0A1F44" d="M6.746 4h3.464a.75.75 0 0 1 .102 1.493l-.102.007H6.746a2.25 2.25 0 0 0-2.245 2.095l-.005.155v9.5a2.25 2.25 0 0 0 2.096 2.244l.154.006h9.5a2.25 2.25 0 0 0 2.246-2.096l.005-.154v-.498a.75.75 0 0 1 1.493-.102l.007.102v.498a3.75 3.75 0 0 1-3.551 3.744l-.2.006h-9.5a3.75 3.75 0 0 1-3.745-3.551l-.005-.2v-9.5a3.75 3.75 0 0 1 3.55-3.744zM16 5.507V7.25a.75.75 0 0 1-.75.75c-3.873 0-6.274 1.676-7.311 5.157l-.08.278.353-.237C10.448 11.737 12.798 11 15.25 11a.75.75 0 0 1 .743.649l.007.101v1.743L20.161 9.5z"/></svg>
            </HeaderIconBtn>
            <HeaderIconBtn title="Monitoring">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#0A1F44" d="M4.125 5.813c0-.932.756-1.688 1.688-1.688h3.375a.563.563 0 0 0 0-1.125H5.812A2.813 2.813 0 0 0 3 5.813v3.375a.563.563 0 0 0 1.125 0zm0 12.375c0 .931.756 1.687 1.688 1.687h3.375a.562.562 0 1 1 0 1.125H5.812A2.813 2.813 0 0 1 3 18.188v-3.375a.562.562 0 1 1 1.125 0zM18.188 4.124c.931 0 1.687.756 1.687 1.688v3.375a.562.562 0 1 0 1.125 0V5.812A2.813 2.813 0 0 0 18.188 3h-3.375a.562.562 0 1 0 0 1.125zm1.687 14.063c0 .931-.756 1.687-1.687 1.687h-3.375a.562.562 0 1 0 0 1.125h3.374A2.813 2.813 0 0 0 21 18.188v-3.375a.562.562 0 1 0-1.125 0zM12 11.438a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5m-5.684.25a.562.562 0 0 1-1.006-.504l.503.252-.503-.253v-.002l.003-.004.006-.011a6 6 0 0 1 .372-.587A7.3 7.3 0 0 1 6.853 9.323C7.923 8.406 9.596 7.5 12 7.5s4.078.906 5.147 1.823a6.2 6.2 0 0 1 1.163 1.258 6 6 0 0 1 .371.587l.006.011.002.003a.562.562 0 0 1-1.006.505l-.01-.02a5 5 0 0 0-.276-.428 6.2 6.2 0 0 0-.982-1.063C15.516 9.407 14.095 8.625 12 8.625s-3.516.782-4.415 1.552a6.2 6.2 0 0 0-.982 1.063 5 5 0 0 0-.276.429z"/></svg>
            </HeaderIconBtn>
            <HeaderIconBtn title="Documentation">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#0A1F44" d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12 6.477 2 12 2m0 1.667c-4.595 0-8.333 3.738-8.333 8.333S7.405 20.333 12 20.333s8.333-3.738 8.333-8.333S16.595 3.667 12 3.667M12 15.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2m0-8.75a2.75 2.75 0 0 1 2.75 2.75c0 1.01-.297 1.574-1.051 2.359l-.169.171c-.622.622-.78.886-.78 1.47a.75.75 0 0 1-1.5 0c0-1.01.297-1.574 1.051-2.359l.169-.171c.622-.622.78-.886.78-1.47a1.25 1.25 0 0 0-2.5 0 .75.75 0 0 1-1.5 0A2.75 2.75 0 0 1 12 6.75"/></svg>
            </HeaderIconBtn>
            <div className="w-px h-5 bg-[#e0e4ea] mx-1" />
            {/* Environment toggle — Celonis chat | External (matches the real segmented control) */}
            <div className="flex items-center border border-[#e0e4ea] rounded-md overflow-hidden text-[12px] font-medium">
              <button className="px-2.5 h-6 bg-white text-[#0a1f44] border-r border-[#e0e4ea] hover:bg-[#f5f7fa] transition-colors font-semibold">
                Celonis chat
              </button>
              <button className="px-2.5 h-6 bg-white text-[#6b7a99] hover:bg-[#f5f7fa] transition-colors">
                External
              </button>
            </div>
            <div className="w-px h-5 bg-[#e0e4ea] mx-1" />
            {/* Configuration — brand-filled edit button */}
            <button className="w-6 h-6 flex items-center justify-center rounded transition-colors" style={{ backgroundColor: "#264aff" }} title="Configuration">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="white" d="M20.952 3.048a3.58 3.58 0 0 0-5.06 0L3.94 15a3.1 3.1 0 0 0-.825 1.476L2.02 21.078a.75.75 0 0 0 .904.903l4.601-1.096a3.1 3.1 0 0 0 1.477-.825L20.952 8.11a3.58 3.58 0 0 0 0-5.06m-4 1.06a2.078 2.078 0 1 1 2.94 2.94L19 7.939 16.06 5zM15 6.062 17.94 9 7.94 19c-.21.21-.474.357-.763.426l-3.416.814.813-3.416c.069-.29.217-.554.427-.764z"/></svg>
            </button>
          </div>
        </header>

        {isEmpty ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center w-full max-w-[960px] mx-auto px-8">
            <div className="mb-6">
              <h1 className="text-[28px] font-bold text-[#0a1f44] mb-2">{greeting}</h1>
              <span className="text-[14px] text-[#6b7a99] leading-relaxed">{welcome_message}</span>
            </div>
            {inputBar}
            {quick_actions.length > 0 && (
              <div className="mt-3 flex flex-col rounded-xl border border-[#e0e4ea] overflow-hidden">
                {quick_actions.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="flex items-center gap-2.5 px-4 py-3 text-left text-[13px] text-[#0a1f44] hover:bg-[#f5f7fa] transition-colors border-t border-[#eef0f4] first:border-t-0"
                  >
                    <span className="text-[#6b7a99] flex-shrink-0"><ChatBubbleIcon /></span>
                    <span>{action}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto w-full max-w-[960px] mx-auto px-8">
              <div className="py-8 flex flex-col gap-4">
                {turns.map((turn, i) => {
                  const last = i === turns.length - 1;
                  return turn.role === "user" ? (
                    <div key={i} className={`flex justify-end ${last ? "msg-in" : ""}`}>
                      <div className="text-[13px] text-[#0a1f44] bg-[#eef1ff] px-4 py-2 max-w-[70%] rounded-2xl rounded-tr-none">
                        {turn.text}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className={last ? "msg-in" : ""}>
                      <AgentBubble text={turn.text} reasoning={turn.reasoning} kpi={turn.kpi} chart={turn.chart} />
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="loading-text font-medium">Planning next move…</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="flex-shrink-0 w-full max-w-[960px] mx-auto px-8 pb-2">{inputBar}</div>
          </>
        )}

        <p className="flex-shrink-0 text-[11px] text-[#9aa5be] text-center px-8 pb-3 pt-1">
          Output is generated by AI, please verify as errors may occur. Be aware that your conversations are shared with your analyst for monitoring purposes.
        </p>
      </main>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────── */

function InputBar({
  inputRef, value, placeholder, sending, onChange, onKeyDown, onSend,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  placeholder: string;
  sending: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}) {
  const canSend = !!value.trim() && !sending;
  return (
    <div className="bg-white rounded-2xl overflow-hidden transition-all" style={{ boxShadow: "0 0 0 1px #e0e4ea, 0 2px 8px 0 rgba(10,31,68,0.06)" }}>
      <div className="px-4 pt-3 pb-1 min-h-[44px]">
        <textarea
          ref={inputRef} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={1}
          className="w-full text-[13px] text-[#0a1f44] placeholder-[#9aa5be] outline-none bg-transparent resize-none leading-relaxed"
          style={{ minHeight: "24px", maxHeight: "120px", overflowY: "auto" }}
        />
      </div>
      <div className="flex items-center gap-1 px-3 pb-2">
        <button className="w-7 h-7 flex items-center justify-center rounded text-[#0a1f44] hover:bg-[#f0f2f5] transition-colors" title="Available data">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#0A1F44" d="M4 6c0-.69.315-1.293.774-1.78.455-.482 1.079-.883 1.793-1.202C7.996 2.377 9.917 2 12 2s4.004.377 5.433 1.018c.714.32 1.338.72 1.793 1.202.459.487.774 1.09.774 1.78v12c0 .69-.315 1.293-.774 1.78-.455.482-1.079.883-1.793 1.203C16.004 21.623 14.083 22 12 22s-4.004-.377-5.433-1.017c-.714-.32-1.338-.72-1.793-1.203C4.315 19.293 4 18.69 4 18zm1.5 0c0 .207.09.46.365.75.279.296.717.596 1.315.864 1.195.535 2.899.886 4.82.886s3.625-.35 4.82-.886c.598-.268 1.036-.568 1.315-.864.275-.29.365-.543.365-.75s-.09-.46-.365-.75c-.279-.296-.717-.596-1.315-.864C15.625 3.851 13.92 3.5 12 3.5s-3.625.35-4.82.886c-.598.268-1.036.568-1.315.864-.275.29-.365.543-.365.75m13 2.392c-.32.22-.68.417-1.067.59C16.004 9.623 14.083 10 12 10s-4.004-.377-5.433-1.018a7 7 0 0 1-1.067-.59V18c0 .207.09.46.365.75.279.296.717.596 1.315.864 1.195.535 2.899.886 4.82.886s3.625-.35 4.82-.886c.598-.268 1.036-.568 1.315-.864.275-.29.365-.543.365-.75z"/></svg>
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded-full text-[#264aff] bg-[#eef1ff]" title="Celonis chat"><ChatBubbleIcon /></button>
        <div className="flex-1" />
        <button onClick={onSend} disabled={!canSend} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${canSend ? "bg-[#2563eb] hover:bg-[#1d4ed8]" : "bg-[#e0e4ea]"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill={canSend ? "white" : "#9aa5be"} d="m12.815 12.198-7.532 1.255a.5.5 0 0 0-.386.318L2.3 20.73c-.248.64.421 1.25 1.035.943l18-9a.75.75 0 0 0 0-1.342l-18-9c-.614-.307-1.283.303-1.035.942l2.598 6.958a.5.5 0 0 0 .386.318l7.532 1.255a.2.2 0 0 1 0 .395"/></svg>
        </button>
      </div>
    </div>
  );
}

function HeaderIconBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button title={title} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#f0f2f5] transition-colors text-[#0a1f44]">
      {children}
    </button>
  );
}

function mdToHtml(text: string): string {
  return text
    .replace(/(\|.+\|\n?)+/g, (block) => {
      const rows = block.trim().split("\n").filter((r) => !/^\|[-| ]+\|$/.test(r));
      const [header, ...body] = rows;
      const th = header.split("|").filter(Boolean).map((c) => `<th>${c.trim()}</th>`).join("");
      const trs = body.map((r) => `<tr>${r.split("|").filter(Boolean).map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`).join("");
      return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // ordered items → placeholders first, so the <ul>-wrap below can't grab them
    .replace(/^\d+\. (.+)$/gm, "@@OLI@@$1@@/OLI@@")
    .replace(/^( {2,}|\t)[-*] (.+)$/gm, '<li class="nested">$2</li>')
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, (b) => `<ul>${b}</ul>`)
    .replace(/(@@OLI@@[\s\S]*?@@\/OLI@@\n?)+/g, (b) => `<ol>${b.replace(/@@OLI@@/g, "<li>").replace(/@@\/OLI@@/g, "</li>")}</ol>`)
    .replace(/\n\n+/g, "</p><p>")
    .replace(/^(?!<[a-z\/])(.+)$/gm, "<p>$1</p>")
    .replace(/<p>(<(?:h[23]|ul|ol|table)>)/g, "$1")
    .replace(/<\/(?:h[23]|ul|ol|table)><\/p>/g, (m) => m.replace(/<\/p>/, ""));
}

function AgentBubble({
  text, reasoning, kpi, chart,
}: {
  text: string;
  reasoning?: string;
  kpi?: { label: string; value: string; caption?: string };
  chart?: ChartBarSpec | ChartLineSpec;
}) {
  const [open, setOpen] = useState(false);
  const thoughtLabel = kpi ? "Displayed KPI" : chart ? "Displayed chart" : "Loaded data";
  const html = mdToHtml(text);

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => reasoning && setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-[#6b7a99] hover:text-[#0a1f44] transition-colors self-start"
        style={{ cursor: reasoning ? "pointer" : "default" }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path fill="#6b7a99" d="M2.952 5.81c0-.658.3-1.232.738-1.695.433-.46 1.027-.841 1.707-1.146C6.757 2.36 8.587 2 10.57 2s3.814.359 5.175.97c.68.304 1.273.685 1.707 1.145.437.463.737 1.037.737 1.695v5.959a5.2 5.2 0 0 0-1.428-.84V8.087c-.306.21-.649.397-1.016.562-1.361.61-3.191.969-5.175.969S6.758 9.26 5.397 8.65a6.5 6.5 0 0 1-1.016-.562v9.15c0 .197.086.437.348.715.265.28.682.567 1.252.822 1.138.51 2.76.844 4.59.844q.342 0 .675-.015a5.2 5.2 0 0 0 2.047 1.206c-.848.155-1.767.238-2.722.238-1.983 0-3.813-.36-5.174-.97-.68-.304-1.274-.686-1.707-1.145-.438-.463-.738-1.037-.738-1.695z"/></svg>
        {thoughtLabel}
        {reasoning && (
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
            <path fill="#6b7a99" d="M8.97 6.22a.75.75 0 0 0 0 1.06L13.69 12l-4.72 4.72a.75.75 0 1 0 1.06 1.06l5.25-5.25a.75.75 0 0 0 0-1.06l-5.25-5.25a.75.75 0 0 0-1.06 0"/>
          </svg>
        )}
      </button>

      {reasoning && open && (
        <div className="reason-in border border-[#e0e4ea] rounded-lg p-2 text-[12px] text-[#6b7a99] agent-bubble" dangerouslySetInnerHTML={{ __html: mdToHtml(reasoning) }} />
      )}

      <div className="py-1 text-[13px] text-[#0a1f44] leading-relaxed agent-bubble">
        {kpi && (
          <div className="my-1">
            <div className="flex items-center gap-1 text-[13px] text-[#6b7a99] mb-1">
              <span>{kpi.label}</span>
              <InfoIcon />
            </div>
            <div className="text-[40px] font-bold text-[#0a1f44] leading-none">{kpi.value}</div>
            {kpi.caption && <div className="text-[12px] text-[#6b7a99] mt-1.5">{kpi.caption}</div>}
          </div>
        )}

        {chart && <EnhancedView chart={chart} />}

        {text.trim() && <div dangerouslySetInnerHTML={{ __html: html }} />}

        <div className="flex justify-end gap-1 mt-3">
          <FeedbackBtn title="Copy"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M9 3.75A2.25 2.25 0 0 0 6.75 6v9A2.25 2.25 0 0 0 9 17.25h6A2.25 2.25 0 0 0 17.25 15V6A2.25 2.25 0 0 0 15 3.75zm-.75 2.25a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75zM4.5 8.25a.75.75 0 0 0-.75.75v9A2.25 2.25 0 0 0 6 20.25h6a.75.75 0 0 0 0-1.5H6a.75.75 0 0 1-.75-.75V9a.75.75 0 0 0-.75-.75"/></svg></FeedbackBtn>
          <FeedbackBtn title="Good response"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 17.985c0 2.442-1.14 4.199-3.007 4.199-.975 0-1.341-.543-1.69-1.796l-.207-.772q-.152-.54-.527-1.83a.3.3 0 0 0-.03-.066l-2.866-4.485a5.9 5.9 0 0 0-2.855-2.327l-.473-.181A2.75 2.75 0 0 1 3.13 7.635l.404-2.086A3.25 3.25 0 0 1 5.95 3.011l7.628-1.87a4.75 4.75 0 0 1 5.733 3.44l1.415 5.55a3.25 3.25 0 0 1-3.15 4.053h-1.822c.496 1.632.746 2.892.746 3.801"/></svg></FeedbackBtn>
          <FeedbackBtn title="Bad response"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 5.203c0-2.442-1.14-4.2-3.007-4.2-1.026 0-1.378.602-1.746 2-.075.29-.112.43-.151.569q-.152.539-.527 1.83a.3.3 0 0 1-.03.065L8.174 9.953a5.9 5.9 0 0 1-2.855 2.327l-.473.181a2.75 2.75 0 0 0-1.716 3.092l.404 2.086a3.25 3.25 0 0 0 2.417 2.538l7.628 1.87a4.75 4.75 0 0 0 5.733-3.44l1.415-5.55a3.25 3.25 0 0 0-3.15-4.053h-1.822c.496-1.633.746-2.892.746-3.801"/></svg></FeedbackBtn>
          <FeedbackBtn title="Regenerate"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M5.463 4.433A9.96 9.96 0 0 1 12 2c5.523 0 10 4.477 10 10 0 2.136-.67 4.116-1.81 5.74L17 12h3A8 8 0 0 0 6.46 6.22zM18.537 19.567A9.96 9.96 0 0 1 12 22C6.477 22 2 17.523 2 12c0-2.136.67-4.116 1.81-5.74L7 12H4a8 8 0 0 0 13.54 5.78z"/></svg></FeedbackBtn>
        </div>
      </div>
    </div>
  );
}

/* Enhanced view — chart with a Chart|Table toggle + expand-to-modal, mirroring
   the real Studio Copilot enhanced-view chrome. Reuses ChartBar / ChartLine. */
function EnhancedView({ chart }: { chart: ChartBarSpec | ChartLineSpec }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [expanded, setExpanded] = useState(false);
  const chartEl = chart.kind === "chart-bar" ? <ChartBar spec={chart} /> : <ChartLine spec={chart} />;
  const table = deriveTable(chart);

  return (
    <div className="my-2">
      <div className="flex items-center justify-end gap-1 mb-1">
        <div className="flex items-center border border-[#e0e4ea] rounded-md overflow-hidden">
          <button title="Chart" onClick={() => setView("chart")} className={`w-7 h-7 flex items-center justify-center ${view === "chart" ? "bg-[#eef1ff] text-[#264aff]" : "text-[#6b7a99] hover:bg-[#f5f7fa]"}`}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 3a1 1 0 0 1 1 1v15h15a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zM8 12a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0zm4-4a1 1 0 0 1 2 0v8a1 1 0 1 1-2 0zm4 2a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0z"/></svg>
          </button>
          <button title="Table" onClick={() => setView("table")} className={`w-7 h-7 flex items-center justify-center border-l border-[#e0e4ea] ${view === "table" ? "bg-[#eef1ff] text-[#264aff]" : "text-[#6b7a99] hover:bg-[#f5f7fa]"}`}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2 0v3h14V5zm0 5v4h6v-4zm8 0v4h6v-4zm-8 6v3h6v-3zm8 0v3h6v-3z"/></svg>
          </button>
        </div>
        <button title="Expand" onClick={() => setExpanded(true)} className="w-7 h-7 flex items-center justify-center rounded text-[#6b7a99] hover:bg-[#f5f7fa]">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM6 14v4h4v2H4v-6zm12 0h2v6h-6v-2h4z"/></svg>
        </button>
      </div>

      {view === "chart" ? chartEl : <DerivedTable table={table} />}

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8" onClick={() => setExpanded(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[1000px] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] font-semibold text-[#0a1f44]">{chart.title ?? "Chart"}</span>
              <button onClick={() => setExpanded(false)} className="w-7 h-7 flex items-center justify-center rounded text-[#6b7a99] hover:bg-[#f5f7fa]" title="Close">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M6.4 5.3 12 10.9l5.6-5.6 1.1 1.1L13.1 12l5.6 5.6-1.1 1.1L12 13.1l-5.6 5.6-1.1-1.1L10.9 12 5.3 6.4z"/></svg>
              </button>
            </div>
            {view === "chart" ? chartEl : <DerivedTable table={table} />}
          </div>
        </div>
      )}
    </div>
  );
}

function deriveTable(chart: ChartBarSpec | ChartLineSpec): { headers: string[]; rows: string[][] } {
  const fmt = (v: unknown) => {
    const c = chart as ChartBarSpec;
    return `${c.unit_prefix ?? ""}${v ?? ""}${chart.unit_suffix ?? ""}`;
  };
  const series = chart.series ?? [];
  if (chart.kind === "chart-line") {
    const xk = chart.x_axis?.key;
    const headers = [chart.x_axis?.label ?? xk ?? "", ...series.map((s) => s.label)];
    const rows = (chart.rows ?? []).map((r) => [String(r[xk] ?? ""), ...series.map((s) => fmt(r[s.key]))]);
    return { headers, rows };
  }
  const bar = chart as ChartBarSpec;
  const headers = ["", ...series.map((s) => s.label)];
  const rows = (bar.categories ?? []).map((cat, i) => {
    const row = bar.rows?.[i] ?? {};
    return [String(cat), ...series.map((s) => fmt(row[s.key]))];
  });
  return { headers, rows };
}

function DerivedTable({ table }: { table: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="border border-[#d3d3dd] rounded-xl overflow-hidden agent-bubble">
      <table style={{ margin: 0 }}>
        <thead><tr>{table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function FeedbackBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button title={title} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#e4e8f0] transition-colors text-[#6b7a99] hover:text-[#0a1f44]">
      {children}
    </button>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3.25c-5.11 0-9.25 3.2-9.25 7.25 0 1.96.98 3.73 2.57 5.03-.11 1.02-.5 2.06-1.28 2.98a.75.75 0 0 0 .63 1.23c1.64-.09 3.1-.62 4.24-1.4 1 .27 2.06.41 3.09.41 5.11 0 9.25-3.2 9.25-7.25S17.11 3.25 12 3.25m0 1.5c4.4 0 7.75 2.66 7.75 5.75S16.4 16.25 12 16.25c-.98 0-1.94-.14-2.85-.42a.75.75 0 0 0-.63.1c-.7.5-1.53.9-2.45 1.12.4-.79.63-1.63.68-2.48a.75.75 0 0 0-.3-.64c-1.43-1.06-2.2-2.44-2.2-3.68 0-3.09 3.35-5.75 7.75-5.75"/></svg>
  );
}

function InfoIcon() {
  return (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path fill="#9aa5be" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17m0 6.9a.9.9 0 0 1 .9.9v5a.9.9 0 1 1-1.8 0v-5a.9.9 0 0 1 .9-.9m0-3.55a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2"/></svg>
  );
}
