import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { NavLinks } from "@/components/nav-links";
import { buttonClass } from "@/components/ui";

export function Header() {
  return (
    <header className="bg-nav text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <Link href="/" className="shrink-0">
          <Image src="/logo.png" alt="EstiMate home" width={70} height={50} priority />
        </Link>
        {/* The nav depends on who is signed in, so it streams in after the shell. */}
        <Suspense fallback={<div className="ml-auto h-9" />}>
          <HeaderNav />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="ml-auto flex gap-2">
        <Link href="/login" className={buttonClass("inverse", "sm")}>
          Log In
        </Link>
        <Link href="/create-account" className={buttonClass("primary", "sm")}>
          Create Account
        </Link>
      </div>
    );
  }

  const links = [
    { href: "/tasks", label: "Tasks" },
    { href: "/reports", label: "Reports" },
    { href: "/events", label: "Events" },
    { href: "/estimation", label: "Calibration" },
    ...(user.isAdmin ? [{ href: "/categories", label: "Categories" }] : []),
  ];

  return (
    <>
      <nav className="flex flex-1 flex-wrap items-center gap-1">
        <NavLinks links={links} />
      </nav>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-400 sm:inline">{user.username}</span>
        <form action={logout}>
          <button className={buttonClass("inverse", "sm")}>
            Log Out
          </button>
        </form>
      </div>
    </>
  );
}
