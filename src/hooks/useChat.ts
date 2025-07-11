import { useState, useCallback, useEffect } from 'react';
import { Message, CalendarEvent, ChatState } from '../types';

export const useChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      {
        id: '1',
        type: 'system',
        content: 'Substy AI connecté. Comment puis-je vous aider avec votre calendrier aujourd\'hui ?',
        timestamp: new Date()
      }
    ],
    events: [],
    isTyping: false
  });

  // Charger les événements depuis le serveur
  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/events');
      if (response.ok) {
        const backendEvents = await response.json();
        // Adapter la structure des données du backend au frontend
        const adaptedEvents = backendEvents.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          dateTime: event.start, // Utiliser 'start' du backend comme 'dateTime' pour le frontend
          category: event.category,
          location: event.location,
          duration: event.end ? Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60)) : undefined
        }));
        setChatState(prev => ({
          ...prev,
          events: adaptedEvents
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    }
  }, []);

  // Charger les événements au démarrage
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: content })
      });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessage],
          isTyping: false
        }));

        // Recharger les événements après chaque interaction
        await loadEvents();
      } else {
        throw new Error('Erreur du serveur');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
        timestamp: new Date()
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isTyping: false
      }));
    }
  }, [loadEvents]);

  return {
    ...chatState,
    sendMessage,
    refreshEvents: loadEvents
  };
}; 