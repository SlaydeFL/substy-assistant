export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  category: 'Sport' | 'Médical' | 'Social' | 'Travail' | 'Personnel' | 'Famille' | 'Autre';
  location?: string;
  duration?: number;
}

export interface ChatState {
  messages: Message[];
  events: CalendarEvent[];
  isTyping: boolean;
} 