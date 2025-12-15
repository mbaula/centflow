"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ScheduleEvent } from '@/types/ScheduleEvent';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

interface CalendarPreviewProps {
  events: ScheduleEvent[];
  timezone: string;
  onEventsUpdate?: (events: ScheduleEvent[]) => void;
}

// Google Calendar color mapping (matching GoogleCalendarButtonSchedule)
const CALENDAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '1': { bg: '#a4bdfc', text: '#1d1d1d', border: '#7986cb' }, // Lavender
  '2': { bg: '#7ae7bf', text: '#1d1d1d', border: '#51b373' }, // Sage
  '3': { bg: '#dbadff', text: '#1d1d1d', border: '#b39ddb' }, // Grape
  '4': { bg: '#ff887c', text: '#1d1d1d', border: '#e57373' }, // Flamingo
  '5': { bg: '#fbd75b', text: '#1d1d1d', border: '#ffb74d' }, // Banana
  '6': { bg: '#ffb878', text: '#1d1d1d', border: '#ff9800' }, // Tangerine
  '7': { bg: '#46d6db', text: '#1d1d1d', border: '#4dd0e1' }, // Peacock
  '8': { bg: '#e1e1e1', text: '#1d1d1d', border: '#9e9e9e' }, // Graphite
  '9': { bg: '#5484ed', text: '#ffffff', border: '#3f51b5' }, // Blueberry
  '10': { bg: '#51b749', text: '#ffffff', border: '#388e3c' }, // Basil
  '11': { bg: '#dc2127', text: '#ffffff', border: '#d32f2f' }, // Tomato
};

const CALENDAR_COLOR_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

