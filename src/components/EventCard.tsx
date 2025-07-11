import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { CalendarEvent } from '../types';

interface EventCardProps {
  event: CalendarEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const getCategoryIcon = () => {
    switch (event.category) {
      case 'Sport':
        return '🏃‍♂️';
      case 'Médical':
        return '🏥';
      case 'Social':
        return '🎉';
      case 'Travail':
        return '💼';
      case 'Personnel':
        return '📝';
      case 'Famille':
        return '👨‍👩‍👧‍👦';
      default:
        return '📅';
    }
  };

  const getCategoryColor = () => {
    switch (event.category) {
      case 'Sport':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Médical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Social':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Travail':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Personnel':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Famille':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    // Gérer le cas où la dateTime est déjà un objet Date ou une string
    const date = typeof dateTimeString === 'string' ? new Date(dateTimeString) : dateTimeString;
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      console.warn('Date invalide reçue:', dateTimeString);
      return {
        date: 'Date invalide',
        time: 'Heure invalide'
      };
    }
    
    return {
      date: date.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      }),
      time: date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const { date, time } = formatDateTime(event.dateTime);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getCategoryIcon()}</span>
          <h3 className="font-semibold text-gray-800 text-sm">{event.title}</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor()}`}>
          {event.category}
        </span>
      </div>
      
      {event.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>
      )}
      
      <div className="space-y-2">
        <div className="flex items-center text-gray-500 text-xs">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{date}</span>
        </div>
        
        <div className="flex items-center text-gray-500 text-xs">
          <Clock className="w-4 h-4 mr-2" />
          <span>{time}</span>
          {event.duration && (
            <span className="ml-2">({event.duration}min)</span>
          )}
        </div>
        
        {event.location && (
          <div className="flex items-center text-gray-500 text-xs">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}; 