import type { Metadata } from "next";
import { login } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Field, FormCard, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Log In" };

export default function LoginPage() {
  return (
    <FormCard title="Log In">
      <ActionForm action={login}>
        <Field label="Username" htmlFor="username">
          <Input id="username" name="username" autoComplete="username" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="rememberMe" className="size-4 accent-brand" /> Remember me
        </label>
        <div className="grid gap-2">
          <Button type="submit">Log In</Button>
          <ButtonLink href="/" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </ActionForm>
    </FormCard>
  );
}
