"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Shows the `?notice=` message a server action redirected with (the Tapestry
 * AlertManager's job), then drops it from the URL so a refresh won't repeat it.
 */
export function Notice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const incoming = searchParams.get("notice");
  const [message, setMessage] = useState<string | null>(null);

  // Keep the message after the effect below strips it from the URL.
  if (incoming && incoming !== message) setMessage(incoming);

  useEffect(() => {
    if (!incoming) return;
    const rest = new URLSearchParams(searchParams);
    rest.delete("notice");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [incoming, pathname, router, searchParams]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="mb-6 flex items-start justify-between gap-4 rounded-lg bg-success-soft px-4 py-3 text-sm text-success ring-1 ring-success/20"
    >
      <span>{message}</span>
      <button type="button" onClick={() => setMessage(null)} className="font-semibold" aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
