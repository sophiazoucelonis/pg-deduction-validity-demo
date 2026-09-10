import { useSearchParams } from "react-router-dom";
import { useDemoPathParams } from "@/lib/demo-paths";
import { type ReactNode, useState, useEffect } from "react";
import { X, GraduationCap, ArrowRight, Navigation } from "lucide-react";
import { usePrepMode } from "@/contexts/PrepModeContext";
import { loadTalktrack, getActiveSection, type ParsedTalktrack } from "@/lib/talktrack";
import { usePackageViews, useDemoRoutes } from "@/contexts/DemoDataContext";
import { cn } from "@/lib/utils";

/**
 * Render a tight subset of the talktrack markdown:
 *   - `### heading`  → bold sub-heading
 *   - `> quote`      → bordered blockquote (used for opener / closing)
 *   - `- item`       → bullet list with `<Click X>` cues highlighted
 *   - `**bold**`     → bold span
 *   - blank line     → paragraph break
 *
 * Tight inline parser — no markdown dependency. Trusted content, authored by
 * the /demo skill.
 */
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Highlight `<Click X>` cues by wrapping them in a brand-colored chip.
  // Then handle **bold** within whatever remains.
  const clickRe = /<Click[^>]*>|`<Click[^>]*>`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = clickRe.exec(text)) !== null) {
    if (m.index > last) {
      out.push(...renderBold(text.slice(last, m.index), key++));
    }
    out.push(
      <span
        key={`click-${key++}`}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium"
        style={{ backgroundColor: "var(--brand-primary, #264aff)", color: "white" }}
      >
        {m[0].replace(/^`|`$/g, "")}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...renderBold(text.slice(last), key++));
  return out;
}

function renderBold(text: string, baseKey: number): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={`b-${baseKey}-${i}`} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`t-${baseKey}-${i}`}>{p}</span>;
  });
}

/** Pull the `**Screen:** ...` line out of a beat body — that's the
 *  navigation hint (URL or "open the X view and click Y"). Used by the
 *  Next peek so the VE sees where to go without the full Tell-Show-Tell. */
