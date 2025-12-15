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
  const createCalendar = async (accessToken: string) => {
    try {
      const response = await axios.post(
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

        // Helper to parse local datetime string (YYYY-MM-DDTHH:mm) as local time
        const parseLocalDateTime = (dateTimeStr: string): Date => {
          const [datePart, timePart] = dateTimeStr.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes);
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

          const calendarEvent = {
            summary: event.title,
            description: event.description || '',
            start: {
              dateTime: startDate.toISOString(),
              timeZone: timezone,
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: timezone,
            },
            colorId: colorId,
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

        toast.success(`Successfully added ${addedCount} events to your Centflow Schedule calendar!`, {
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

export default GoogleCalendarButtonSchedule;

