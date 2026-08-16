export function deriveIssueTitle(description: string, category: string) {
  return description.split(/[.!?\n]/)[0].slice(0, 72) || category;
}

/*export function deriveIssueTitle(description: string, category?: string): string {
  const MAX = 72;
  const desc = String(description ?? "").trim();
  const categoryFallback = (category ?? "").trim() || "Signalement";
  if (!desc) return categoryFallback.slice(0, MAX);

  Take the first sentence or first line, trim and truncate.
  const first = desc.split(/[.!?\n]/)[0].trim();
  const title = first || categoryFallback;
  return title.slice(0, MAX);
}
*/