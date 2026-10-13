"use client";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-page confirmation (native confirm() is blocked in some embeds and looks out of place). */
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" full onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" full onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[15px] leading-relaxed text-subtle">{message}</p>
    </BottomSheet>
  );
}
