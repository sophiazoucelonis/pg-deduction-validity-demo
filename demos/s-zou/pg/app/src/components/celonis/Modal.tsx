/**
 * Modal — canonical Celonis `ce-modal` primitive. Centered white card with
 * a dark backdrop, header (title + optional subtitle + close X), content
 * area, and optional footer. Sizes follow the Emotion convention:
 *   - xsmall (~360px)  — single-state dialogs like the skill-execution
 *   - small  (~480px)  — form modals with a couple of fields
 *   - medium (~640px)  — richer multi-section forms
 *
 * Mirrors the structure of the real product's HTML (ce-modal__container,
 * ce-modal__wrapper, ce-modal__body, ce-modal__body__header, etc.) so the
 * DOM reads cleanly to anyone inspecting the prototype against the real
 * Celonis platform.
 *
 * Mount: rendered via React Portal into document.body so the modal sits
 * above every page chrome (sidebars, breadcrumbs, overlay panel).
 */

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModalSize = "xsmall" | "small" | "medium";

const SIZE_CLASS: Record<ModalSize, string> = {
  xsmall: "w-[440px]",
  small: "w-[560px]",
  medium: "w-[720px]",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  /** Modal title (h1 inside `ce-modal__title`). */
  title: ReactNode;
  /** Optional subtitle line under the title (typically `**Label:** Value`). */
  subtitle?: ReactNode;
  /** Modal body content. */
  children: ReactNode;
  /** Optional footer (action buttons). */
  footer?: ReactNode;
  /** ARIA label. Defaults to the title when a plain string. */
  ariaLabel?: string;
}

export function Modal({
  open,
  onClose,
  size = "xsmall",
  title,
  subtitle,
  children,
  footer,
  ariaLabel,
}: ModalProps) {
  // Esc closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="ce-modal fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop — clicking dismisses. Backdrop-blur on the underlying page
       *  matches the canonical Celonis modal: the app reads as visually
       *  pushed back, not just dimmed. */}
      <div
        className="absolute inset-0 bg-[#0a1f44]/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
        className={cn(
          "ce-modal__container relative bg-white rounded-xl shadow-[0_26px_26px_0_rgba(10,31,68,0.08),0_0_1px_0_rgba(10,31,68,0.08)] flex flex-col max-h-[90vh] overflow-hidden",
          SIZE_CLASS[size],
        )}
      >
        <div className="ce-modal__wrapper flex flex-col h-full">
          {/* Header: title + subtitle + close X */}
          <div className="ce-modal__body__header flex items-start justify-between gap-3 px-6 pt-5 pb-3 flex-shrink-0">
            <div className="ce-modal-top-title flex flex-col gap-1 min-w-0">
              <h1 className="ce-modal__title text-[20px] leading-[1.25] font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <div className="ce-modal__subtitle text-[13px] leading-relaxed text-muted-foreground">
                  {subtitle}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="ce-modal__close flex-shrink-0 -mr-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body content */}
          <div className="ce-modal__body__content flex-1 min-h-0 px-6 py-2 overflow-y-auto">
            {children}
          </div>

          {/* Optional footer */}
          {footer && (
            <div className="ce-modal__body__footer flex items-center justify-end gap-2 px-6 pt-3 pb-5 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
