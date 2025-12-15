export interface ScheduleEvent {
  title: string;
  start: string; // ISO format: "2025-12-15T10:00"
  end: string; // ISO format: "2025-12-15T12:00"
  description?: string;
  colorId?: string; // Optional Google Calendar color ID (1-11)
}

export interface ScheduleData {
  timezone: string;
  events: ScheduleEvent[];
}

