import React, { useState } from 'react';
import { Event } from '@/types/Event';

interface EditableEventProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
}

const EditableEvent: React.FC<EditableEventProps> = ({ event, onUpdate }) => {
  const [editedEvent, setEditedEvent] = useState<Event>(event);
  const [editingField, setEditingField] = useState<string | null>(null);

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
            onBlur={() => setEditingField(null)}
          />
          <span>(</span>
          <input
            type="text"
            value={editedEvent.courseCode}
            onChange={(e) => handleChange(e, 'courseCode')}
            className={`${getInputClass('courseCode')} w-24`}
            onFocus={() => setEditingField('courseCode')}
            onBlur={() => setEditingField(null)}
          />
          <span>)</span>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center">
            <span className="font-semibold w-24">Type:</span>
            <input
              type="text"
              value={editedEvent.meetingTime.type}
              onChange={(e) => handleChange(e, 'meetingTime', 'type')}
              className={`${getInputClass('type')} w-32`}
              onFocus={() => setEditingField('type')}
              onBlur={() => setEditingField(null)}
            />
          </div>

          <div className="flex items-center">
            <span className="font-semibold w-24">Time:</span>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={editedEvent.meetingTime.startTime}
                onChange={(e) => handleChange(e, 'meetingTime', 'startTime')}
                className={`${getInputClass('startTime')} w-24`}
                onFocus={() => setEditingField('startTime')}
                onBlur={() => setEditingField(null)}
              />
              <span>-</span>
              <input
                type="text"
                value={editedEvent.meetingTime.endTime}
                onChange={(e) => handleChange(e, 'meetingTime', 'endTime')}
                className={`${getInputClass('endTime')} w-24`}
                onFocus={() => setEditingField('endTime')}
                onBlur={() => setEditingField(null)}
              />
            </div>
          </div>

          <div className="flex items-center">
            <span className="font-semibold w-24">Days:</span>
            <input
              type="text"
              value={editedEvent.meetingTime.days.join(', ')}
              onChange={(e) => handleChange(e, 'meetingTime', 'days')}
              className={`${getInputClass('days')} w-40`}
              onFocus={() => setEditingField('days')}
              onBlur={() => setEditingField(null)}
            />
          </div>

          <div className="flex items-center">
            <span className="font-semibold w-24">Location:</span>
            <input
              type="text"
              value={editedEvent.meetingTime.location}
              onChange={(e) => handleChange(e, 'meetingTime', 'location')}
              className={`${getInputClass('location')} w-64`}
              onFocus={() => setEditingField('location')}
              onBlur={() => setEditingField(null)}
            />
          </div>

          <div className="flex items-center">
            <span className="font-semibold w-24">Instructor:</span>
            <input
              type="text"
              value={editedEvent.meetingTime.instructor}
              onChange={(e) => handleChange(e, 'meetingTime', 'instructor')}
              className={`${getInputClass('instructor')} w-64`}
              onFocus={() => setEditingField('instructor')}
              onBlur={() => setEditingField(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableEvent;