const CalendarPreview: React.FC<CalendarPreviewProps> = ({ events, timezone, onEventsUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [editingEvent, setEditingEvent] = useState<{ event: ScheduleEvent; index: number } | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<{ event: ScheduleEvent; index: number; startX: number; startY: number; dayIndex: number; originalStart: Date; originalEnd: Date } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{ event: ScheduleEvent; index: number; startY: number; isEnd: boolean } | null>(null);
  const [localEvents, setLocalEvents] = useState<ScheduleEvent[]>(events);
  const [wasDragging, setWasDragging] = useState(false);
  
  // Parse local datetime string
  const parseLocalDateTime = (dateTimeStr: string): Date => {
    const [datePart, timePart] = dateTimeStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const timeComponents = (timePart || '00:00').split(':').map(Number);
    const [hours, minutes] = timeComponents;
    return new Date(year, month - 1, day, hours, minutes);
  };
  
  // Initialize current month to the month containing the first event
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (events.length === 0) return new Date();
    const firstEvent = events[0];
    const [datePart] = firstEvent.start.split('T');
    const [year, month] = datePart.split('-').map(Number);
    return new Date(year, month - 1, 1);
  });

  // Initialize current week start (Monday of the week containing first event)
  const getInitialWeekStart = () => {
    if (events.length === 0) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      return monday;
    }
    const firstEvent = events[0];
    const [datePart, timePart] = firstEvent.start.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const timeComponents = (timePart || '00:00').split(':').map(Number);
    const [hours, minutes] = timeComponents;
    const startDate = new Date(year, month - 1, day, hours, minutes);
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(startDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getInitialWeekStart);
  
  // Track if we should auto-update the week view
  const [hasUserNavigated, setHasUserNavigated] = useState(false);
  const [initialEventsHash, setInitialEventsHash] = useState<string>('');

  // Update local events when props change
  useEffect(() => {
    const eventsHash = JSON.stringify(events.map(e => ({ title: e.title, start: e.start, end: e.end })));
    
    // Check if this is a completely new set of events (initial load or major change)
    const isNewEventSet = initialEventsHash === '' || 
                         events.length !== localEvents.length ||
                         (events.length > 0 && localEvents.length > 0 && 
                          events[0].title !== localEvents[0].title);
    
    if (isNewEventSet) {
      setInitialEventsHash(eventsHash);
      setHasUserNavigated(false); // Reset navigation flag for new event set
    }
    
    setLocalEvents(events);
    
    // Only auto-update week/month if user hasn't manually navigated and this is a new event set
    if (!hasUserNavigated && isNewEventSet && events.length > 0) {
      const firstEvent = events[0];
      const [datePart] = firstEvent.start.split('T');
      const [year, month] = datePart.split('-').map(Number);
      setCurrentMonth(new Date(year, month - 1, 1));
      
      const startDate = parseLocalDateTime(firstEvent.start);
      const dayOfWeek = startDate.getDay();
      const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(startDate);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentWeekStart(monday);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // Mark that user has navigated when they use navigation buttons
  const navigateWeek = (direction: 'prev' | 'next') => {
    setHasUserNavigated(true);
    const newWeekStart = new Date(currentWeekStart);
    if (direction === 'prev') {
      newWeekStart.setDate(newWeekStart.getDate() - 7);
    } else {
      newWeekStart.setDate(newWeekStart.getDate() + 7);
    }
    setCurrentWeekStart(newWeekStart);
  };

  // Get date range for events
  const dateRange = useMemo(() => {
    if (localEvents.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = localEvents.map(e => parseLocalDateTime(e.start));
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Start from Monday of the week containing the first event
    const startDate = new Date(start);
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
    
    // End on Sunday of the week containing the last event
    const endDate = new Date(end);
    const endDayOfWeek = endDate.getDay();
    const endDiff = endDate.getDate() - endDayOfWeek + (endDayOfWeek === 0 ? 0 : 7); // Adjust to Sunday
    endDate.setDate(endDiff);
    endDate.setHours(23, 59, 59, 999);
    
    return { start: startDate, end: endDate };
  }, [localEvents]);

  // Get week days based on current week start
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentWeekStart]);

  // Format week range for display
  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  };

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, ScheduleEvent[]> = {};
    localEvents.forEach(event => {
      const startDate = parseLocalDateTime(event.start);
      const dateKey = startDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    // Sort events within each day by start time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const timeA = parseLocalDateTime(a.start).getTime();
        const timeB = parseLocalDateTime(b.start).getTime();
        return timeA - timeB;
      });
    });
    return grouped;
  }, [localEvents]);

  // Calculate event position and height
  const getEventStyle = (event: ScheduleEvent) => {
    const startDate = parseLocalDateTime(event.start);
    const endDate = parseLocalDateTime(event.end);
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    const top = (startMinutes / 60) * 60; // 60px per hour
    const height = ((endMinutes - startMinutes) / 60) * 60;
    return {
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, // Minimum 20px height
    };
  };

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get day name abbreviation
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Get day number
  const getDayNumber = (date: Date): string => {
    return date.getDate().toString();
  };

  // Get event color based on colorId - create consistent color mapping
  const eventColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let colorIndex = 0;
    localEvents.forEach(event => {
      if (!map.has(event.title)) {
        if (event.colorId && CALENDAR_COLORS[event.colorId]) {
          map.set(event.title, event.colorId);
        } else {
          map.set(event.title, CALENDAR_COLOR_IDS[colorIndex % CALENDAR_COLOR_IDS.length]);
          colorIndex++;
        }
      }
    });
    return map;
  }, [localEvents]);

  // Format date as YYYY-MM-DDTHH:mm in local time
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Update event
  const updateEvent = (index: number, updatedEvent: ScheduleEvent) => {
    const updated = [...localEvents];
    updated[index] = updatedEvent;
    setLocalEvents(updated);
    if (onEventsUpdate) {
      onEventsUpdate(updated);
    }
  };

  // Find event index by comparing all fields
  const findEventIndex = (event: ScheduleEvent): number => {
    return localEvents.findIndex(e => 
      e.title === event.title && 
      e.start === event.start && 
      e.end === event.end
    );
  };

  // Mouse handlers for drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggedEvent) {
        const deltaX = e.clientX - draggedEvent.startX;
        const deltaY = e.clientY - draggedEvent.startY;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          setWasDragging(true);
        }
        
        // Calculate day change (horizontal drag)
        // Find the calendar container and calculate which day column we're over
        const calendarContainer = document.querySelector('.ml-16.flex') as HTMLElement;
        if (!calendarContainer) return;
        
        const containerRect = calendarContainer.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left;
        const dayWidth = containerRect.width / 7;
        const targetDayIndex = Math.floor(relativeX / dayWidth);
        const clampedDayIndex = Math.max(0, Math.min(6, targetDayIndex));
        
        // Calculate day delta from original day
        const dayDelta = clampedDayIndex - draggedEvent.dayIndex;
        
        // Calculate time change (vertical drag)
        // Use deltaY directly - each hour is 60px, so 1px = 1 minute
        // Round to nearest 15 minutes for snapping
        const deltaMinutes = deltaY; // 1px = 1 minute
        const roundedDeltaMinutes = Math.round(deltaMinutes / 15) * 15;
        
        // Calculate new start date based on original position + delta
        const newStartDate = new Date(draggedEvent.originalStart);
        newStartDate.setDate(newStartDate.getDate() + dayDelta);
        const newMinutes = newStartDate.getMinutes() + roundedDeltaMinutes;
        const newHours = newStartDate.getHours() + Math.floor(newMinutes / 60);
        const finalMinutes = ((newMinutes % 60) + 60) % 60; // Handle negative minutes
        
        // Ensure hours are within valid range (0-23)
        const finalHours = Math.max(0, Math.min(23, newHours));
        
        newStartDate.setHours(finalHours, finalMinutes, 0, 0);
        
        // Calculate duration and new end date
        const duration = draggedEvent.originalEnd.getTime() - draggedEvent.originalStart.getTime();
        const newEndDate = new Date(newStartDate.getTime() + duration);
        
        // Ensure times are within valid range (0-23:59)
        if (newStartDate.getHours() < 0 || newStartDate.getHours() >= 24) return;
        if (newEndDate.getHours() < 0 || newEndDate.getHours() >= 24) return;
        
        const updatedEvent = {
          ...draggedEvent.event,
          start: formatLocalDateTime(newStartDate),
          end: formatLocalDateTime(newEndDate),
        };
        
        updateEvent(draggedEvent.index, updatedEvent);
        setDraggedEvent({ 
          ...draggedEvent, 
          event: updatedEvent
        });
      }
      
      if (resizingEvent) {
        const deltaY = e.clientY - resizingEvent.startY;
        const deltaMinutes = Math.round(deltaY / 60 * 60);
        const roundedDelta = Math.round(deltaMinutes / 15) * 15;
        
        const event = resizingEvent.event;
        const startDate = parseLocalDateTime(event.start);
        const endDate = parseLocalDateTime(event.end);
        
        let updatedEvent: ScheduleEvent;
        if (resizingEvent.isEnd) {
          const newEndDate = new Date(endDate.getTime() + roundedDelta * 60000);
          if (newEndDate > startDate) {
            updatedEvent = {
              ...event,
              end: formatLocalDateTime(newEndDate),
            };
          } else {
            return; // Don't allow end before start
          }
        } else {
          const newStartDate = new Date(startDate.getTime() + roundedDelta * 60000);
          if (newStartDate < endDate) {
            updatedEvent = {
              ...event,
              start: formatLocalDateTime(newStartDate),
            };
          } else {
            return; // Don't allow start after end
          }
        }
        
        updateEvent(resizingEvent.index, updatedEvent);
        setResizingEvent({ ...resizingEvent, event: updatedEvent, startY: e.clientY });
      }
    };

    const handleMouseUp = () => {
      const wasDraggingNow = wasDragging;
      setDraggedEvent(null);
      setResizingEvent(null);
      // Reset wasDragging after a short delay to allow click handler to check it
      setTimeout(() => setWasDragging(false), 100);
    };

    if (draggedEvent || resizingEvent) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedEvent, resizingEvent]);

  const getEventColor = (event: ScheduleEvent) => {
    const colorId = event.colorId || eventColorMap.get(event.title) || CALENDAR_COLOR_IDS[0];
    return CALENDAR_COLORS[colorId] || CALENDAR_COLORS['9']; // Default to blueberry
  };

  // Generate time slots (every hour from 0 to 23)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  // Month view: Get all days in the month
  const monthDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate.setDate(diff);
    
    // End on the Sunday of the week containing the last day
    const endDate = new Date(lastDay);
    const endDayOfWeek = endDate.getDay();
    const endDiff = endDate.getDate() - endDayOfWeek + (endDayOfWeek === 0 ? 0 : 7);
    endDate.setDate(endDiff);
    
    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, viewMode]);

  // Navigate month
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
      >
        Preview Calendar
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[95vw] max-w-7xl h-[90vh] mx-4 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800">Calendar Preview</h2>
                {viewMode === 'week' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateWeek('prev')}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Previous week"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="font-medium min-w-[200px] text-center">
                      {formatWeekRange()}
                    </span>
                    <button
                      onClick={() => navigateWeek('next')}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Next week"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                )}
                {viewMode === 'month' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Previous month"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="font-medium min-w-[150px] text-center">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Next month"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1 text-sm rounded ${viewMode === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1 text-sm rounded ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Month
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
              {localEvents.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No events to preview</p>
                </div>
              ) : viewMode === 'week' ? (
                <div className="relative">
                  {/* Time column header */}
                  <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
                    <div className="flex">
                      <div className="w-16 border-r border-gray-200"></div>
                      {weekDays.map((day, idx) => (
                        <div key={idx} className="flex-1 border-r border-gray-200 last:border-r-0 p-2 text-center">
                          <div className="text-xs text-gray-500 font-medium">{getDayName(day)}</div>
                          <div className={`text-lg font-semibold mt-1 ${day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-800'}`}>
                            {getDayNumber(day)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calendar grid with time slots */}
                  <div className="relative">
                    {/* Time labels */}
                    <div className="absolute left-0 w-16 bg-white border-r border-gray-200">
                      {timeSlots.map((hour) => (
                        <div key={hour} className="h-[60px] border-b border-gray-100 relative">
                          <span className="absolute top-0 right-2 text-xs text-gray-500 transform -translate-y-1/2">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Days columns */}
                    <div className="ml-16 flex">
                      {weekDays.map((day, dayIdx) => {
                        const dateKey = day.toISOString().split('T')[0];
                        const dayEvents = eventsByDate[dateKey] || [];
                        
                        return (
                          <div key={dayIdx} className="flex-1 border-r border-gray-200 last:border-r-0 relative">
                            {/* Hour slots */}
                            {timeSlots.map((hour) => (
                              <div key={hour} className="h-[60px] border-b border-gray-100"></div>
                            ))}
                            
                            {/* Events */}
                            {dayEvents.map((event, eventIdx) => {
                              const style = getEventStyle(event);
                              const startDate = parseLocalDateTime(event.start);
                              const endDate = parseLocalDateTime(event.end);
                              const color = getEventColor(event);
                              const eventIndex = findEventIndex(event);
                              
                              // Drag handlers
                              const handleMouseDown = (e: React.MouseEvent) => {
                                if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                                e.preventDefault();
                                e.stopPropagation();
                                setWasDragging(false);
                                const startDate = parseLocalDateTime(event.start);
                                const endDate = parseLocalDateTime(event.end);
                                setDraggedEvent({ 
                                  event, 
                                  index: eventIndex, 
                                  startX: e.clientX,
                                  startY: e.clientY, 
                                  dayIndex: dayIdx,
                                  originalStart: startDate,
                                  originalEnd: endDate
                                });
                              };

                              const handleResizeStart = (e: React.MouseEvent, isEnd: boolean) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setResizingEvent({ event, index: eventIndex, startY: e.clientY, isEnd });
                              };
                              
                              return (
                                <div
                                  key={`${eventIndex}-${event.start}-${event.end}`}
                                  className="absolute left-1 right-1 rounded px-2 py-1 text-xs cursor-move transition-opacity hover:opacity-90 shadow-sm z-10 border-l-2 group"
                                  style={{
                                    ...style,
                                    backgroundColor: color.bg,
                                    color: color.text,
                                    borderLeftColor: color.border,
                                  }}
                                  title={`${event.title}\n${formatTime(startDate)} - ${formatTime(endDate)}\nClick to edit, drag to move time, drag edges to resize`}
                                  onMouseDown={handleMouseDown}
                                  onClick={(e) => {
                                    if (!wasDragging && !draggedEvent && !resizingEvent) {
                                      setEditingEvent({ event, index: eventIndex });
                                    }
                                    setWasDragging(false);
                                  }}
                                >
                                  {/* Resize handle - top */}
                                  <div
                                    className="resize-handle absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-black hover:bg-opacity-20 rounded-t"
                                    onMouseDown={(e) => handleResizeStart(e, false)}
                                  />
                                  
                                  <div className="font-semibold truncate">{event.title}</div>
                                  <div className={`text-[10px] truncate ${color.text === '#ffffff' ? 'opacity-90' : 'opacity-70'}`}>
                                    {formatTime(startDate)} - {formatTime(endDate)}
                                  </div>
                                  
                                  {/* Resize handle - bottom */}
                                  <div
                                    className="resize-handle absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-black hover:bg-opacity-20 rounded-b"
                                    onMouseDown={(e) => handleResizeStart(e, true)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                // Month view
                <div className="p-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="bg-white p-2 text-center text-xs font-medium text-gray-600">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-px bg-gray-200">
                    {monthDays.map((day, idx) => {
                      const dateKey = day.toISOString().split('T')[0];
                      const dayEvents = eventsByDate[dateKey] || [];
                      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <div
                          key={idx}
                          className={`bg-white min-h-[100px] p-1 ${!isCurrentMonth ? 'opacity-40' : ''}`}
                        >
                          <div className={`text-sm font-medium mb-1 ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-800'}`}>
                            {getDayNumber(day)}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map((event, eventIdx) => {
                              const startDate = parseLocalDateTime(event.start);
                              const color = getEventColor(event);
                              const eventIndex = findEventIndex(event);
                              
                              return (
                                <div
                                  key={eventIdx}
                                  className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 border-l-2"
                                  style={{
                                    backgroundColor: color.bg,
                                    color: color.text,
                                    borderLeftColor: color.border,
                                  }}
                                  title={`${event.title} - ${formatTime(startDate)}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEvent({ event, index: eventIndex });
                                  }}
                                >
                                  {event.title}
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 px-1">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                {localEvents.length} event{localEvents.length !== 1 ? 's' : ''} • Timezone: {timezone}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setEditingEvent(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Edit Event</h3>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <EventEditForm
                event={editingEvent.event}
                timezone={timezone}
                onSave={(updatedEvent) => {
                  updateEvent(editingEvent.index, updatedEvent);
                  setEditingEvent(null);
                }}
                onCancel={() => setEditingEvent(null)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Event Edit Form Component
interface EventEditFormProps {
  event: ScheduleEvent;
  timezone: string;
  onSave: (event: ScheduleEvent) => void;
  onCancel: () => void;
}

const EventEditForm: React.FC<EventEditFormProps> = ({ event, timezone, onSave, onCancel }) => {
  const [editedEvent, setEditedEvent] = useState<ScheduleEvent>(event);

  const parseLocalDateTime = (dateTimeStr: string): Date => {
    const [datePart, timePart] = dateTimeStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const timeComponents = (timePart || '00:00').split(':').map(Number);
    const [hours, minutes] = timeComponents;
    return new Date(year, month - 1, day, hours, minutes);
  };

  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const startDate = parseLocalDateTime(editedEvent.start);
  const endDate = parseLocalDateTime(editedEvent.end);

  const handleDateChange = (date: Date | null, field: 'start' | 'end') => {
    if (!date) return;
    const currentDate = field === 'start' ? startDate : endDate;
    const newDate = new Date(date);
    newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
    setEditedEvent({
      ...editedEvent,
      [field]: formatLocalDateTime(newDate),
    });
  };

  const handleTimeChange = (time: string | null, field: 'start' | 'end') => {
    if (!time) return;
    const [hours, minutes] = time.split(':').map(Number);
    const currentDate = field === 'start' ? startDate : endDate;
    const newDate = new Date(currentDate);
    newDate.setHours(hours, minutes, 0, 0);
    setEditedEvent({
      ...editedEvent,
      [field]: formatLocalDateTime(newDate),
    });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const colorId = e.target.value || undefined;
    setEditedEvent({ ...editedEvent, colorId });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={editedEvent.title}
          onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md"
          style={{ color: 'black' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => handleDateChange(date, 'start')}
            dateFormat="MMM dd, yyyy"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <TimePicker
            onChange={(time) => handleTimeChange(time as string | null, 'start')}
            value={formatTime(startDate)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => handleDateChange(date, 'end')}
            dateFormat="MMM dd, yyyy"
            className="w-full p-2 border border-gray-300 rounded-md"
            minDate={startDate}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <TimePicker
            onChange={(time) => handleTimeChange(time as string | null, 'end')}
            value={formatTime(endDate)}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={editedEvent.description || ''}
          onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={3}
          style={{ color: 'black' }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
        <select
          value={editedEvent.colorId || ''}
          onChange={handleColorChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          style={{ color: 'black' }}
        >
          <option value="">Auto (cycle through colors)</option>
          <option value="1">Lavender</option>
          <option value="2">Sage</option>
          <option value="3">Grape</option>
          <option value="4">Flamingo</option>
          <option value="5">Banana</option>
          <option value="6">Tangerine</option>
          <option value="7">Peacock</option>
          <option value="8">Graphite</option>
          <option value="9">Blueberry</option>
          <option value="10">Basil</option>
          <option value="11">Tomato</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(editedEvent)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default CalendarPreview;

