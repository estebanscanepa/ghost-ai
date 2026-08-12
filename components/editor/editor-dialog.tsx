"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface EditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Action buttons rendered in the dialog footer. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared dialog shell for the editor. Every dialog in the app composes this so
 * the overlay, radius, surface, and footer treatment stay consistent — concrete
 * dialogs supply only their title, description, body, and footer actions.
 */
export function EditorDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: EditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-5 rounded-3xl border border-surface-border bg-elevated p-5 text-copy-primary ring-0",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-copy-primary">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-copy-muted">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {children}

        {footer ? (
          <DialogFooter className="-mx-5 -mb-5 rounded-b-3xl border-surface-border bg-subtle/40 p-4">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
