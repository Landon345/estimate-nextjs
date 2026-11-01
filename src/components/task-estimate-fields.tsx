"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { suggestEstimate, type EstimateSuggestion } from "@/app/actions/ai";
import { Button, Field, Input } from "@/components/ui";
import { calibrateFor, type TaskOutcome } from "@/lib/estimation";
import { MAX_TAGS, normalizeTag } from "@/lib/tag-names";

type Defaults = {
  estimatedHours?: number;
  lowHours?: number | null;
  highHours?: number | null;
  tags?: string[];
};

/**
 * The estimate half of the add/edit task forms: tags, hours, the optional 80%
 * range, a hint built from the user's completed tasks, and (when configured)
 * an AI-suggested estimate. Posts as `tags`, `estimatedHours`, `lowHours` and
 * `highHours`.
 */
export function TaskEstimateFields({
  defaults = {},
  knownTags,
  outcomes,
  aiEnabled,
}: {
  defaults?: Defaults;
  knownTags: string[];
  outcomes: TaskOutcome[];
  aiEnabled: boolean;
}) {
  const [tags, setTags] = useState<string[]>(defaults.tags ?? []);
  const [hours, setHours] = useState(defaults.estimatedHours?.toString() ?? "");
  const [low, setLow] = useState(defaults.lowHours?.toString() ?? "");
  const [high, setHigh] = useState(defaults.highHours?.toString() ?? "");

  const setEstimate = (s: { estimatedHours: number; lowHours?: number; highHours?: number }) => {
    setHours(String(s.estimatedHours));
    if (s.lowHours !== undefined) setLow(String(s.lowHours));
    if (s.highHours !== undefined) setHigh(String(s.highHours));
  };

  return (
    <>
      <TagPicker tags={tags} onChange={setTags} knownTags={knownTags} />

      <Field label="Estimated Hours *" htmlFor="estimatedHours">
        <Input
          id="estimatedHours"
          name="estimatedHours"
          type="number"
          min={1}
          required
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
      </Field>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">
          80% range <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p className="text-xs text-muted">You&apos;re fairly sure the real hours will land between these.</p>
        <div className="flex items-center gap-2">
          <Input name="lowHours" type="number" min={1} placeholder="Low" aria-label="Low end of range" value={low} onChange={(e) => setLow(e.target.value)} />
          <span className="text-muted">to</span>
          <Input name="highHours" type="number" min={1} placeholder="High" aria-label="High end of range" value={high} onChange={(e) => setHigh(e.target.value)} />
        </div>
      </fieldset>

      <HistoryHint outcomes={outcomes} tags={tags} hours={Number(hours)} onApply={(h) => setEstimate({ estimatedHours: h })} />

      {aiEnabled && <AiSuggestion tags={tags} onApply={setEstimate} />}
    </>
  );
}

