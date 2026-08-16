"use client";

interface DialogErrorProps {
  /** The message from the API's error envelope, or `null` when the last submit succeeded. */
  message: string | null;
}

/**
 * Where a failed mutation surfaces. The dialog stays open when a request comes
 * back `400`/`403`/`404`/`409`, so the user sees why and can correct it instead
 * of watching the action silently do nothing.
 */
export function DialogError({ message }: DialogErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs text-error"
    >
      {message}
    </p>
  );
}
