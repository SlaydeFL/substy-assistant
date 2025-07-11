export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    description?: string;
    category?: string;
    color?: string;
}
export declare const Calendar: {
    list(): CalendarEvent[];
    create(event: Omit<CalendarEvent, "id">): CalendarEvent;
    conflicts(startIso: string, endIso: string): CalendarEvent[];
    delete(eventId: string): boolean;
    findByTimeAndContext(day: string, hour?: number, context?: string): CalendarEvent[];
};
