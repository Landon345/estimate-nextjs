import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome to the EstiMate Web Application.</h1>
      <p className="mx-auto mt-4 max-w-xl text-muted">
        Plan tasks, log the hours you spend on them, and see how your estimates compare with reality.
      </p>
      <Suspense fallback={<div className="mt-8 h-10" />}>
        <GetStarted />
      </Suspense>
    </div>
  );
}

async function GetStarted() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-medium">Please log in or create an account to get started.</h2>
        <div className="flex justify-center gap-2">
          <ButtonLink href="/login" variant="secondary">
            Log In
          </ButtonLink>
          <ButtonLink href="/create-account">Create Account</ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-8 flex justify-center gap-2">
      <ButtonLink href="/tasks">My Tasks</ButtonLink>
      <ButtonLink href="/reports" variant="secondary">
        Reports
      </ButtonLink>
    </div>
  );
}
