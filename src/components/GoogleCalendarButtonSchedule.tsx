import { useGoogleLogin } from '@react-oauth/google';
import { ScheduleEvent } from '@/types/ScheduleEvent';
import { toast } from 'react-toastify';
import axios from 'axios';

interface GoogleCalendarButtonScheduleProps {
  events: ScheduleEvent[];
  timezone: string;
}

const CALENDAR_COLORS = [
  '1', // Lavender
  '2', // Sage
  '3', // Grape
  '4', // Flamingo
  '5', // Banana
  '6', // Tangerine
  '7', // Peacock
  '8', // Graphite
  '9', // Blueberry
  '10', // Basil
  '11' // Tomato
];

const GoogleCalendarButtonSchedule: React.FC<GoogleCalendarButtonScheduleProps> = ({ events, timezone }) => {
  const findOrCreateCalendar = async (accessToken: string) => {
    try {
      // First, try to find an existing calendar
      const listResponse = await axios.get(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const existingCalendar = listResponse.data.items.find(
        (cal: any) => cal.summary === 'Centflow Schedule'
      );

      if (existingCalendar) {
        return existingCalendar.id;
      }

      // If not found, create a new one
      const createResponse = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars',
        {
          summary: 'Centflow Schedule',
          description: 'Schedule imported via Centflow'
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return createResponse.data.id;
    } catch (error) {
      console.error('Error finding or creating calendar:', error);
      throw error;
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const calendarId = await findOrCreateCalendar(tokenResponse.access_token);
        let addedCount = 0;

        // Helper to parse local datetime string (YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss) as local time
        const parseLocalDateTime = (dateTimeStr: string): Date => {
          // Remove seconds and milliseconds if present (format: HH:mm:ss or HH:mm:ss.sss)
          const normalizedDateTimeStr = dateTimeStr.replace(/T(\d{2}:\d{2}):\d{2}(\.\d{3})?/, 'T$1');
          const [datePart, timePart] = normalizedDateTimeStr.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes);
        };

        // Helper to convert RRULE UNTIL date to UTC format for Google Calendar API
        // Google Calendar requires UNTIL dates in UTC (with Z suffix) when using dateTime events
        const convertRRuleUntilToUTC = (rrule: string, timezone: string): string => {
          try {
            // Parse UNTIL from RRULE (format: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ)
            const untilMatch = rrule.match(/UNTIL=([^;]+)/i);
            if (!untilMatch) {
              return rrule; // No UNTIL clause, return as-is
            }

            const untilStr = untilMatch[1].replace(/Z$/, ''); // Remove Z if present
            
            // Parse the UNTIL date (YYYYMMDDTHHmmss)
            if (untilStr.length >= 15) {
              const year = parseInt(untilStr.substring(0, 4), 10);
              const month = parseInt(untilStr.substring(4, 6), 10) - 1; // Month is 0-indexed
              const day = parseInt(untilStr.substring(6, 8), 10);
              const hour = parseInt(untilStr.substring(9, 11), 10);
              const minute = parseInt(untilStr.substring(11, 13), 10);
              const second = parseInt(untilStr.substring(13, 15), 10) || 0;

              // Validate parsed values
              if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
                throw new Error('Invalid date components');
              }
              if (month < 0 || month > 11 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
                throw new Error('Date values out of range');
              }

              // Create an ISO string for the date/time in the target timezone
              const isoString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
              
              // Use Intl.DateTimeFormat to find the UTC equivalent
              // Strategy: find the UTC time that, when displayed in the target timezone, equals our desired time
              const tzFormatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });
              
              // Start with an initial guess (treat as UTC)
              let utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));
              
              if (isNaN(utcDate.getTime())) {
                throw new Error('Invalid initial UTC date');
              }
              
              // Iteratively adjust to find the correct UTC time
              for (let i = 0; i < 10; i++) {
                const formatted = tzFormatter.format(utcDate);
                const parts = formatted.split(' ');
                
                if (parts.length < 2) {
                  throw new Error('Unexpected date format from formatter');
                }
                
                const [datePart, timePart] = parts;
                const [fYear, fMonth, fDay] = datePart.split('-').map(x => parseInt(x, 10));
                const [fHour, fMinute, fSecond] = timePart.split(':').map(x => parseInt(x, 10));
                
                // Check if we match
                if (fYear === year && fMonth === month + 1 && fDay === day && 
                    fHour === hour && fMinute === minute && Math.abs(fSecond - second) <= 1) {
                  break;
                }
                
                // Calculate adjustment needed
                const formattedAsUtc = new Date(Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute, fSecond));
                const targetAsUtc = new Date(Date.UTC(year, month, day, hour, minute, second));
                const diff = targetAsUtc.getTime() - formattedAsUtc.getTime();
                
                // Safety check
                if (isNaN(diff) || Math.abs(diff) > 86400000 * 2) {
                  throw new Error(`Date conversion failed: excessive difference (${diff}ms)`);
                }
                
                utcDate = new Date(utcDate.getTime() + diff);
                
                if (isNaN(utcDate.getTime())) {
                  throw new Error('Invalid UTC date created during conversion');
                }
              }
              
              // Format as YYYYMMDDTHHmmssZ
              const utcYear = utcDate.getUTCFullYear();
              const utcMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
              const utcDay = String(utcDate.getUTCDate()).padStart(2, '0');
              const utcHour = String(utcDate.getUTCHours()).padStart(2, '0');
              const utcMinute = String(utcDate.getUTCMinutes()).padStart(2, '0');
              const utcSecond = String(utcDate.getUTCSeconds()).padStart(2, '0');
              
              const utcUntil = `${utcYear}${utcMonth}${utcDay}T${utcHour}${utcMinute}${utcSecond}Z`;
              
              // Replace UNTIL in the RRULE
              return rrule.replace(/UNTIL=[^;]+/i, `UNTIL=${utcUntil}`);
            }
          } catch (error) {
            console.error('Error in convertRRuleUntilToUTC:', error);
            throw error; // Re-throw to be caught by outer try-catch
          }
          
          return rrule; // Return as-is if parsing fails
        };

        // Cycle through colors for each event (unless user specified a color)
        let colorIndex = 0;

        for (const event of events) {
          // Parse ISO datetime strings as local time
          const startDate = parseLocalDateTime(event.start);
          const endDate = parseLocalDateTime(event.end);

          // Skip if dates are invalid
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn('Skipping event with invalid dates:', event);
            continue;
          }

          // Use user-specified color if provided, otherwise cycle through colors
          const colorId = event.colorId || CALENDAR_COLORS[colorIndex % CALENDAR_COLORS.length];
          if (!event.colorId) {
            colorIndex++;
          }

          // Format dates in ISO format but in the specified timezone (not UTC)
          // Google Calendar expects dateTime to represent the actual time in the timezone
          const formatDateTimeForTimezone = (date: Date): string => {
            // Format as YYYY-MM-DDTHH:mm:ss (without timezone, Google will use the timeZone field)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
          };

          const calendarEvent: any = {
            summary: event.title,
            description: event.description || '',
            start: {
              dateTime: formatDateTimeForTimezone(startDate),
              timeZone: timezone,
            },
            end: {
              dateTime: formatDateTimeForTimezone(endDate),
              timeZone: timezone,
            },
            colorId: colorId,
          };

          // Add recurrence if rrule is provided
          if (event.rrule) {
            try {
              // Convert UNTIL date to UTC format for Google Calendar API
              const convertedRRule = convertRRuleUntilToUTC(event.rrule, timezone);
              calendarEvent.recurrence = [`RRULE:${convertedRRule}`];
              console.log('Original RRULE:', event.rrule);
              console.log('Converted RRULE:', convertedRRule);
            } catch (rruleError) {
              console.error('Error converting RRULE, using original:', rruleError);
              // Fallback: use original rrule (might work if UNTIL is already in correct format)
              calendarEvent.recurrence = [`RRULE:${event.rrule}`];
            }
          }

          console.log('Sending event to Google Calendar:', JSON.stringify(calendarEvent, null, 2));
          
          try {
            await axios.post(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
              calendarEvent,
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            addedCount++;
          } catch (eventError: any) {
            const errorData = eventError?.response?.data;
            console.error('Error adding individual event:', errorData || eventError);
            if (errorData?.error) {
              console.error('Google Calendar API Error:', {
                message: errorData.error.message,
                code: errorData.error.code,
                errors: errorData.error.errors
              });
            }
            console.error('Event that failed:', JSON.stringify(calendarEvent, null, 2));
            throw eventError; // Re-throw to be caught by outer catch
          }
        }

        toast.success(`Successfully added ${addedCount} events to your Centflow Schedule calendar!`, {
          position: "top-center",
          autoClose: 5000,
        });
      } catch (error: any) {
        console.error('Error adding events to calendar:', error);
        const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
        console.error('Error details:', error?.response?.data);
        toast.error(`Failed to add events to calendar: ${errorMessage}`);
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar',
  });

  return (
    <button
      onClick={() => login()}
      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
    >
      Add to Google Calendar
    </button>
  );
};

export default GoogleCalendarButtonSchedule;

