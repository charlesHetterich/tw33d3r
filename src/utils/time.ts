export function formatTime(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const now = Math.floor(Date.now() / 1000);
  const delta = now - unixSeconds;
  if (delta < 60) return `${delta}s`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  const d = new Date(unixSeconds * 1000);
  if (delta < 604800) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
