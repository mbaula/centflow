"use client";
import React, { useState, useMemo } from 'react';
import { ScheduleData, ScheduleEvent } from '@/types/ScheduleEvent';
import ScheduleEventEditor from './ScheduleEventEditor';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GoogleCalendarButton from './GoogleCalendarButtonSchedule';
import CalendarPreview from './CalendarPreview';
import { expandRecurringEvents } from '@/utils/rruleExpander';

const ScheduleInput: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [parsedEvents, setParsedEvents] = useState<ScheduleEvent[]>([]);

  // Move useMemo outside conditional render to follow Rules of Hooks
  const expandedEvents = useMemo(() => {
    if (parsedEvents.length === 0) return [];
    return expandRecurringEvents(parsedEvents, 90);
  }, [parsedEvents]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
  };

  const handleParse = () => {
    if (!jsonInput.trim()) {
      toast.error('Please paste your schedule JSON before parsing.');
      return;
    }

    try {
      const parsed: ScheduleData = JSON.parse(jsonInput);
      
      // Validate structure
      if (!parsed.timezone || !parsed.events || !Array.isArray(parsed.events)) {
        toast.error('Invalid JSON structure. Expected { timezone: string, events: array }');
        return;
      }

      // Validate events
      for (const event of parsed.events) {
        if (!event.title || !event.start || !event.end) {
          toast.error('Each event must have title, start, and end fields.');
          return;
        }
      }

      setScheduleData(parsed);
      setParsedEvents([...parsed.events]);
      toast.success(`Successfully parsed ${parsed.events.length} events!`);
    } catch (error) {
      toast.error('Invalid JSON. Please check your input and try again.');
      console.error('JSON parse error:', error);
    }
  };

  const handleEventUpdate = (index: number, updatedEvent: ScheduleEvent) => {
    const updated = [...parsedEvents];
    updated[index] = updatedEvent;
    setParsedEvents(updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paste your schedule JSON:
        </label>
        <textarea
          value={jsonInput}
          onChange={handleJsonChange}
          placeholder={`{\n  "timezone": "America/Toronto",\n  "events": [\n    {\n      "title": "Event Title",\n      "start": "2025-12-15T10:00",\n      "end": "2025-12-15T12:00",\n      "description": "Optional description"\n    }\n  ]\n}`}
          className="w-full p-2 border rounded-md font-mono text-sm"
          rows={15}
          style={{ color: 'black' }}
        />
        <button 
          onClick={handleParse}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Parse Schedule
        </button>
      </div>

      <ToastContainer />

      {scheduleData && parsedEvents.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">📅 Parsed Schedule</h2>
              <p className="text-sm text-gray-600 mt-1">
                Timezone: {scheduleData.timezone} • {parsedEvents.length} event{parsedEvents.length !== 1 ? 's' : ''}
                {parsedEvents.some(e => e.rrule) && (
                  <span className="ml-2 text-blue-600">(with recurring events)</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <CalendarPreview 
                events={expandedEvents} 
                timezone={scheduleData.timezone}
                onEventsUpdate={(expanded) => {
                  // Note: Updates to expanded events won't update the original recurring events
                  // This is a limitation - users should edit the original events
                }}
              />
              <GoogleCalendarButton 
                events={parsedEvents} 
                timezone={scheduleData.timezone}
              />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {parsedEvents.map((event, index) => (
              <ScheduleEventEditor
                key={index}
                event={event}
                onUpdate={(updatedEvent) => handleEventUpdate(index, updatedEvent)}
                timezone={scheduleData.timezone}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleInput;

