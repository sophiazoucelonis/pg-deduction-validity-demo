/**
 * ActionFlowModal — the canonical Celonis skill-execution modal. xsmall
 * size, autoheight. Two states:
 *
 *   1. Executing: CelonisLoader + "Executing Action Flow" headline.
 *   2. Success:   green check + "Action completed." headline.
 *
 * After ~2s of executing, transitions to success. Stays open until the
 * user clicks the X — no auto-dismiss. Matches the V/E's instruction
 * that the demo should READ as a successful completion the audience can
 * see clearly.
 *
 * Mirrors the real `ce-skill-execution-modal` DOM structure (loading SVG,
 * h3 status heading). The display text says "Executing Action Flow"
 * rather than the legacy "Executing Skill" string from the canonical
 * HTML — current Celonis branding.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoBasePath } from "@/lib/demo-paths";
import { Check } from "lucide-react";
import { Modal } from "./Modal";
import { CelonisLoader } from "@/components/CelonisLoader";

export interface ActionFlowModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Subtitle pair: "**Label:** Value" under the title. */
  subtitleLabel?: string;
  subtitleValue?: string;
  /** Override the executing duration (ms). Default 2000. */
  executingDurationMs?: number;
  /** Optional in-prototype slug to navigate to after the success state shows.
   *  Used by Beat 4's primary CTA to hand off into Beat 5 (`06-orchestration`)
   *  after the spinner. When unset, the modal stays open until X (legacy
   *  behavior). */
  postActionRoute?: string;
  /** Delay in ms between the success state appearing and the navigation
   *  firing. Lets the audience read "Action completed." before the screen
   *  changes. Default 1500. */
  postActionDelayMs?: number;
}

type ExecutionState = "executing" | "success";

export function ActionFlowModal({
  open,
  onClose,
  title,
  subtitleLabel,
  subtitleValue,
  executingDurationMs = 2000,
  postActionRoute,
  postActionDelayMs = 1500,
}: ActionFlowModalProps) {
  const [state, setState] = useState<ExecutionState>("executing");
  const navigate = useNavigate();
  const basePath = useDemoBasePath();

  // Reset to "executing" each time the modal opens, then transition to
  // "success" after the configured delay.
  useEffect(() => {
    if (!open) return;
    setState("executing");
    const t = setTimeout(() => setState("success"), executingDurationMs);
    return () => clearTimeout(t);
  }, [open, executingDurationMs]);

  // Once we've reached the success state, optionally hand off to a sibling
  // screen — used for the Beat 4 → Beat 5 orchestration handoff.
  useEffect(() => {
    if (state !== "success" || !postActionRoute || !basePath) return;
    const t = setTimeout(() => {
      onClose();
      navigate(`${basePath}/${postActionRoute}`);
    }, postActionDelayMs);
    return () => clearTimeout(t);
  }, [state, postActionRoute, postActionDelayMs, basePath, navigate, onClose]);

  const subtitle =
    subtitleLabel && subtitleValue ? (
      <div className="modal-subtitle">
        <strong className="font-semibold text-foreground">{subtitleLabel}:</strong>{" "}
        {subtitleValue}
      </div>
    ) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xsmall"
      title={title}
      subtitle={subtitle}
    >
      <div className="skill-execution-status flex flex-col items-center justify-center gap-4 py-8">
        {state === "executing" ? (
          <>
            <CelonisLoader size="md" />
            <h3 className="text-[16px] font-semibold text-foreground">
              Executing Action Flow
            </h3>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center rounded-full bg-[#d9f8f0] text-[#157757] size-12">
              <Check className="size-6" strokeWidth={2.5} />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground">
              Action completed.
            </h3>
          </>
        )}
      </div>
    </Modal>
  );
}
