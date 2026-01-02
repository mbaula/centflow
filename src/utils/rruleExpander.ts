import { ScheduleEvent } from '@/types/ScheduleEvent';

/**
 * Expands a recurring event into individual instances based on RRULE
 * @param event The event with optional rrule
 * @param maxInstances Maximum number of instances to generate (default: 365 for daily, 52 for weekly)
 * @returns Array of expanded event instances
 */
export function expandRecurringEvent(event: ScheduleEvent, maxInstances: number = 365): ScheduleEvent[] {
  // If no rrule, return the event as-is
  if (!event.rrule) {
    return [event];
  }

  const rrule = event.rrule.toUpperCase();
  const instances: ScheduleEvent[] = [];

  // Parse the start date
  const parseLocalDateTime = (dateTimeStr: string): Date => {
    // Remove seconds and milliseconds if present (format: HH:mm:ss or HH:mm:ss.sss)
    // Only remove if there are at least 2 colons (HH:mm:ss), not just HH:mm
    const normalizedDateTimeStr = dateTimeStr.replace(/T(\d{2}:\d{2}):\d{2}(\.\d{3})?/, 'T$1');
    const [datePart, timePart] = normalizedDateTimeStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const timeComponents = (timePart || '00:00').split(':').map(Number);
    const [hours, minutes] = timeComponents;
    return new Date(year, month - 1, day, hours, minutes);
  };

  const startDate = parseLocalDateTime(event.start);
  const endDate = parseLocalDateTime(event.end);
  const duration = endDate.getTime() - startDate.getTime();

  // Format date as YYYY-MM-DDTHH:mm in local time
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Parse RRULE
  const parts = rrule.split(';');
  const freq = parts.find(p => p.startsWith('FREQ='))?.split('=')[1];
  const byday = parts.find(p => p.startsWith('BYDAY='))?.split('=')[1];
  const untilStr = parts.find(p => p.startsWith('UNTIL='))?.split('=')[1];

  // Parse UNTIL date (format: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ)
  let untilDate: Date | null = null;
  if (untilStr) {
    try {
      // Remove Z if present and parse YYYYMMDDTHHmmss
      const cleanUntil = untilStr.replace(/Z$/, '');
      if (cleanUntil.length >= 15) {
        const year = parseInt(cleanUntil.substring(0, 4));
        const month = parseInt(cleanUntil.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(cleanUntil.substring(6, 8));
        const hour = parseInt(cleanUntil.substring(9, 11));
        const minute = parseInt(cleanUntil.substring(11, 13));
        const second = cleanUntil.length >= 15 ? parseInt(cleanUntil.substring(13, 15)) : 0;
        untilDate = new Date(year, month, day, hour, minute, second);
      }
    } catch (e) {
      console.warn('Failed to parse UNTIL date:', untilStr);
    }
  }

  if (!freq) {
    // Unknown frequency, return original event
    return [event];
  }

  let currentDate = new Date(startDate);
  let count = 0;

  if (freq === 'DAILY') {
    // Daily recurrence
    for (let i = 0; i < maxInstances && count < maxInstances; i++) {
      // Check if we've exceeded the UNTIL date
      if (untilDate && currentDate > untilDate) {
        break;
      }

      const instanceStart = new Date(currentDate);
      const instanceEnd = new Date(instanceStart.getTime() + duration);

      instances.push({
        ...event,
        start: formatLocalDateTime(instanceStart),
        end: formatLocalDateTime(instanceEnd),
        // Remove rrule from expanded instances
        rrule: undefined,
      });

      currentDate.setDate(currentDate.getDate() + 1);
      count++;
    }
  } else if (freq === 'WEEKLY') {
    // Weekly recurrence
    const dayMap: { [key: string]: number } = {
      'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0
    };

    if (byday) {
      // Specific days of the week (e.g., BYDAY=TU,WE,TH,SA,SU)
      const targetDays = byday.split(',').map(d => dayMap[d.trim()]).filter(d => d !== undefined);
      
      if (targetDays.length === 0) {
        return [event];
      }

      // Start from the original start date
      let checkDate = new Date(startDate);
      const endCheckDate = untilDate || new Date(checkDate);
      if (!untilDate) {
        endCheckDate.setDate(endCheckDate.getDate() + (maxInstances * 7)); // Check up to maxInstances weeks ahead
      }

      while (checkDate <= endCheckDate && instances.length < maxInstances) {
        // Check if we've exceeded the UNTIL date
        if (untilDate && checkDate > untilDate) {
          break;
        }

        const dayOfWeek = checkDate.getDay();
        
        if (targetDays.includes(dayOfWeek)) {
          const instanceStart = new Date(checkDate);
          instanceStart.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
          const instanceEnd = new Date(instanceStart.getTime() + duration);

          instances.push({
            ...event,
            start: formatLocalDateTime(instanceStart),
            end: formatLocalDateTime(instanceEnd),
            rrule: undefined,
          });
        }

        checkDate.setDate(checkDate.getDate() + 1);
      }
    } else {
      // Weekly on the same day of week as start date
      for (let i = 0; i < maxInstances; i++) {
        // Check if we've exceeded the UNTIL date
        if (untilDate && currentDate > untilDate) {
          break;
        }

        const instanceStart = new Date(currentDate);
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        instances.push({
          ...event,
          start: formatLocalDateTime(instanceStart),
          end: formatLocalDateTime(instanceEnd),
          rrule: undefined,
        });

        currentDate.setDate(currentDate.getDate() + 7);
        count++;
      }
    }
  } else {
    // Unsupported frequency, return original event
    return [event];
  }

  return instances;
}

/**
 * Expands all recurring events in an array
 */
export function expandRecurringEvents(events: ScheduleEvent[], maxInstances: number = 365): ScheduleEvent[] {
  const expanded: ScheduleEvent[] = [];
  for (const event of events) {
    expanded.push(...expandRecurringEvent(event, maxInstances));
  }
  return expanded;
}

