"use client";

import { useActionState, useState } from "react";
import { resetPassword, type ResetState } from "@/app/actions/users";
import { Button } from "@/components/ui";

/** Admin "Reset password" for one user; shows the temporary password once. */
export function ResetPasswordButton({ userId, username }: { userId: number; username: string }) {
  const [state, reset, pending] = useActionState<ResetState>(() => resetPassword(userId), undefined);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <form
        action={reset}
        onSubmit={(event) => {
          if (!window.confirm(`Reset the password for ${username}? They'll be signed out everywhere.`)) {
            event.preventDefault();
          }
          setCopied(false);
        }}
      >
        <Button variant="warning" size="sm" disabled={pending}>
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </form>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state && "password" in state && (
        <div role="status" className="max-w-xs space-y-1.5 rounded-md bg-white px-3 py-2 text-left text-sm ring-1 ring-line">
          <p>
            Temporary password for <strong>{state.username}</strong>:
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-base select-all">{state.password}</code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(state.password);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted">
            Give it to them privately. It won&apos;t be shown again, and they&apos;ll choose a new password when they log in.
          </p>
        </div>
      )}
    </div>
  );
}
