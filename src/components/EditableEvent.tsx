import React, { useState } from 'react';
import { Event } from '@/types/Event';
import { toast } from 'react-toastify';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

interface EditableEventProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EditableEvent: React.FC<EditableEventProps> = ({ event, onUpdate }) => {
  const [editedEvent, setEditedEvent] = useState<Event>(event);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateField = (field: string, value: string) => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, [field]: 'This field is required.' }));
      return false;
    } else {
      setErrors((prev) => ({ ...prev, [field]: '' }));
      return true;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, subfield?: string) => {
    const { value } = e.target;
    const updatedEvent = subfield
      ? {
          ...editedEvent,
          meetingTime: {
            ...editedEvent.meetingTime,
            [subfield]: value,
          },
        }
      : {
          ...editedEvent,
          [field]: value,
        };

    // Validate the field
    if (validateField(field, value)) {
      setEditedEvent(updatedEvent);
      onUpdate(updatedEvent);
    }
  };

  const handleBlur = (field: string, value: string) => {
    if (!validateField(field, value)) {
      // Revert to previous value and show toast
      toast.error('This field is required. Reverting to previous value.');
      setEditedEvent(event); // Revert to original event
    }
    setEditingField(null);
  };

  const handleTimeChange = (time: string | null, field: 'startTime' | 'endTime') => {
    if (!time) {
      toast.error(`${field === 'startTime' ? 'Start' : 'End'} time is required`);
      return;
    }

    const updatedEvent = {
      ...editedEvent,
      meetingTime: {
        ...editedEvent.meetingTime,
        [field]: time,
      },
    };
    setEditedEvent(updatedEvent);
    onUpdate(updatedEvent);
  };

  const handleDayChange = (days: string[]) => {
    const updatedEvent = {
      ...editedEvent,
      meetingTime: {
        ...editedEvent.meetingTime,
        days,
      },
    };
    setEditedEvent(updatedEvent);
    onUpdate(updatedEvent);
  };

  const getInputClass = (fieldName: string) => {
    return `cursor-pointer hover:opacity-80 focus:outline-none px-1 rounded ${
      editingField === fieldName
        ? 'bg-white text-black'
        : 'bg-transparent text-white'
    }`;
  };

  return (
    <div className="border p-4 rounded-md relative bg-black">
      <div className="space-y-3">
        <div className="flex gap-2 items-baseline">
          <input
            type="text"
            value={editedEvent.courseName}
            onChange={(e) => handleChange(e, 'courseName')}
            className={`font-bold text-lg max-w-[300px] ${getInputClass('courseName')}`}
            onFocus={() => setEditingField('courseName')}
            onBlur={() => handleBlur('courseName', editedEvent.courseName)}
          />
          <span>(</span>
          <input
            type="text"
            value={editedEvent.courseCode}
            onChange={(e) => handleChange(e, 'courseCode')}
            className={`${getInputClass('courseCode')} w-24`}
            onFocus={() => setEditingField('courseCode')}
            onBlur={() => handleBlur('courseCode', editedEvent.courseCode)}
          />
          <span>)</span>
        </div>
        {errors.courseName && <p className="text-red-500 text-sm">{errors.courseName}</p>}
        {errors.courseCode && <p className="text-red-500 text-sm">{errors.courseCode}</p>}

        <div className="grid gap-3">
          <div className="flex items-center">
            <span className="font-semibold w-24">Type:</span>
            <input
              type="text"
              value={editedEvent.meetingTime.type}
              onChange={(e) => handleChange(e, 'meetingTime', 'type')}
              className={`${getInputClass('type')} w-32`}
              onFocus={() => setEditingField('type')}
              onBlur={() => handleBlur('type', editedEvent.meetingTime.type)}
            />
          </div>
          {errors.type && <p className="text-red-500 text-sm">{errors.type}</p>}

          <div className="flex items-center">
            <span className="font-semibold w-24">Time:</span>
            <div className="flex gap-2 items-center">
              <TimePicker
                onChange={(time) => handleTimeChange(time, 'startTime')}
                value={editedEvent.meetingTime.startTime}
                className="time-picker-custom"
                clearIcon={null}
                clockIcon={null}
                format="hh:mm a"
                disableClock={true}
              />
              <span>-</span>
              <TimePicker
                onChange={(time) => handleTimeChange(time, 'endTime')}
                value={editedEvent.meetingTime.endTime}
                className="time-picker-custom"
                clearIcon={null}
                clockIcon={null}
                format="hh:mm a"
                disableClock={true}
              />
            </div>
          </div>
          {errors.startTime && <p className="text-red-500 text-sm">{errors.startTime}</p>}
          {errors.endTime && <p className="text-red-500 text-sm">{errors.endTime}</p>}

          <div className="flex items-center">
            <span className="font-semibold w-24">Days:</span>
            <div className="flex gap-2 flex-wrap">
              {daysOfWeek.map((day) => (
                <label
                  key={day}
                  className={`flex items-center cursor-pointer px-2 py-1 rounded ${
                    editedEvent.meetingTime.days.includes(day)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={editedEvent.meetingTime.days.includes(day)}
                    onChange={() => handleDayChange([day])}
                    className="hidden"
                  />
                  <span>{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          </div>
          {errors.days && <p className="text-red-500 text-sm">{errors.days}</p>}

          <div className="flex items-center">
            <span className="font-semibold w-24">Location:</span>
            <input
              type="text"
              value={editedEvent.meetingTime.location}
              onChange={(e) => handleChange(e, 'meetingTime', 'location')}
              className={`${getInputClass('location')} w-64`}
              onFocus={() => setEditingField('location')}
              onBlur={() => handleBlur('location', editedEvent.meetingTime.location)}
            />
          </div>
          {errors.location && <p className="text-red-500 text-sm">{errors.location}</p>}

          <div className="flex items-center">
            <span className="font-semibold w-24">Instructor:</span>
            <input
              type="text"
              value={editedEvent.meetingTime.instructor}
              onChange={(e) => handleChange(e, 'meetingTime', 'instructor')}
              className={`${getInputClass('instructor')} w-64`}
              onFocus={() => setEditingField('instructor')}
              onBlur={() => handleBlur('instructor', editedEvent.meetingTime.instructor)}
            />
          </div>
          {errors.instructor && <p className="text-red-500 text-sm">{errors.instructor}</p>}
        </div>
      </div>
    </div>
  );
};

export default EditableEvent;
