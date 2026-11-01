import type { Metadata } from "next";
import { Suspense } from "react";
import { changePassword } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, ButtonLink, Field, FormCard, Input, LoadingRows } from "@/components/ui";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <FormCard title="Account">
      <Suspense fallback={<LoadingRows rows={3} />}>
        <AccountForm />
      </Suspense>
    </FormCard>
  );
}

async function AccountForm() {
  // Not requireUser: a user with a temporary password is sent here and must get in.
  const user = await requireSession();
  const forced = user.mustChangePassword;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="font-medium">{user.username}</p>
        <div className="flex flex-wrap justify-center gap-1">
          {user.roles.map((role) => (
            <Badge key={role} tone={role === "admin" ? "brand" : "neutral"}>
              {role}
            </Badge>
          ))}
        </div>
      </div>

      {forced && (
        <p role="status" className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
          An admin reset your password. Enter the temporary password they gave you, then choose a new one.
        </p>
      )}

      <ActionForm action={changePassword}>
        <h2 className="text-lg font-semibold">Change password</h2>
        <Field label={forced ? "Temporary password" : "Current password"} htmlFor="currentPassword">
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password" htmlFor="newPassword">
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" maxLength={60} required />
        </Field>
        <p className="-mt-3 text-xs text-muted">
          At least 10 characters, with an uppercase letter, a lowercase letter, a number and one of ! @ # $ % ^ &amp; *.
        </p>
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" maxLength={60} required />
        </Field>
        <div className="grid gap-2 pt-2">
          <Button type="submit">Change Password</Button>
          {!forced && (
            <ButtonLink href="/" variant="secondary">
              Go Back
            </ButtonLink>
          )}
        </div>
      </ActionForm>
    </div>
  );
}
