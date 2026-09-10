/**
 * SendEmailModal — `small` modal for the canonical "Send Email with
 * Allocation Possibility" pattern. Renders:
 *
 *   - Pipe-separated metadata context line under the title
 *   - `To *` email input (optionally pre-filled — demo-only domains, never
 *     real customer emails)
 *   - "Save as new Execution Template" checkbox
 *   - Footer: Close (secondary) + Execute (primary)
 *
 * Execute closes this modal and opens the parent's ActionFlowModal in
 * "Executing Action Flow" state, matching the canonical Celonis flow
 * where sending an email is itself an action-flow execution.
 */

import { useState } from "react";
import { Modal } from "./Modal";

export interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  /** Triggered when the user clicks Execute. Parent should close this
   *  modal and open an ActionFlowModal. */
  onExecute: () => void;
  title: string;
  contextLine?: string;
  toPrefill?: string;
}

export function SendEmailModal({
  open,
  onClose,
  onExecute,
  title,
  contextLine,
  toPrefill,
}: SendEmailModalProps) {
  const [to, setTo] = useState(toPrefill ?? "");
  const [saveTemplate, setSaveTemplate] = useState(false);

  const onExecuteClick = () => {
    // For the demo we don't actually validate the email; the action-flow
    // modal opens regardless. In a real implementation we'd block on an
    // empty `to` field.
    onExecute();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title={title}
      subtitle={
        contextLine && (
          <div className="modal-subtitle text-[12px] leading-relaxed text-muted-foreground">
            {contextLine}
          </div>
        )
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="ce-button-secondary"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onExecuteClick}
            className="ce-button-primary"
          >
            Execute
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="send-email-to"
            className="text-[13px] font-medium text-foreground"
          >
            To <span className="text-[#cb1818]">*</span>
          </label>
          <input
            id="send-email-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-md border border-[#d3d3dd] text-[13px] text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[#264aff]/30 focus:border-[#264aff]"
          />
          <p className="text-[11px] text-muted-foreground">
            Define the recipients of the email. Can be a list of emails (separated with commas).
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveTemplate}
            onChange={(e) => setSaveTemplate(e.target.checked)}
            className="size-4 rounded border-[#d3d3dd] text-[#264aff] focus:ring-2 focus:ring-[#264aff]/30"
          />
          <span className="text-[13px] text-foreground">
            Save as new Execution Template
          </span>
        </label>
      </div>
    </Modal>
  );
}
