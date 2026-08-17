"use client";

import { Check, Copy, LoaderCircle, User, Users, X } from "lucide-react";

import { DialogError } from "@/components/editor/dialogs/dialog-error";
import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CollaboratorResponse } from "@/types/collaborator";

const FORM_ID = "invite-collaborator-form";

interface ShareProjectDialogProps {
  open: boolean;
  projectName: string;
  /**
   * True only for the project owner. It gates the invite form, the remove
   * buttons, and the copy-link action — a collaborator sees the list and
   * nothing else. Presentation only: the API re-checks ownership on every
   * invite and removal.
   */
  canManage: boolean;
  collaborators: CollaboratorResponse[];
  isLoading: boolean;
  loadError: string | null;
  email: string;
  canInvite: boolean;
  isInviting: boolean;
  inviteError: string | null;
  removingId: string | null;
  removeError: string | null;
  isLinkCopied: boolean;
  copyError: string | null;
  onEmailChange: (email: string) => void;
  onOpenChange: (open: boolean) => void;
  onInvite: () => void;
  onRemove: (collaboratorId: string) => void;
  onCopyLink: () => void;
}

/**
 * Clerk serves avatars from its own CDN, and the URL for a user with no
 * uploaded image is a generated one. Rendering it through `next/image` would
 * mean allow-listing a third-party host and paying an optimizer round trip for
 * a 32px image, so this stays a plain `<img>`. `alt` is empty on purpose: the
 * name or email sits immediately beside it, so the avatar is decorative.
 */
function CollaboratorAvatar({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        width={32}
        height={32}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-surface-border bg-subtle text-copy-muted">
      <User className="h-4 w-4" />
    </span>
  );
}

interface CollaboratorRowProps {
  collaborator: CollaboratorResponse;
  canManage: boolean;
  /** True for the row whose removal is in flight. */
  isRemoving: boolean;
  /** True while any removal is in flight, so a second one cannot be started. */
  isRemoveBusy: boolean;
  onRemove: (collaboratorId: string) => void;
}

/**
 * One collaborator. The email is the identity that grants access, so it is
 * always shown: as the label when Clerk had no account for it, and as the
 * secondary line when it did.
 */
function CollaboratorRow({
  collaborator,
  canManage,
  isRemoving,
  isRemoveBusy,
  onRemove,
}: CollaboratorRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-subtle">
      <CollaboratorAvatar imageUrl={collaborator.imageUrl} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-copy-primary">
          {collaborator.name ?? collaborator.email}
        </p>
        {collaborator.name ? (
          <p className="truncate text-xs text-copy-muted">
            {collaborator.email}
          </p>
        ) : null}
      </div>

      {canManage ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(collaborator.id)}
          disabled={isRemoveBusy}
          aria-label={`Remove ${collaborator.email}`}
        >
          {isRemoving ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-copy-muted" />
          ) : (
            <X className="h-3.5 w-3.5 text-copy-muted" />
          )}
        </Button>
      ) : null}
    </li>
  );
}

/**
 * Invites people to a project and shows who already has access.
 *
 * Presentational, like every other dialog here: each value and callback comes
 * from `useShareDialog()`. The owner/collaborator split is a single `canManage`
 * flag rather than two dialogs, because the collaborator list is the same view
 * either way — an owner just gets the actions on it.
 */
export function ShareProjectDialog({
  open,
  projectName,
  canManage,
  collaborators,
  isLoading,
  loadError,
  email,
  canInvite,
  isInviting,
  inviteError,
  removingId,
  removeError,
  isLinkCopied,
  copyError,
  onEmailChange,
  onOpenChange,
  onInvite,
  onRemove,
  onCopyLink,
}: ShareProjectDialogProps) {
  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share project"
      description={
        canManage
          ? `Invite people to collaborate on ${projectName}.`
          : `${projectName} was shared with you. Only the owner can manage access.`
      }
      footer={
        <>
          {canManage ? (
            <div className="flex items-center gap-2 sm:mr-auto">
              <Button variant="outline" size="lg" onClick={onCopyLink}>
                {isLinkCopied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {isLinkCopied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          ) : null}

          <Button size="lg" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {canManage ? (
          <form
            id={FORM_ID}
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onInvite();
            }}
          >
            <label
              htmlFor="invite-collaborator-email"
              className="text-xs font-medium text-copy-secondary"
            >
              Invite by email
            </label>

            <div className="flex items-center gap-2">
              <Input
                id="invite-collaborator-email"
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="teammate@company.com"
                autoComplete="off"
                disabled={isInviting}
                className="min-w-0 flex-1"
              />
              {/* `form` is redundant while the button sits inside the form, but
                  it keeps the submit wired if this ever moves to the footer the
                  way the create dialog's does. */}
              <Button
                type="submit"
                form={FORM_ID}
                size="lg"
                disabled={!canInvite}
              >
                {isInviting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Invite
              </Button>
            </div>

            <DialogError message={inviteError} />
          </form>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-copy-secondary">
            People with access
          </p>

          {isLoading ? (
            <p className="flex items-center gap-2 px-2 py-6 text-sm text-copy-muted">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading collaborators…
            </p>
          ) : loadError ? (
            <DialogError message={loadError} />
          ) : collaborators.length > 0 ? (
            <ul className="-mx-2 flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {collaborators.map((collaborator) => (
                <CollaboratorRow
                  key={collaborator.id}
                  collaborator={collaborator}
                  canManage={canManage}
                  isRemoving={removingId === collaborator.id}
                  isRemoveBusy={removingId !== null}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <span className="text-copy-faint">
                <Users className="h-8 w-8" />
              </span>
              <p className="text-sm font-medium text-copy-secondary">
                No collaborators yet
              </p>
              <p className="text-xs text-copy-muted">
                {canManage
                  ? "Invite someone by email to give them access."
                  : "Only the owner has access to this project so far."}
              </p>
            </div>
          )}

          <DialogError message={removeError} />
          <DialogError message={copyError} />
        </div>
      </div>
    </EditorDialog>
  );
}
