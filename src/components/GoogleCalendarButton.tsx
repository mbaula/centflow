import { useGoogleLogin } from '@react-oauth/google';
import { Event } from '@/types/Event';
import { toast } from 'react-toastify';
import axios from 'axios';

interface GoogleCalendarButtonProps {
  events: Event[];
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

const DAY_MAP: { [key: string]: number } = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 0
};

const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ events }) => {
  const getFirstOccurrence = (startDate: Date, dayName: string): Date => {
    const targetDay = DAY_MAP[dayName];
    const date = new Date(startDate);
    while (date.getDay() !== targetDay) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };

  const formatTimeForCalendar = (date: Date, timeStr: string) => {
    const [time, period] = timeStr.toLowerCase().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0);
    return newDate.toISOString();
  };

  const createCalendar = async (accessToken: string) => {
    try {
      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars',
        {
          summary: 'Centflow',
          description: 'Centennial College courses imported via Centflow'
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.id;
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const calendarId = await createCalendar(tokenResponse.access_token);
        let addedCount = 0;

        // Create a map of course codes to color indices
        const courseColorMap = new Map<string, string>();
        let colorIndex = 0;

        // Assign colors to unique course codes
        events.forEach(event => {
          if (!courseColorMap.has(event.courseCode)) {
            courseColorMap.set(event.courseCode, CALENDAR_COLORS[colorIndex % CALENDAR_COLORS.length]);
            colorIndex++;
          }
        });

        for (const event of events) {
          for (const day of event.meetingTime.days) {
            const firstOccurrence = getFirstOccurrence(event.meetingTime.dateRange.start, day);
            
            // Skip if the first occurrence is after the end date
            if (firstOccurrence > event.meetingTime.dateRange.end) {
              continue;
            }

            const calendarEvent = {
              summary: `${event.courseName} (${event.courseCode})`,
              location: event.meetingTime.location,
              description: `Type: ${event.meetingTime.type}\nInstructor: ${event.meetingTime.instructor}`,
              start: {
                dateTime: formatTimeForCalendar(firstOccurrence, event.meetingTime.startTime),
                timeZone: 'America/Toronto',
              },
              end: {
                dateTime: formatTimeForCalendar(firstOccurrence, event.meetingTime.endTime),
                timeZone: 'America/Toronto',
              },
              recurrence: [
                `RRULE:FREQ=WEEKLY;UNTIL=${event.meetingTime.dateRange.end.toISOString().split('T')[0].replace(/-/g, '')}`
              ],
              colorId: courseColorMap.get(event.courseCode),
            };

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
          }
        }

        toast.success(`Successfully added ${addedCount} course sessions to your Centflow calendar!`, {
          position: "top-center",
          autoClose: 5000,
        });
      } catch (error) {
        console.error('Error adding events to calendar:', error);
        toast.error('Failed to add events to calendar. Please try again.');
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

export default GoogleCalendarButton; 