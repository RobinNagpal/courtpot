const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Local wall-clock, the shape the match form edits: "2026-08-16 14:30". */
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Today as a local calendar day, YYYY-MM-DD. */
export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toLocalDateTimeText(at: Date): string {
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(
    at.getMinutes(),
  )}`;
}

/** What the form's "Now" button fills in. */
export function nowLocalDateTimeText(): string {
  return toLocalDateTimeText(new Date());
}

export function isoToLocalDateTimeText(iso: string): string {
  return toLocalDateTimeText(new Date(iso));
}

/**
 * The form's local wall-clock text as a UTC instant, or null if it is not one.
 * Matches are stored as instants, so this is where the device's zone is applied.
 */
export function localDateTimeTextToIso(text: string): string | null {
  const parts = LOCAL_DATE_TIME.exec(text.trim());
  if (parts === null) {
    return null;
  }
  const [, year, month, day, hour, minute] = parts;
  const at = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  // Every field has to survive the trip. `new Date` silently rolls anything out
  // of range forward — month 13 becomes next January, minute 99 becomes the next
  // hour — so reading each one back is the only way to reject it. This also
  // catches a local time that does not exist, such as an hour skipped by a
  // daylight-saving jump, which Date moves rather than refuses.
  const rolled =
    at.getFullYear() !== Number(year) ||
    at.getMonth() !== Number(month) - 1 ||
    at.getDate() !== Number(day) ||
    at.getHours() !== Number(hour) ||
    at.getMinutes() !== Number(minute);
  if (Number.isNaN(at.getTime()) || rolled) {
    return null;
  }
  return at.toISOString();
}

/** A stored instant read back in the device's zone: "16 Aug 2026, 14:30". */
export function formatDateTime(iso: string): string {
  const at = new Date(iso);
  // An unreadable instant is exactly where a dash beats "NaN NaN, NaN:NaN".
  if (Number.isNaN(at.getTime())) {
    return "—";
  }
  const month = MONTHS[at.getMonth()] ?? "";
  return `${at.getDate()} ${month} ${at.getFullYear()}, ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/**
 * Local midnight this morning as a UTC instant, for "played today".
 *
 * The day is the device's, not UTC's: a 9pm match in UTC-5 is today for the
 * person who played it even though it is already tomorrow in UTC.
 */
export function startOfTodayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}