function TagPicker({ tags, onChange, knownTags }: { tags: string[]; onChange: (tags: string[]) => void; knownTags: string[] }) {
  const [draft, setDraft] = useState("");
  const full = tags.length >= MAX_TAGS;

  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag) && !full) onChange([...tags, tag]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter would otherwise submit the whole task form.
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const suggestions = knownTags.filter((t) => !tags.includes(t)).slice(0, 12);

  return (
    <Field label="Tags" htmlFor="tag-input">
      {tags.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-0.5 pl-2.5 pr-1 text-xs font-semibold text-brand">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="grid size-4 place-items-center rounded-full hover:bg-brand/15"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="tag-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          disabled={full}
          placeholder={full ? `Up to ${MAX_TAGS} tags` : tags.length ? "" : "e.g. coding, writing"}
          className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
      {suggestions.length > 0 && !full && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => add(tag)}
              className="rounded-full px-2 py-0.5 text-xs text-muted ring-1 ring-line hover:bg-slate-50 hover:text-ink"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

/** "Work usually takes 1.3× your estimate, so 10h likely means about 13h." */
function HistoryHint({
  outcomes,
  tags,
  hours,
  onApply,
}: {
  outcomes: TaskOutcome[];
  tags: string[];
  hours: number;
  onApply: (hours: number) => void;
}) {
  if (outcomes.length === 0) return null;
  const cal = calibrateFor(outcomes, tags);
  const basis = cal.scope.length
    ? `your ${cal.sampleSize} completed tasks tagged ${cal.scope.join(" or ")}`
    : `your ${cal.sampleSize} completed task${cal.sampleSize === 1 ? "" : "s"}`;

  if (cal.hoursFactor === null && cal.daysFactor === null) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-muted ring-1 ring-line">
        Complete a few more tasks and EstiMate will show how your estimates usually compare with reality.
      </p>
    );
  }

  const factor = cal.hoursFactor;
  const adjusted = factor !== null && hours > 0 ? Math.max(1, Math.round(hours * factor)) : null;
  const rangePct = cal.rangeTotal > 0 ? Math.round((cal.rangeHits / cal.rangeTotal) * 100) : null;

  return (
    <div className="space-y-1.5 rounded-md bg-brand-soft/60 px-3 py-2.5 text-sm ring-1 ring-brand/15" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">Based on {basis}</p>
      {factor !== null && (
        <p>
          {Math.abs(factor - 1) < 0.1 ? (
            <>Your hour estimates are usually close ({factor}×).</>
          ) : (
            <>
              Work usually takes <strong>{factor}×</strong> your estimate
              {adjusted !== null && adjusted !== hours ? (
                <>
                  , so {hours}h likely means about <strong>{adjusted}h</strong>.{" "}
                  <button type="button" onClick={() => onApply(adjusted)} className="font-medium text-brand underline">
                    Use {adjusted}h
                  </button>
                </>
              ) : (
                "."
              )}
            </>
          )}
        </p>
      )}
      {cal.daysFactor !== null && Math.abs(cal.daysFactor - 1) >= 0.1 && (
        <p>
          Tasks {cal.daysFactor > 1 ? "run" : "finish in"} <strong>{cal.daysFactor}×</strong> the time you plan, so keep that in mind for the end date.
        </p>
      )}
      {rangePct !== null && (
        <p>
          Your ranges caught the real hours {cal.rangeHits} of {cal.rangeTotal} times ({rangePct}%).{" "}
          {rangePct < 70 ? "For 80% confidence, make them wider." : rangePct > 90 ? "You could make them narrower." : "Nicely calibrated."}
        </p>
      )}
    </div>
  );
}

function AiSuggestion({ tags, onApply }: { tags: string[]; onApply: (s: EstimateSuggestion) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ suggestion?: EstimateSuggestion; error?: string } | null>(null);

  const ask = () => {
    const form = ref.current?.closest("form");
    // By name, not form.elements: the date pickers' buttons share their field's id.
    const value = (field: string) => form?.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.value ?? "";
    startTransition(async () => {
      setResult(
        await suggestEstimate({
          name: value("name"),
          tags,
          startDate: value("startDate") || undefined,
          estEndDate: value("estEndDate") || undefined,
        }),
      );
    });
  };

  return (
    <div ref={ref} className="space-y-2">
      <Button type="button" variant="secondary" className="w-full" onClick={ask} disabled={pending}>
        {pending ? "Asking Claude…" : "✨ Suggest an estimate"}
      </Button>
      {result?.error && (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      )}
      {result?.suggestion && (
        <div className="space-y-2 rounded-md bg-white px-3 py-2.5 text-sm ring-1 ring-line" aria-live="polite">
          <p>
            <strong>{result.suggestion.estimatedHours}h</strong>{" "}
            <span className="text-muted">
              (80% range {result.suggestion.lowHours}–{result.suggestion.highHours}h)
            </span>
          </p>
          <p className="text-muted">{result.suggestion.rationale}</p>
          <Button type="button" size="sm" onClick={() => onApply(result.suggestion!)}>
            Use these numbers
          </Button>
        </div>
      )}
    </div>
  );
}
