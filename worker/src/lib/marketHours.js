/**
 * DSE trading hours: roughly 10:00 AM to 2:30 PM, Sunday–Thursday
 * (Bangladesh's work week — weekend is Friday/Saturday), excluding
 * public holidays. This does NOT account for holidays yet — that
 * requires a holiday calendar, which you can add later (e.g. a small
 * hardcoded list of dates per year, refreshed annually).
 *
 * All checks are done in Bangladesh Standard Time (UTC+6), regardless
 * of what timezone the server running this worker is in.
 */

const BD_UTC_OFFSET_HOURS = 6;

export function isMarketOpen(date = new Date()) {
  const bdTime = toBangladeshTime(date);
  const day = bdTime.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const hours = bdTime.getUTCHours();
  const minutes = bdTime.getUTCMinutes();

  // Bangladesh weekend is Friday (5) and Saturday (6)
  const isWeekend = day === 5 || day === 6;
  if (isWeekend) return false;

  const minutesSinceMidnight = hours * 60 + minutes;
  const marketOpen = 10 * 60; // 10:00 AM
  const marketClose = 14 * 60 + 30; // 2:30 PM

  return (
    minutesSinceMidnight >= marketOpen && minutesSinceMidnight <= marketClose
  );
}

function toBangladeshTime(date) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  return new Date(utcMs + BD_UTC_OFFSET_HOURS * 60 * 60_000);
}
