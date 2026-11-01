"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/forms";

/**
 * A form wired to a server action that either redirects on success or returns
 * `{ errors }` to show above the fields. Submitting through startTransition
 * (rather than `<form action>`) keeps what the user typed when errors come back,
 * since React resets native form-action forms after every submit.
 */
export function ActionForm({
  action,
  children,
  className = "space-y-5",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {state?.errors && state.errors.length > 0 && (
        <div role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          <ul className="list-inside list-disc space-y-0.5">
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
