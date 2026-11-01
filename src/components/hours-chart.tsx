"use client";

import { useState } from "react";

export type HoursPoint = { date: string; hours: number; marker?: string };

/** A clean axis maximum (1, 2, 5 × 10ⁿ) at or above the largest value. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= value)!;
  return step * magnitude;
}

/**
 * Hours worked per day: one bar per date, from the task's start date through
 * its estimated end date. Replaces the Chart.js bar chart on the hours page.
 */
export function HoursChart({ points }: { points: HoursPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.hours)));
  // Hours are whole numbers, so skip the midpoint tick when it would be fractional.
  const ticks = Number.isInteger(max / 2) ? [max, max / 2, 0] : [max, 0];

  return (
    <figure>
      <figcaption className="mb-4 text-sm font-semibold">Hours worked</figcaption>
      <div className="flex gap-2">
        {/* y-axis */}
        <div className="flex h-56 flex-col justify-between pb-0 text-right text-xs tabular-nums text-muted">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 last:translate-y-1/2">
              {t}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative h-56" style={{ minWidth: points.length * 40 }}>
            {/* gridlines */}
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-slate-200" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end">
              {points.map((p, i) => (
                <div
                  key={p.date}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  tabIndex={0}
                  aria-label={`${p.date}: ${p.hours} hours`}
                >
                  <div
                    className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${
                      active !== null && active !== i ? "opacity-50" : ""
                    } bg-brand`}
                    style={{ height: `${(p.hours / max) * 100}%` }}
                  />
                  {active === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-nav px-2.5 py-1.5 text-xs text-white shadow-lg">
                      <div className="font-semibold">{p.date}</div>
                      <div>
                        {p.hours} {p.hours === 1 ? "hour" : "hours"}
                        {p.marker ? ` · ${p.marker}` : ""}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* x-axis labels */}
          <div className="flex border-t border-slate-300 pt-1.5" style={{ minWidth: points.length * 40 }}>
            {points.map((p) => (
              <div key={p.date} className="flex-1 text-center text-[11px] leading-tight text-muted">
                {p.date.slice(0, 5)}
                {p.marker && <div className="font-semibold text-ink">{p.marker}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
