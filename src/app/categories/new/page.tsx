import type { Metadata } from "next";
import { createCategory } from "@/app/actions/calibration";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Field, FormCard, Input, Textarea } from "@/components/ui";

export const metadata: Metadata = { title: "New Category" };

// The action re-checks the admin role, so the static form needs no session read.
export default function NewCategoryPage() {
  return (
    <FormCard title="New Category">
      <ActionForm action={createCategory}>
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" maxLength={128} required />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" rows={3} maxLength={2048} required />
        </Field>
        <div className="grid gap-2 pt-2">
          <Button type="submit">Create New Category</Button>
          <ButtonLink href="/categories" variant="secondary">
            Go Back
          </ButtonLink>
        </div>
      </ActionForm>
    </FormCard>
  );
}
