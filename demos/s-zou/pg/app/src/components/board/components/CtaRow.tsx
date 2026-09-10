/**
 * CtaRow — prominent row of action buttons. Two visual variants:
 *   - primary:   brand-colored fill (the orchestration / agent trigger)
 *   - secondary: outlined (Send Email / lower-priority action)
 *
 * Uses canonical Emotion button classes (`ce-button-primary`,
 * `ce-button-secondary`) from index.css — both ported from
 * libs/emotion/src/lib/atoms/ce-button/styles/_ce-button.variants.scss so
 * the DOM matches the real Celonis product.
 *
 * Per-button click target (in priority order):
 *   1. `modal` → open a Celonis-style modal (execute-skill or send-email).
 *      Send-email Execute chains into an execute-skill action-flow modal.
 *   2. `external_url` → open in a new browser tab (Copilot Studio handoff).
 *   3. `route` → in-prototype same-app navigation.
 *
 * Self-wrapping (registered in SELF_WRAPPING_KINDS) so BoardView doesn't put
 * the button row inside an extra bordered column-card — the buttons sit
 * directly as a sibling of the neighboring component with just the standard
 * `gap-3` between them.
 */

import { useState } from "react";
import type {
  CtaRowSpec,
  CtaRowButton,
  ExecuteSkillModalSpec,
} from "@/types/screen-instance";
import { useNavigate } from "react-router-dom";
import {
  useDemoBasePath,
  useDemoPathParams,
  resolveExternalUrl,
} from "@/lib/demo-paths";
import { cn } from "@/lib/utils";

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
import { ActionFlowModal } from "@/components/celonis/ActionFlowModal";
import { SendEmailModal } from "@/components/celonis/SendEmailModal";

export interface CtaRowProps {
  spec: CtaRowSpec;
}

interface OpenModalState {
  /** Which kind of modal is open right now. */
  kind: "execute-skill" | "send-email";
  /** The originating button — used to read modal config. */
  button: CtaRowButton;
}

/**
 * When the user clicks Execute inside a send-email modal we transition to
 * an action-flow modal. Default title/subtitle for the chained modal,
 * since the button's own modal config is for the email form, not the
 * action flow.
 */
function actionFlowFromSendEmail(button: CtaRowButton): ExecuteSkillModalSpec {
  return {
    kind: "execute-skill",
    title: button.label, // "Send Email with Recovery Plan"
    subtitle_label: "Action Flow",
    subtitle_value: "send-email",
  };
}

export function CtaRow({ spec }: CtaRowProps) {
  const basePath = useDemoBasePath();
  const { owner, customer } = useDemoPathParams();
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState<OpenModalState | null>(null);
  const [chainedActionFlow, setChainedActionFlow] =
    useState<ExecuteSkillModalSpec | null>(null);

  const onClick = (b: CtaRowButton) => {
    if (b.modal) {
      setOpenModal({ kind: b.modal.kind, button: b });
      return;
    }
    if (b.external_url) {
      const resolved = resolveExternalUrl(b.external_url, { owner, customer });
      if (resolved.kind === "in-app") navigate(resolved.path);
      else if (resolved.kind === "external")
        window.open(resolved.url, "_blank", "noopener");
      return;
    }
    if (b.route && basePath) {
      navigate(`${basePath}/${b.route}`);
    }
  };

  const closeAll = () => {
    setOpenModal(null);
    setChainedActionFlow(null);
  };

  const onEmailExecute = () => {
    // Close the email modal and open the action-flow modal in its place.
    const b = openModal?.button;
    setOpenModal(null);
    if (b) setChainedActionFlow(actionFlowFromSendEmail(b));
  };

  // Active execute-skill modal config (either a button's own, or a chained
  // one from the send-email Execute action).
  const activeSkillSpec: ExecuteSkillModalSpec | null =
    chainedActionFlow ??
    (openModal?.kind === "execute-skill" && openModal.button.modal?.kind === "execute-skill"
      ? openModal.button.modal
      : null);

  const activeEmailButton =
    openModal?.kind === "send-email" ? openModal.button : null;

  return (
    <>
      <div className="flex flex-row flex-wrap gap-2">
        {spec.buttons.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onClick(b)}
            data-prep-id={`cta-${slugifyLabel(b.label)}`}
            className={cn(
              b.variant === "primary" ? "ce-button-primary" : "ce-button-secondary",
              "flex-1 min-w-[160px]",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      {activeSkillSpec && (
        <ActionFlowModal
          open={!!activeSkillSpec}
          onClose={closeAll}
          title={activeSkillSpec.title}
          subtitleLabel={activeSkillSpec.subtitle_label}
          subtitleValue={activeSkillSpec.subtitle_value}
          postActionRoute={activeSkillSpec.post_action_route}
        />
      )}

      {activeEmailButton?.modal?.kind === "send-email" && (
        <SendEmailModal
          open
          onClose={closeAll}
          onExecute={onEmailExecute}
          title={activeEmailButton.modal.title}
          contextLine={activeEmailButton.modal.context_line}
          toPrefill={activeEmailButton.modal.to_prefill}
        />
      )}
    </>
  );
}
