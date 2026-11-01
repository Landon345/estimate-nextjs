import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Small set of styled primitives standing in for the Bootstrap classes the
// Tapestry templates used (btn-*, card, table-striped, badge).

type Variant = "primary" | "secondary" | "success" | "danger" | "warning" | "ghost" | "inverse";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-white text-ink ring-1 ring-line hover:bg-slate-50",
  success: "bg-success text-white hover:brightness-110",
  danger: "bg-danger text-white hover:brightness-110",
  warning: "bg-warning-soft text-warning ring-1 ring-amber-300 hover:bg-amber-100",
  ghost: "text-brand hover:bg-brand-soft",
  /** Outline button for the dark header. */
  inverse: "text-white ring-1 ring-white/40 hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition disabled:opacity-60 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="flex flex-wrap items-end gap-2">{children}</div>}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl bg-white/95 shadow-sm ring-1 ring-line ${className}`}>{children}</div>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card className="px-6 py-12 text-center text-muted">
      <p>{children}</p>
    </Card>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25 ${props.className ?? ""}`}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-sm font-semibold text-brand">{hint}</p>}
      {children}
    </div>
  );
}

/** A narrow centred card for single-purpose forms (add task, log in, ...). */
export function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="p-6 sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </Card>
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&>tr:nth-child(even)]:bg-slate-50/60">{children}</tbody>
      </table>
    </Card>
  );
}

export function Td({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

type Tone = "neutral" | "success" | "danger" | "warning" | "info" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Fallback shown while a page's data streams in. */
export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-white/70" />
      ))}
    </div>
  );
}
