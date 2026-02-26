import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  MegaphoneIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { ChatMessage, ChatUser } from '../../utils/chatSystemNew';

interface GlobalChatProps {
  buildingAddress: string;
  currentUser: ChatUser;
  onSendMessage: (message: string, type: 'text' | 'announcement', targetAudience: 'all' | 'tenants' | 'landlords') => void;
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: number;
}

const GlobalChat: React.FC<GlobalChatProps> = ({
  buildingAddress,
  currentUser,
  onSendMessage,
  messages,
  isOpen,
  onClose,
  onlineUsers
}) => {
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'announcement'>('text');
  const [targetAudience, setTargetAudience] = useState<'all' | 'tenants' | 'landlords'>('all');
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim(), messageType, targetAudience);
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Šiandien';
    } else if (messageDate.toDateString() === new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString()) {
      return 'Vakar';
    } else {
      return `${messageDate.getFullYear()}-${String(messageDate.getMonth() + 1).padStart(2, '0')}-${String(messageDate.getDate()).padStart(2, '0')}`;
    }
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCircleIcon className="w-3 h-3 text-blue-500" />;
      case 'delivered':
        return <CheckIcon className="w-3 h-3 text-gray-400" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#2f8481] rounded-full flex items-center justify-center">
            <UserGroupIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{buildingAddress}</h3>
            <p className="text-xs text-gray-500">{onlineUsers} prisijungę</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1 text-gray-400 hover:text-[#2f8481] transition-colors"
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Options */}
      {showOptions && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-700">Tipas:</label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'text' | 'announcement')}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#2f8481] focus:border-[#2f8481]"
              >
                <option value="text">Pranešimas</option>
                <option value="announcement">Pranešimas</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-700">Auditorija:</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as 'all' | 'tenants' | 'landlords')}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#2f8481] focus:border-[#2f8481]"
              >
                <option value="all">Visi</option>
                <option value="tenants">Nuomininkai</option>
                <option value="landlords">Nuomotojai</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="w-12 h-12 text-[#2f8481] mx-auto mb-2" />
            <p className="text-gray-500">Dar nėra pranešimų. Būkite pirmas!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender === currentUser.id;
            const showDate = index === 0 ||
              new Date(message.timestamp).toDateString() !==
              new Date(messages[index - 1].timestamp).toDateString();

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="text-center my-4">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                )}

                <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs ${isOwnMessage
                      ? 'bg-[#2f8481] text-white shadow-lg'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                    } rounded-lg px-3 py-2`}>
                    {!isOwnMessage && (
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          {message.sender === 'landlord-1' ? 'Nuomotojas' : `Nuomininkas ${message.sender.split('-')[1]}`}
                        </span>
                        {message.type === 'announcement' && (
                          <MegaphoneIcon className="w-3 h-3 text-orange-500" />
                        )}
                      </div>
                    )}

                    <p className="text-sm">{message.text}</p>

                    <div className={`flex items-center justify-between mt-1 ${isOwnMessage ? 'text-white' : 'text-gray-500'
                      }`}>
                      <span className="text-xs">{formatTime(message.timestamp)}</span>
                      {isOwnMessage && getMessageStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Parašykite pranešimą..."
              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs resize-none focus:ring-2 focus:ring-[#2f8481] focus:border-[#2f8481]"
              rows={1}
              style={{ minHeight: '32px', maxHeight: '80px' }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="p-1.5 bg-[#2f8481] text-white rounded-lg hover:bg-[#2a7673] disabled:opacity- disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-3 h-3" />
          </button>
        </div>

        {messageType === 'announcement' && (
          <div className="mt-1 p-1.5 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center space-x-1">
              <MegaphoneIcon className="w-3 h-3 text-yellow-600" />
              <span className="text-xs text-yellow-800">
                Siunčiate pranešimą {targetAudience === 'all' ? 'visiems' : targetAudience === 'tenants' ? 'nuomininkams' : 'nuomotojams'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalChat; 