import { TaskEstimateFields } from "@/components/task-estimate-fields";
import { LoadingRows } from "@/components/ui";
import { aiEnabled } from "@/lib/ai";
import { loadOutcomes, userTagNames } from "@/lib/tasks";

/**
 * Loads what the estimate fields need from the task owner's history. Render it
 * inside a Suspense boundary; `EstimateFieldsFallback` is the matching fallback.
 */
export async function TaskEstimateSection({
  userId,
  defaults,
}: {
  userId: number;
  defaults?: Parameters<typeof TaskEstimateFields>[0]["defaults"];
}) {
  const [knownTags, outcomes] = await Promise.all([userTagNames(userId), loadOutcomes(userId)]);
  return <TaskEstimateFields defaults={defaults} knownTags={knownTags} outcomes={outcomes} aiEnabled={aiEnabled()} />;
}

export function EstimateFieldsFallback() {
  return <LoadingRows rows={2} />;
}
