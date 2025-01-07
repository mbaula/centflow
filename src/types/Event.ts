export interface Event {
  courseCode: string;
  courseName: string;
  meetingTime: {
    type: string;
    startTime: string;
    endTime: string;
    days: string[];
    location: string;
    dateRange: {
      start: Date;
      end: Date;
    };
    instructor: string;
  };
  rawText: string;
}