import { backupSchema, type Dataset } from './model';
export function exportBackup(dataset: Dataset) {
  return JSON.stringify(
    {
      kind: 'snap-alliance-backup',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      dataset,
    },
    null,
    2,
  );
}
export function readBackup(text: string) {
  const result = backupSchema.safeParse(JSON.parse(text));
  if (!result.success)
    throw new Error('Invalid file or unsupported version. Your current data has not been changed.');
  return result.data;
}
export function calendarFile(leadMinutes: number, reset: string) {
  if (!Number.isInteger(leadMinutes) || leadMinutes < 1 || leadMinutes > 10079)
    throw new Error('Choose between 1 and 10,079 minutes.');
  const compact = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alliance//Weekly reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:weekly-reset@alianca.local',
    'DTSTAMP:' + compact(new Date().toISOString()),
    'DTSTART:' + compact(reset),
    'DURATION:PT1M',
    'RRULE:FREQ=WEEKLY;BYDAY=TU',
    'SUMMARY:Record Marvel Snap alliance scores',
    'DESCRIPTION:Save the points table before the weekly reset.',
    'BEGIN:VALARM',
    'TRIGGER:-PT' + leadMinutes + 'M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Record alliance scores before the weekly reset',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
export function downloadText(text: string, name: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
