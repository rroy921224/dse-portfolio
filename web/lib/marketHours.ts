/**
 * Client-side approximation of "is DSE open right now" — used only for
 * display purposes (showing a "Market Closed" badge), NOT for gating any
 * actual scraping logic (that lives server-side in worker/src/lib/marketHours.js).
 *
 * DSE trading hours: ~10:00am–2:30pm Bangladesh time (UTC+6), Sunday–Thursday.
 */
const BD_UTC_OFFSET_HOURS = 6;

export function isMarketOpen(date: Date = new Date()): boolean {
  const bdTime = toBangladeshTime(date);
  const day = bdTime.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const hours = bdTime.getUTCHours();
  const minutes = bdTime.getUTCMinutes();

  const isWeekend = day === 5 || day === 6; // Friday/Saturday
  if (isWeekend) return false;

  const minutesSinceMidnight = hours * 60 + minutes;
  const marketOpen = 10 * 60;
  const marketClose = 14 * 60 + 30;

  return (
    minutesSinceMidnight >= marketOpen && minutesSinceMidnight <= marketClose
  );
}

function toBangladeshTime(date: Date): Date {
  return new Date(date.getTime() + BD_UTC_OFFSET_HOURS * 60 * 60_000);
}

/** Human-readable "X ago" string for a timestamp, e.g. "3m ago", "1h 12m ago" */
export function timeAgo(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return "unknown";

  const ms = Date.now() - new Date(timestamp).getTime();
  if (ms < 0) return "just now";

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remMinutes}m ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
