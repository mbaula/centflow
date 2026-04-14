"use client";
import React, { useState } from 'react';
import { Event } from '@/types/Event';
import EditableEvent from '@/components/EditableEvent';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GoogleCalendarButton from './GoogleCalendarButton';
import { parseUwQuestSchedule } from '@/utils/parseUwQuestSchedule';

const UwFlowInput: React.FC = () => {
  const [text, setText] = useState('');
  const [parsedEvents, setParsedEvents] = useState<Event[]>([]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  const handleParse = () => {
    if (!text.trim()) {
      toast.error('Please paste your Quest class schedule before parsing.');
      return;
    }
    const events = parseUwQuestSchedule(text);
    if (events.length === 0) {
      toast.error(
        'No meetings found. Copy List View from Quest (My Class Schedule) and include course lines (e.g. MTE 309 - …) and the Class Nbr table.'
      );
      setParsedEvents([]);
      return;
    }

    const groupedEvents = events.reduce(
      (groups, event) => {
        const key = event.courseName;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(event);
        return groups;
      },
      {} as { [key: string]: Event[] }
    );

    const sortedEvents = Object.keys(groupedEvents)
      .sort()
      .flatMap((courseName) => groupedEvents[courseName]);

    setParsedEvents(sortedEvents);
    toast.success(`Parsed ${events.length} meeting row(s).`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder={`1. Log in to Quest (University of Waterloo).\n2. Go to Enroll > My Class Schedule.\n3. Choose List View and the term you want.\n4. Select all page text (Ctrl+A) and copy (Ctrl+C).\n5. Paste here.`}
          className="w-full p-2 border rounded-md"
          rows={10}
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

      {parsedEvents.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Parsed UW schedule</h2>
            <GoogleCalendarButton events={parsedEvents} />
          </div>

          {(() => {
            const groupedEvents = parsedEvents.reduce(
              (groups, event) => {
                const key = event.courseName;
                if (!groups[key]) {
                  groups[key] = [];
                }
                groups[key].push(event);
                return groups;
              },
              {} as { [key: string]: Event[] }
            );

            return Object.keys(groupedEvents)
              .sort()
              .map((courseName) => (
                <div key={courseName} className="mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
                    <h3 className="text-lg font-semibold">{courseName}</h3>
                    <p className="text-blue-100 text-sm">{groupedEvents[courseName][0].courseCode}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm">
                    {groupedEvents[courseName].map((event, index) => (
                      <div key={index} className={index > 0 ? 'border-t border-gray-100' : ''}>
                        <EditableEvent
                          event={event}
                          onUpdate={(updatedEvent) => {
                            const updatedEvents = [...parsedEvents];
                            const eventIndex = parsedEvents.findIndex((e) => e === event);
                            if (eventIndex !== -1) {
                              updatedEvents[eventIndex] = updatedEvent;
                              setParsedEvents(updatedEvents);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ));
          })()}
        </div>
      )}
    </div>
  );
};

export default UwFlowInput;
