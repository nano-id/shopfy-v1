/** Max GraphQL pages per resource during manual/initial sync (cap 50). */
export function getSyncMaxPages(): number {
  const raw = process.env.SYNC_MAX_PAGES;
  if (!raw) return 5;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 5;
  return Math.min(parsed, 50);
}
