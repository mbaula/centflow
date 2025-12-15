"use client";
import React, { useState, useEffect } from 'react';
import { ScheduleEvent } from '@/types/ScheduleEvent';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

interface ScheduleEventEditorProps {
  event: ScheduleEvent;
  onUpdate: (updatedEvent: ScheduleEvent) => void;
  timezone: string;
}

const ScheduleEventEditor: React.FC<ScheduleEventEditorProps> = ({ event, onUpdate, timezone }) => {
  const [editedEvent, setEditedEvent] = useState<ScheduleEvent>(event);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Update local state when event prop changes
  useEffect(() => {
    setEditedEvent(event);
  }, [event]);

  // Parse ISO datetime string as local time (format: YYYY-MM-DDTHH:mm)
  const parseLocalDateTime = (dateTimeStr: string): Date => {
    const [datePart, timePart] = dateTimeStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Parse ISO datetime strings as local time
  const startDate = parseLocalDateTime(editedEvent.start);
  const endDate = parseLocalDateTime(editedEvent.end);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...editedEvent, title: e.target.value };
    setEditedEvent(updated);
    onUpdate(updated);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = { ...editedEvent, description: e.target.value };
    setEditedEvent(updated);
    onUpdate(updated);
  };

  // Format date as YYYY-MM-DDTHH:mm in local time
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleDateChange = (date: Date | null, field: 'start' | 'end') => {
    if (!date) return;
    
    const currentDate = field === 'start' ? startDate : endDate;
    const newDate = new Date(date);
    newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
    
    const updated = {
      ...editedEvent,
      [field]: formatLocalDateTime(newDate)
    };
    setEditedEvent(updated);
    onUpdate(updated);
  };

  const handleTimeChange = (time: string | null, field: 'start' | 'end') => {
    if (!time) return;
    
    const [hours, minutes] = time.split(':').map(Number);
    const currentDate = field === 'start' ? startDate : endDate;
    const newDate = new Date(currentDate);
    newDate.setHours(hours, minutes, 0, 0);
    
    const updated = {
      ...editedEvent,
      [field]: formatLocalDateTime(newDate)
    };
    setEditedEvent(updated);
    onUpdate(updated);
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const colorId = e.target.value || undefined;
    const updated = { ...editedEvent, colorId };
    setEditedEvent(updated);
    onUpdate(updated);
  };

  const getInputClass = (fieldName: string) => {
    return `cursor-pointer hover:bg-gray-100 focus:outline-none px-2 py-1 rounded border ${
      editingField === fieldName
        ? 'bg-white text-black border-blue-300'
        : 'bg-transparent text-gray-700 border-transparent'
    }`;
  };

  const CALENDAR_COLORS = [
    { id: '1', name: 'Lavender' },
    { id: '2', name: 'Sage' },
    { id: '3', name: 'Grape' },
    { id: '4', name: 'Flamingo' },
    { id: '5', name: 'Banana' },
    { id: '6', name: 'Tangerine' },
    { id: '7', name: 'Peacock' },
    { id: '8', name: 'Graphite' },
    { id: '9', name: 'Blueberry' },
    { id: '10', name: 'Basil' },
    { id: '11', name: 'Tomato' },
  ];

  return (
    <div className="p-4 relative bg-gray-50 border-b border-gray-200">
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={editedEvent.title}
            onChange={handleTitleChange}
            className={`font-bold text-lg w-full ${getInputClass('title')}`}
            onFocus={() => setEditingField('title')}
            onBlur={() => setEditingField(null)}
            placeholder="Event Title"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <span className="font-semibold w-24 text-gray-600">Start Date:</span>
            <DatePicker
              selected={startDate}
              onChange={(date) => handleDateChange(date, 'start')}
              dateFormat="MMM dd, yyyy"
              className="bg-white text-gray-700 border border-gray-300 rounded px-2 py-1 w-32"
            />
          </div>

          <div className="flex items-center">
            <span className="font-semibold w-24 text-gray-600">Start Time:</span>
            <TimePicker
              onChange={(time) => handleTimeChange(time as string | null, 'start')}
              value={formatTime(startDate)}
              className="bg-white text-gray-700 border border-gray-300 rounded px-2 py-1"
            />
          </div>

          <div className="flex items-center">
            <span className="font-semibold w-24 text-gray-600">End Date:</span>
            <DatePicker
              selected={endDate}
              onChange={(date) => handleDateChange(date, 'end')}
              dateFormat="MMM dd, yyyy"
              className="bg-white text-gray-700 border border-gray-300 rounded px-2 py-1 w-32"
              minDate={startDate}
            />
          </div>

          <div className="flex items-center">
            <span className="font-semibold w-24 text-gray-600">End Time:</span>
            <TimePicker
              onChange={(time) => handleTimeChange(time as string | null, 'end')}
              value={formatTime(endDate)}
              className="bg-white text-gray-700 border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </div>

        <div>
          <span className="font-semibold text-gray-600 block mb-2">Description:</span>
          <textarea
            value={editedEvent.description || ''}
            onChange={handleDescriptionChange}
            className={`w-full p-2 rounded border ${getInputClass('description')}`}
            onFocus={() => setEditingField('description')}
            onBlur={() => setEditingField(null)}
            rows={2}
            placeholder="Event description (optional)"
          />
        </div>

        <div className="flex items-center">
          <span className="font-semibold w-24 text-gray-600">Color:</span>
          <select
            value={editedEvent.colorId || ''}
            onChange={handleColorChange}
            className="bg-white text-gray-700 border border-gray-300 rounded px-2 py-1"
            onFocus={() => setEditingField('colorId')}
            onBlur={() => setEditingField(null)}
          >
            <option value="">Auto (cycle through colors)</option>
            {CALENDAR_COLORS.map((color) => (
              <option key={color.id} value={color.id}>
                {color.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ScheduleEventEditor;

