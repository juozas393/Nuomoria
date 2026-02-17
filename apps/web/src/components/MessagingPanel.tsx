import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChatBubbleLeftRightIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    UserIcon,
    ChevronLeftIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import { messagesApi, Message, Conversation } from '../lib/database';

interface MessagingPanelProps {
    currentUserId: string;
    currentUserName?: string;
}

const MessagingPanel: React.FC<MessagingPanelProps> = ({
    currentUserId,
    currentUserName
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load conversations
    const loadConversations = useCallback(async () => {
        try {
            const data = await messagesApi.getMyConversations();
            setConversations(data);
        } catch (err) {
            console.error('Error loading conversations:', err);
        }
    }, []);

    // Load unread count
    const loadUnreadCount = useCallback(async () => {
        try {
            const count = await messagesApi.getUnreadCount();
            setUnreadCount(count);
        } catch (err) {
            console.error('Error loading unread count:', err);
        }
    }, []);

    // Load on mount
    useEffect(() => {
        loadConversations();
        loadUnreadCount();
    }, [loadConversations, loadUnreadCount]);

    // Load messages when conversation selected
    const loadMessages = useCallback(async (conversationId: string) => {
        setLoading(true);
        try {
            const data = await messagesApi.getMessages(conversationId);
            setMessages(data);
            // Mark as read
            await messagesApi.markAsRead(conversationId);
            loadUnreadCount();
        } catch (err) {
            console.error('Error loading messages:', err);
        } finally {
            setLoading(false);
        }
    }, [loadUnreadCount]);

    // Subscribe to realtime messages
    useEffect(() => {
        if (!selectedConversation) return;

        const channel = messagesApi.subscribeToMessages(selectedConversation.id, (newMsg) => {
            setMessages(prev => [...prev, newMsg]);
            // Mark as read if not from current user
            if (newMsg.sender_id !== currentUserId) {
                messagesApi.markAsRead(selectedConversation.id);
            }
        });

        return () => {
            messagesApi.unsubscribe(channel);
        };
    }, [selectedConversation, currentUserId]);

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConversation(conv);
        loadMessages(conv.id);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            await messagesApi.sendMessage(selectedConversation.id, content);
            // Message will appear via realtime subscription
        } catch (err) {
            console.error('Error sending message:', err);
            setNewMessage(content); // Restore on error
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Šiandien';
        if (date.toDateString() === yesterday.toDateString()) return 'Vakar';
        return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
    };

    const getOtherParticipantId = (conv: Conversation) => {
        return conv.participant_1 === currentUserId ? conv.participant_2 : conv.participant_1;
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#2F8481] text-white rounded-full shadow-lg hover:bg-[#267673] transition-colors hover:scale-105 flex items-center justify-center"
            >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#2F8481] to-[#35918e] px-4 py-3 flex items-center gap-3">
                        {selectedConversation ? (
                            <>
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 text-white" />
                                </button>
                                <div className="flex-1">
                                    <div className="font-medium text-white truncate">
                                        {selectedConversation.other_user?.full_name ||
                                            selectedConversation.other_user?.email?.split('@')[0] ||
                                            'Naudotojas'}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
                                <div className="font-medium text-white">Žinutės</div>
                            </>
                        )}
                        <button
                            onClick={() => { setIsOpen(false); setSelectedConversation(null); }}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-auto"
                        >
                            <XMarkIcon className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Content */}
                    {selectedConversation ? (
                        /* Messages View */
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="w-6 h-6 border-2 border-[#2F8481] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2" />
                                        <p>Nėra žinučių</p>
                                        <p className="text-sm">Pradėkite pokalbį!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const isOwn = msg.sender_id === currentUserId;
                                        const showDate = index === 0 ||
                                            formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at);

                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDate && (
                                                    <div className="text-center text-xs text-gray-400 py-2">
                                                        {formatDate(msg.created_at)}
                                                    </div>
                                                )}
                                                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.message_type === 'invitation_code'
                                                            ? 'bg-gradient-to-br from-[#2F8481] to-[#1a6b68] text-white'
                                                            : isOwn
                                                                ? 'bg-[#2F8481] text-white'
                                                                : 'bg-white border border-gray-200 text-gray-800'
                                                        }`}>
                                                        {msg.message_type === 'invitation_code' && (
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <KeyIcon className="w-4 h-4" />
                                                                <span className="text-xs opacity-80">Kvietimo kodas</span>
                                                            </div>
                                                        )}
                                                        <p className={msg.message_type === 'invitation_code' ? 'font-mono text-lg' : ''}>
                                                            {msg.message_type === 'invitation_code' && msg.metadata?.code
                                                                ? msg.metadata.code
                                                                : msg.content}
                                                        </p>
                                                        <div className={`text-xs mt-1 ${isOwn || msg.message_type === 'invitation_code'
                                                                ? 'text-white/60'
                                                                : 'text-gray-400'
                                                            }`}>
                                                            {formatTime(msg.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t border-gray-200 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Rašykite žinutę..."
                                        className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-[#2F8481]/30 outline-none"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        className="p-2.5 bg-[#2F8481] text-white rounded-xl hover:bg-[#267673] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Conversations List */
                        <div className="flex-1 overflow-y-auto">
                            {conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                                    <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2" />
                                    <p>Nėra pokalbių</p>
                                    <p className="text-sm text-center mt-1">
                                        Pokalbiai prasidės kai turėsite susijusių nuomininkų
                                    </p>
                                </div>
                            ) : (
                                conversations.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => handleSelectConversation(conv)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left"
                                    >
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                            <UserIcon className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">
                                                {conv.other_user?.full_name ||
                                                    conv.other_user?.email?.split('@')[0] ||
                                                    `Naudotojas`}
                                            </div>
                                            {conv.last_message && (
                                                <div className="text-sm text-gray-500 truncate">
                                                    {conv.last_message.content}
                                                </div>
                                            )}
                                        </div>
                                        {conv.unread_count && conv.unread_count > 0 && (
                                            <span className="w-5 h-5 bg-[#2F8481] text-white text-xs rounded-full flex items-center justify-center">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default MessagingPanel;
