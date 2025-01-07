"use client";
import React, { useState } from 'react';
import { Event } from '@/types/Event';
import * as chrono from 'chrono-node';
import EditableEvent from '@/components/EditableEvent';

const TextInput: React.FC = () => {
  const [text, setText] = useState('');
  const [parsedEvents, setParsedEvents] = useState<Event[]>([]);

  const parseDays = (daysStr: string): string[] => {
    const dayMapping: { [key: string]: string } = {
      'M': 'Monday',
      'T': 'Tuesday',
      'W': 'Wednesday',
      'R': 'Thursday',
      'F': 'Friday'
    };
    
    return daysStr.split('').map(day => dayMapping[day] || day);
  };

  const parseTimeRange = (timeStr: string): { startTime: string; endTime: string } => {
    const [start, end] = timeStr.split(' - ');
    return {
      startTime: start,
      endTime: end
    };
  };

  const parseDateRange = (dateStr: string): { start: Date; end: Date } => {
    const [start, end] = dateStr.split(' - ');
    return {
      start: new Date(start),
      end: new Date(end)
    };
  };

  const parseText = (text: string): Event[] => {
    const events: Event[] = [];
    
    // Find all course entries using a more specific regex
    const courseRegex = /^([A-Za-z][\w\s]+?(?=\s*-))\s*-\s*([A-Z]+\s+\d+)\s*-\s*(\d+)/gm;
    const matches = text.matchAll(courseRegex);

    for (const match of Array.from(matches)) {
        const [fullMatch, courseName, courseCode, sectionNum] = match;
        
        // Skip if the course name is "Lab" or contains "mail"
        if (courseName.toLowerCase() === 'lab' || courseName.toLowerCase().includes('mail')) {
            continue;
        }

        console.log('Course Name:', courseName);

        // Find the section of text for this course
        const sectionStart = text.indexOf(fullMatch);
        const nextSectionStart = text.indexOf('\n\n', sectionStart + fullMatch.length);
        const section = text.slice(sectionStart, nextSectionStart !== -1 ? nextSectionStart : undefined);

        // Extract CRN
        const crnMatch = section.match(/CRN:\s*(\d+)/);
        const crn = crnMatch?.[1] || '';

        // Find all scheduled meeting times
        const meetingTimeRegex = /Type\s+Time\s+Days\s+Where\s+Date Range\s+Schedule Type\s+Instructors\s+([^]+?)(?=\n\n|$)/g;
        const meetingMatches = section.matchAll(meetingTimeRegex);

        for (const meetingMatch of Array.from(meetingMatches)) {
            const meetingLines = meetingMatch[1].split('\n').filter(line => line.trim());
            
            for (const line of meetingLines) {
                const [type, time, days, location, dateRange, scheduleType, instructor] = 
                    line.split(/\t+/).map(s => s.trim());

                if (!time || !days || time === ' ') continue;

                const event: Event = {
                    courseCode,
                    courseName: courseName.trim(),
                    meetingTime: {
                        type,
                        ...parseTimeRange(time),
                        days: parseDays(days),
                        location,
                        dateRange: parseDateRange(dateRange),
                        instructor: instructor?.replace(/\s*\(P\)/, '').replace(/E-mail$/, '').trim()
                    },
                    rawText: line
                };

                events.push(event);
            }
        }
    }

    return events;
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
  };

  const handleParse = () => {
    const events = parseText(text);
    setParsedEvents(events);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Paste your course schedule here"
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

      {parsedEvents.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">Parsed Events</h2>
          <p className="text-sm text-gray-500 mb-4">
            Click on any field to edit the information before adding to your calendar. All changes are saved automatically.
          </p>
          <div className="space-y-4">
            {parsedEvents.map((event, index) => (
              <EditableEvent
                key={index}
                event={event}
                onUpdate={(updatedEvent) => {
                  const updatedEvents = [...parsedEvents];
                  updatedEvents[index] = updatedEvent;
                  setParsedEvents(updatedEvents);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextInput;
