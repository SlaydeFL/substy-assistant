import React from 'react';
import { Bot, User, Info } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const getIcon = () => {
    switch (message.type) {
      case 'user':
        return <User className="w-5 h-5" />;
      case 'assistant':
        return <Bot className="w-5 h-5" />;
      case 'system':
        return <Info className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getMessageStyles = () => {
    switch (message.type) {
      case 'user':
        return 'ml-auto bg-blue-500 text-white';
      case 'assistant':
        return 'mr-auto bg-gray-100 text-gray-800';
      case 'system':
        return 'mx-auto bg-purple-50 text-purple-800 border border-purple-200';
      default:
        return '';
    }
  };

  const getContainerStyles = () => {
    switch (message.type) {
      case 'user':
        return 'flex justify-end';
      case 'assistant':
        return 'flex justify-start';
      case 'system':
        return 'flex justify-center';
      default:
        return '';
    }
  };

  return (
    <div className={`mb-4 ${getContainerStyles()}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getMessageStyles()} shadow-sm`}>
        <div className="flex items-start space-x-2">
          {message.type !== 'user' && (
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm leading-relaxed">{message.content}</p>
            <p className="text-xs mt-1 opacity-70">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {message.type === 'user' && (
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 