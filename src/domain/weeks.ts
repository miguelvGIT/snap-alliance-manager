const WEEK = 604800000;
export function weekBounds(at: Date | string | number = new Date()) {
  const d = new Date(at);
  const day = d.getUTCDay();
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((day + 5) % 7), 19),
  );
  if (start.getTime() > d.getTime()) start.setTime(start.getTime() - WEEK);
  return {
    id: start.toISOString(),
    start: start.toISOString(),
    end: new Date(start.getTime() + WEEK).toISOString(),
  };
}
export function shiftWeek(start: string, amount: number) {
  return weekBounds(Date.parse(start) + amount * WEEK);
}
export function weekLabel(
  week: { start: string; end: string },
  locale = typeof navigator === 'undefined' ? 'pt-PT' : navigator.language,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone,
  });
  return formatter.format(new Date(week.start)) + ' - ' + formatter.format(new Date(week.end));
}
export function dateTime(
  at: string,
  locale = typeof navigator === 'undefined' ? 'pt-PT' : navigator.language,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(at));
}
export function nextReset(at: Date | string | number = new Date()) {
  return weekBounds(at).end;
}
export function toLocalInput(at: string) {
  const date = new Date(at);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function fromLocalInput(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid date and time.');
  return date.toISOString();
}
