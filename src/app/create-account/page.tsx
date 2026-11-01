import type { Metadata } from "next";
import { createAccount } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Field, FormCard, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Create Account" };

export default function CreateAccountPage() {
  return (
    <FormCard title="Create Account">
      <ActionForm action={createAccount}>
        <Field label="Username (Email)" htmlFor="username">
          <Input id="username" name="username" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
          <p className="text-xs text-muted">
            At least 10 characters, with an uppercase letter, a lowercase letter, a number, and one of ! @ # $ % ^ &amp; *
          </p>
        </Field>
        <div className="grid gap-2">
          <Button type="submit">Create Account</Button>
          <ButtonLink href="/" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </ActionForm>
    </FormCard>
  );
}