function extractScreenLine(body: string): string | null {
  const match = body.match(/^\*\*Screen:\*\*\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function renderBody(body: string): ReactNode {
  // Split into blocks. Each block: heading line, blockquote, list, or paragraph.
  const lines = body.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let bk = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h4 key={`h-${bk++}`} className="mt-3 mb-1 text-[13px] font-semibold text-foreground">
          {renderInline(line.slice(4))}
        </h4>,
      );
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i].startsWith(">"))) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={`q-${bk++}`}
          className="my-2 border-l-2 pl-3 text-[12.5px] italic text-foreground/80"
          style={{ borderColor: "var(--brand-primary, #264aff)" }}
        >
          {buf.map((b, j) => (
            <p key={j} className="mb-1 last:mb-0">
              {renderInline(b)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={`u-${bk++}`} className="my-2 space-y-1.5 pl-4 list-disc text-[12.5px] leading-relaxed text-foreground/85">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // Paragraph
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("### ") && !lines[i].startsWith("> ") && !lines[i].startsWith("- ") && !lines[i].startsWith("* ")) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p-${bk++}`} className="my-2 text-[12.5px] leading-relaxed text-foreground/85">
        {renderInline(para.join(" "))}
      </p>,
    );
  }
  return <>{blocks}</>;
}

interface ClickPathFallbackProps {
  owner: string;
  customer: string;
  component: string;
}

function ClickPathFallback({ owner, customer, component }: ClickPathFallbackProps) {
  const demoRoutes = useDemoRoutes();
  const packageViews = usePackageViews(owner, customer);

  const isContextModel = component === "context-model";
  const hasContextModel = demoRoutes.some(
    (r) => r.owner === owner && r.customer === customer && r.component === "context-model",
  );

  // Full ordered sequence: context-model first (if present), then package views.
  const allScreens = [
    ...(hasContextModel ? [{ component: "context-model", label: "Context Model" }] : []),
    ...packageViews.map((v) => ({ component: v.component, label: v.label })),
  ];

  const currentIdx = allScreens.findIndex((s) => s.component === component);
  const nextScreen = currentIdx >= 0 ? allScreens[currentIdx + 1] : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--brand-primary, #264aff)" }} />
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em]"
          style={{ color: "var(--brand-primary, #264aff)" }}
        >
          Click Path
        </span>
      </div>

      {isContextModel && (
        <p className="text-[12px] leading-relaxed text-foreground/75 mb-3 p-2 rounded bg-secondary">
          To leave this screen: click the <strong>Apps</strong> icon in the far-left rail (top icon, grid symbol).
        </p>
      )}

      <ol className="space-y-1.5">
        {allScreens.map((screen, idx) => {
          const isCurrent = screen.component === component;
          const isPast = currentIdx >= 0 && idx < currentIdx;
          return (
            <li
              key={screen.component}
              className={cn(
                "flex items-start gap-2 text-[12.5px] leading-relaxed rounded px-2 py-1.5",
                isCurrent && "font-semibold bg-secondary",
                isPast && "text-foreground/40 line-through",
                !isCurrent && !isPast && "text-foreground/75",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold",
                  isCurrent && "text-white"
                )}
                style={isCurrent ? { backgroundColor: "var(--brand-primary, #264aff)" } : { backgroundColor: isPast ? "#e5e5ea" : "#d1d5db" }}
              >
                {idx + 1}
              </span>
              <span>{screen.label}</span>
            </li>
          );
        })}
      </ol>

      {nextScreen && (
        <div className="mt-5 pt-4 border-t-2 border-dashed border-[#d3d3dd]">
          <div
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] mb-2"
            style={{ color: "var(--brand-primary, #264aff)" }}
          >
            <ArrowRight className="w-3 h-3" />
            Next
          </div>
          <p className="text-[12.5px] font-semibold text-foreground">{nextScreen.label}</p>
          {isContextModel && (
            <p className="text-[12px] text-foreground/75 mt-1">
              Click <strong>Apps</strong> in the left rail to navigate there.
            </p>
          )}
          {!isContextModel && (
            <p className="text-[12px] text-foreground/75 mt-1">
              Use the left sidebar to open <strong>{nextScreen.label}</strong>.
            </p>
          )}
        </div>
      )}

      {allScreens.length === 0 && (
        <p className="text-[12.5px] italic text-muted-foreground">
          No screens found for this demo.
        </p>
      )}
    </div>
  );
}

export function TalktrackPanel() {
  const { prepMode, setPrepMode } = usePrepMode();
  const { owner, customer, component } = useDemoPathParams();
  const [searchParams] = useSearchParams();
  const [parsed, setParsed] = useState<ParsedTalktrack | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!owner || !customer) return;
    setLoaded(false);
    loadTalktrack(owner, customer).then((result) => {
      setParsed(result);
      setLoaded(true);
    });
  }, [owner, customer]);

  if (!prepMode || !owner || !customer || !component) return null;

  const activeComponent = searchParams.get("detail") ?? component;
  const { active, next } = getActiveSection(parsed, activeComponent);

  return (
    <aside
      className={cn(
        "fixed top-0 right-0 z-[70] h-screen w-[380px] bg-white border-l border-[#d3d3dd] shadow-xl flex flex-col",
        "transition-transform duration-300 ease-out",
      )}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#d3d3dd] flex-shrink-0">
        <div className="flex items-center gap-2">
          <GraduationCap
            className="w-4 h-4"
            style={{ color: "var(--brand-primary, #264aff)" }}
          />
          <span className="text-[13px] font-semibold text-foreground">Preparation Mode</span>
        </div>
        <button
          type="button"
          onClick={() => setPrepMode(false)}
          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close preparation panel"
          title="Close (⌘⇧P)"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loaded && !parsed && (
          <ClickPathFallback owner={owner} customer={customer} component={activeComponent} />
        )}
        {parsed && active && (
          <>
            <h3
              className="text-[13px] font-semibold mb-2"
              style={{ color: "var(--brand-primary, #264aff)" }}
            >
              {active.heading}
            </h3>
            {renderBody(active.body)}
          </>
        )}
        {parsed && next && (
          <div className="mt-5 pt-4 border-t-2 border-dashed border-[#d3d3dd]">
            <div
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] mb-2"
              style={{ color: "var(--brand-primary, #264aff)" }}
            >
              <ArrowRight className="w-3 h-3" />
              Next
            </div>
            <h4 className="text-[12.5px] font-semibold text-foreground mb-1.5">
              {next.heading}
            </h4>
            {extractScreenLine(next.body) && (
              <p className="text-[12px] leading-relaxed text-foreground/75">
                {renderInline(extractScreenLine(next.body)!)}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
