import { Event } from '@/types/Event';

const UW_DAY_TOKEN_RE = /Th|Sa|Su|M|W|F|T/g;

const UW_DAY_NAMES: Record<string, string> = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  Th: 'Thursday',
  F: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

const DAYS_TIME_RE =
  /^((?:Th|Sa|Su|M|W|F|T)+)\s+(\d{1,2}:\d{2}(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}(?:AM|PM))$/i;

const DATE_RANGE_RE = /^(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})$/;

const COURSE_HEADER_RE = /^([A-Z]{2,5}\s+\d+[A-Z]?)\s*-\s*(.+)$/;

const CLASS_NBR_RE = /^\d{4}$/;
const SECTION_RE = /^\d{3}$/;
const COMPONENT_RE = /^[A-Z]{2,4}$/;

const TABLE_HEADER_RE = /Class Nbr\s+Section\s+Component\s+Days\s*&\s*Times/i;

type RowMeta = { classNbr: string; section: string; component: string };

function parseDateRangeMmDdYyyy(dateStr: string): { start: Date; end: Date } {
  const [startRaw, endRaw] = dateStr.split(' - ').map((s) => s.trim());
  // Use local calendar date (noon) — ISO `YYYY-MM-DD` parses as UTC midnight and shifts the
  // civil day in America/Toronto, breaking getDay() / single-day lab export to Google Calendar.
  const toLocalDateNoon = (part: string) => {
    const [month, day, year] = part.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };
  return { start: toLocalDateNoon(startRaw), end: toLocalDateNoon(endRaw) };
}

function expandUwDayCodes(dayCodes: string): string[] {
  const tokens = dayCodes.match(UW_DAY_TOKEN_RE) || [];
  const names = tokens.map((t) => UW_DAY_NAMES[t]).filter(Boolean);
  return Array.from(new Set(names));
}

function normalizeInstructor(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses Quest "My Class Schedule" plain-text (List View) exports from UW.
 */
export function parseUwQuestSchedule(raw: string): Event[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const events: Event[] = [];

  let courseCode = '';
  let courseTitle = '';
  let rowMeta: RowMeta | null = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    const courseMatch = line.match(COURSE_HEADER_RE);
    if (courseMatch) {
      courseCode = courseMatch[1].trim();
      courseTitle = courseMatch[2].trim();
      rowMeta = null;
      i += 1;
      continue;
    }

    if (TABLE_HEADER_RE.test(line)) {
      rowMeta = null;
      i += 1;
      continue;
    }

    if (!courseCode) {
      i += 1;
      continue;
    }

    if (CLASS_NBR_RE.test(line)) {
      const classNbr = line;
      const sectionLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const componentLine = i + 2 < lines.length ? lines[i + 2].trim() : '';

      if (SECTION_RE.test(sectionLine) && COMPONENT_RE.test(componentLine)) {
        rowMeta = { classNbr, section: sectionLine, component: componentLine };
        i += 3;
        continue;
      }
    }

    if (rowMeta && DAYS_TIME_RE.test(line)) {
      const m = line.match(DAYS_TIME_RE)!;
      const dayCodes = m[1];
      const startTime = m[2];
      const endTime = m[3];
      i += 1;

      while (i < lines.length && !lines[i].trim()) {
        i += 1;
      }
      if (i >= lines.length) {
        break;
      }

      const room = lines[i].trim();
      i += 1;

      const instructorParts: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (!l) {
          i += 1;
          continue;
        }
        if (DATE_RANGE_RE.test(l)) {
          const dateRange = parseDateRangeMmDdYyyy(l);
          const days = expandUwDayCodes(dayCodes);
          if (days.length === 0) {
            i += 1;
            break;
          }

          events.push({
            courseCode,
            courseName: courseTitle,
            meetingTime: {
              type: rowMeta.component,
              startTime,
              endTime,
              days,
              location: room,
              dateRange,
              instructor: normalizeInstructor(instructorParts),
            },
            rawText: `${courseCode} | ${rowMeta.classNbr}-${rowMeta.section} | ${rowMeta.component} | ${line}`,
          });
          i += 1;
          break;
        }

        if (CLASS_NBR_RE.test(l) && instructorParts.length === 0 && room) {
          break;
        }

        if (DAYS_TIME_RE.test(l) && instructorParts.length === 0) {
          break;
        }

        instructorParts.push(l);
        i += 1;
      }

      continue;
    }

    i += 1;
  }

  return events;
}
