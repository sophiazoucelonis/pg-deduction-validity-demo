/**
 * WebformModal — canonical Celonis "Submit a form" popup, opened from a
 * Beat 5 orchestration `Process step` whose `actor: form`. Mirrors the OE
 * Forms surface a Study Lead / planner / reviewer would actually fill in
 * when the orchestration pauses on a webform step.
 *
 * Shape (small modal):
 *   - Title — the orchestration step's `label` verbatim
 *   - Description — the step's `narrative` (the reason the form is open)
 *   - Decision radio: Approve / Override (the canonical wave-plan / wave-
 *     amendment decision shape — the inputs the human is being asked for)
 *   - Comments textarea — short free-text rationale
 *   - Footer: Cancel (secondary) + Submit (primary)
 *
 * Submit closes the modal — there's no chained action-flow modal here, the
 * orchestration view stays put. (In a real OE flow the form submission
 * would unblock the next `Resume process` step; in the prototype the
 * Beat 5 view itself is a snapshot of the in-flight instance.)
 */

import { useEffect, useState } from "react";
import { Modal } from "./Modal";

export interface WebformModalProps {
  open: boolean;
  onClose: () => void;
  /** Orchestration step `label` — used as the modal title. */
  title: string;
  /** Orchestration step `narrative` — used as the description line. */
  description?: string;
}

type Decision = "approve" | "override";

export function WebformModal({
  open,
  onClose,
  title,
  description,
}: WebformModalProps) {
  const [decision, setDecision] = useState<Decision>("approve");
  const [comments, setComments] = useState("");

  // Reset form state each time the modal re-opens so the V/E sees a
  // pristine form when they click into the same step again later.
  useEffect(() => {
    if (open) {
      setDecision("approve");
      setComments("");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title={title}
      subtitle={
        description ? (
          <div className="text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </div>
        ) : undefined
      }
      footer={
        <>
          <button type="button" onClick={onClose} className="ce-button-secondary">
            Cancel
          </button>
          <button type="button" onClick={onClose} className="ce-button-primary">
            Submit
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-3">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-foreground">
            Decision <span className="text-[#cb1818]">*</span>
          </span>
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="webform-decision"
              checked={decision === "approve"}
              onChange={() => setDecision("approve")}
              className="mt-1 size-4 text-[#264aff] focus:ring-2 focus:ring-[#264aff]/30"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-foreground leading-tight">
                Approve as proposed
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                Adopt the agent-recommended plan as-is.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="webform-decision"
              checked={decision === "override"}
              onChange={() => setDecision("override")}
              className="mt-1 size-4 text-[#264aff] focus:ring-2 focus:ring-[#264aff]/30"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-foreground leading-tight">
                Override
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                Adjust the recommendation; add rationale below.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="webform-comments"
            className="text-[13px] font-medium text-foreground"
          >
            Comments
          </label>
          <textarea
            id="webform-comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="px-3 py-2 rounded-md border border-[#d3d3dd] text-[13px] text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#264aff]/30 focus:border-[#264aff]"
          />
          <p className="text-[11px] text-muted-foreground">
            Optional. Visible to the orchestration log and the Copilot Studio agent.
          </p>
        </div>
      </div>
    </Modal>
  );
}
