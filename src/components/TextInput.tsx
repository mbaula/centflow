"use client";
import React, { useState } from 'react';
import { Event } from '@/types/Event';
import * as chrono from 'chrono-node';
import EditableEvent from '@/components/EditableEvent';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GoogleCalendarButton from './GoogleCalendarButton';

const TextInput: React.FC = () => {
  const [text, setText] = useState('');
  const [parsedEvents, setParsedEvents] = useState<Event[]>([]);

  const parseDays = (daysStr: string): string[] => {
    // Handle both old format (M, T, W, R, F) and new format (Monday, Tuesday, etc.)
    if (daysStr.includes('Monday') || daysStr.includes('Tuesday') || daysStr.includes('Wednesday') || 
        daysStr.includes('Thursday') || daysStr.includes('Friday') || daysStr.includes('Saturday') || 
        daysStr.includes('Sunday')) {
      // New format - days are already spelled out
      return [daysStr.trim()];
    }
    
    // Old format - convert single letters to full day names
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
      startTime: start.trim(),
      endTime: end.trim()
    };
  };

  const parseDateRange = (dateStr: string): { start: Date; end: Date } => {
    const [start, end] = dateStr.split(' - ').map(date => {
      // Handle new format: "09/02/2025" or old format: "Jan 08,2025"
      if (date.includes('/')) {
        // New format: MM/DD/YYYY
        const [month, day, year] = date.split('/');
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      } else {
        // Old format: "Jan 08,2025"
        const [month, day, year] = date.split(/[,\s]/);
        const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
        return new Date(`${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    });
    
    return { start, end };
  };

  const parseText = (text: string): Event[] => {
    const events: Event[] = [];
    
    // Look for the "Schedule Details" section
    const scheduleDetailsMatch = text.match(/Schedule Details\s*([\s\S]*?)(?=\n\n|$)/);
    if (!scheduleDetailsMatch) {
      // Fallback to old format parsing
      return parseOldFormat(text);
    }
    
    const scheduleDetails = scheduleDetailsMatch[1];
    const lines = scheduleDetails.split('\n');
    
    let currentCourse = null;
    let currentInstructor = '';
    
    // First pass: collect all instructor information for each course
    const courseInstructors = new Map();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a course header line
      const courseHeaderMatch = line.match(/^([^|]+)\s*\|\s*([^|]+)\s*\|\s*Class Begin:\s*([^|]+)\s*\|\s*Class End:\s*([^|]+)$/);
      if (courseHeaderMatch) {
        const [, courseName, courseCode, classBegin, classEnd] = courseHeaderMatch;
        currentCourse = {
          name: courseName.trim(),
          code: courseCode.trim(),
          classBegin: classBegin.trim(),
          classEnd: classEnd.trim()
        };
        currentInstructor = '';
        continue;
      }
      
      // Check if this is an instructor line
      const instructorMatch = line.match(/^Instructor:\s*(.+?)(?:\s*\(Primary\))?$/);
      if (instructorMatch && currentCourse) {
        currentInstructor = instructorMatch[1].trim();
        courseInstructors.set(currentCourse.name, currentInstructor);
        continue;
      }
      
      // Check if this is a secondary instructor line (without "Instructor:" prefix)
      if (line.match(/^[A-Za-z][^|]*,\s*[A-Za-z]/) && currentCourse && currentInstructor) {
        // This is likely a secondary instructor, but only add if it's different from the current instructor
        const secondaryInstructor = line.trim();
        if (secondaryInstructor !== currentInstructor) {
          const fullInstructor = `${currentInstructor}, ${secondaryInstructor}`;
          courseInstructors.set(currentCourse.name, fullInstructor);
          currentInstructor = fullInstructor;
        }
        continue;
      }
    }
    
    // Second pass: parse events with instructor information
    currentCourse = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a course header line
      const courseHeaderMatch = line.match(/^([^|]+)\s*\|\s*([^|]+)\s*\|\s*Class Begin:\s*([^|]+)\s*\|\s*Class End:\s*([^|]+)$/);
      if (courseHeaderMatch) {
        const [, courseName, courseCode, classBegin, classEnd] = courseHeaderMatch;
        currentCourse = {
          name: courseName.trim(),
          code: courseCode.trim(),
          classBegin: classBegin.trim(),
          classEnd: classEnd.trim()
        };
        continue;
      }
      
      // Check if this is a date range line with day
      const dateRangeMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s*--\s*(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z]+)$/);
      if (dateRangeMatch && currentCourse) {
        const [, startDate, endDate, day] = dateRangeMatch;
        
        // Skip if day is "None"
        if (day === 'None') continue;
        
        // Look ahead for time and location info
        for (let j = i + 1; j < lines.length && j < i + 10; j++) {
          const timeLine = lines[j].trim();
          
          // Look for time pattern: 08:30 AM - 11:20 AM Type: Class Location: ...
          const timeMatch = timeLine.match(/^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)\s*Type:\s*([^|]+)\s*Location:\s*([^|]+)\s*Building:\s*([^|]+)\s*Room:\s*([^|]+)$/);
          
          if (timeMatch) {
            const [, startTime, endTime, type, location, building, room] = timeMatch;
            
            // Skip if time is just a dash (no time specified)
            if (startTime === '-' || endTime === '-') continue;
            
            // Combine location information
            const fullLocation = `${location}${building ? ` - ${building}` : ''}${room && room !== 'None' ? ` - ${room}` : ''}`;
            
            const event: Event = {
              courseCode: currentCourse.code,
              courseName: currentCourse.name,
              meetingTime: {
                type: type.trim(),
                startTime: startTime.trim(),
                endTime: endTime.trim(),
                days: parseDays(day),
                location: fullLocation.trim(),
                dateRange: parseDateRange(`${startDate} - ${endDate}`),
                instructor: courseInstructors.get(currentCourse.name) || ''
              },
              rawText: `${currentCourse.name} | ${currentCourse.code} | ${day} ${startTime}-${endTime}`
            };
            
            events.push(event);
            break; // Found the time for this date range, move to next date range
          }
        }
      }
    }
    
    return events;
  };
  
  // Fallback method for old format
  const parseOldFormat = (text: string): Event[] => {
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
    if (!text.trim()) {
      toast.error('Please paste your course schedule before parsing.');
      return;
    }
    const events = parseText(text);
    
    // Group events by course name and sort alphabetically
    const groupedEvents = events.reduce((groups, event) => {
      const courseName = event.courseName;
      if (!groups[courseName]) {
        groups[courseName] = [];
      }
      groups[courseName].push(event);
      return groups;
    }, {} as { [key: string]: Event[] });
    
    // Sort course names alphabetically and flatten back to array
    const sortedEvents = Object.keys(groupedEvents)
      .sort()
      .flatMap(courseName => groupedEvents[courseName]);
    
    setParsedEvents(sortedEvents);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder={`1. Go to the MyCentennial website.\n2. Go to the Academics page.\n3. Click "View Your Timetable" under the "Steps to Register" card.\n4. Scroll all the way down and click "Detailed Schedule."\n5. Select the term you want to add.\n6. Press Ctrl + A to select all the page content, then press Ctrl + C to copy it.\n7. Paste the copied content here.`}
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
            <h2 className="text-2xl font-bold text-gray-800">📚 Parsed Course Schedule</h2>
            <GoogleCalendarButton events={parsedEvents} />
          </div>
          
          {/* Group events by course name for better display */}
          {(() => {
            const groupedEvents = parsedEvents.reduce((groups, event) => {
              const courseName = event.courseName;
              if (!groups[courseName]) {
                groups[courseName] = [];
              }
              groups[courseName].push(event);
              return groups;
            }, {} as { [key: string]: Event[] });
            
            return Object.keys(groupedEvents).sort().map((courseName) => (
              <div key={courseName} className="mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
                  <h3 className="text-lg font-semibold">{courseName}</h3>
                  <p className="text-blue-100 text-sm">{groupedEvents[courseName][0].courseCode}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm">
                  {groupedEvents[courseName].map((event, index) => (
                    <div key={index} className={index > 0 ? "border-t border-gray-100" : ""}>
                      <EditableEvent
                        event={event}
                        onUpdate={(updatedEvent) => {
                          const updatedEvents = [...parsedEvents];
                          const eventIndex = parsedEvents.findIndex(e => e === event);
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

export default TextInput;
