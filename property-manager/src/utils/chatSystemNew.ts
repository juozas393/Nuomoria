export interface ChatUser {
  id: string;
  name: string;
  type: 'tenant' | 'landlord' | 'admin';
  apartmentNumber?: string;
  isOnline: boolean;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  receiver?: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'document' | 'announcement';
  isUrgent: boolean;
  targetAudience?: 'all' | 'tenants' | 'landlords';
  buildingAddress?: string;
}

export interface IndividualChat {
  id: string;
  participants: string[];
  messages: ChatMessage[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface GlobalChat {
  id: string;
  buildingAddress: string;
  messages: ChatMessage[];
  participants: ChatUser[];
  onlineUsers: number;
}

class ChatSystem {
  private individualChats: Map<string, IndividualChat> = new Map();
  private globalChats: Map<string, GlobalChat> = new Map();
  private users: Map<string, ChatUser> = new Map();
  private messageHistory: ChatMessage[] = [];

  // User management
  addUser(user: ChatUser) {
    this.users.set(user.id, user);
  }

  getUser(userId: string): ChatUser | undefined {
    return this.users.get(userId);
  }

  getOnlineUsers(): ChatUser[] {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }

  updateUserStatus(userId: string, isOnline: boolean) {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = isOnline;
      this.users.set(userId, user);
    }
  }

  // Individual chat management
  getIndividualChat(user1Id: string, user2Id: string): IndividualChat | undefined {
    const chatId = this.getChatId(user1Id, user2Id);
    return this.individualChats.get(chatId);
  }

  createIndividualChat(user1Id: string, user2Id: string): IndividualChat {
    const chatId = this.getChatId(user1Id, user2Id);
    const chat: IndividualChat = {
      id: chatId,
      participants: [user1Id, user2Id],
      messages: [],
      unreadCount: 0
    };
    this.individualChats.set(chatId, chat);
    return chat;
  }

  private getChatId(user1Id: string, user2Id: string): string {
    return [user1Id, user2Id].sort().join('-');
  }

  // Global chat management
  getGlobalChat(buildingAddress: string): GlobalChat | undefined {
    return this.globalChats.get(buildingAddress);
  }

  createGlobalChat(buildingAddress: string): GlobalChat {
    const chat: GlobalChat = {
      id: buildingAddress,
      buildingAddress,
      messages: [],
      participants: [],
      onlineUsers: 0
    };
    this.globalChats.set(buildingAddress, chat);
    return chat;
  }

  // Message sending
  sendIndividualMessage(senderId: string, receiverId: string, messageText: string, isUrgent: boolean = false): ChatMessage | null {
    const sender = this.users.get(senderId);
    const receiver = this.users.get(receiverId);
    
    if (!sender || !receiver) return null;

    let chat = this.getIndividualChat(senderId, receiverId);
    if (!chat) {
      chat = this.createIndividualChat(senderId, receiverId);
    }

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: senderId,
      receiver: receiverId,
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
      isUrgent
    };

    chat.messages.push(message);
    chat.lastMessage = message;
    chat.unreadCount++;

    this.messageHistory.push(message);
    return message;
  }

  sendGlobalMessage(senderId: string, messageText: string, type: 'text' | 'announcement' = 'text', targetAudience: 'all' | 'tenants' | 'landlords' = 'all', buildingAddress: string = 'Vokiečių g. 117, Vilnius'): ChatMessage | null {
    const sender = this.users.get(senderId);
    if (!sender) return null;

    let globalChat = this.getGlobalChat(buildingAddress);
    if (!globalChat) {
      globalChat = this.createGlobalChat(buildingAddress);
    }

    const message: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: senderId,
      timestamp: new Date(),
      status: 'sent',
      type,
      isUrgent: false,
      targetAudience,
      buildingAddress
    };

    globalChat.messages.push(message);
    this.messageHistory.push(message);
    return message;
  }

  // Message retrieval
  getIndividualChatMessages(user1Id: string, user2Id: string): ChatMessage[] {
    const chat = this.getIndividualChat(user1Id, user2Id);
    return chat ? chat.messages : [];
  }

  getGlobalChatMessages(buildingAddress: string): ChatMessage[] {
    const chat = this.getGlobalChat(buildingAddress);
    return chat ? chat.messages : [];
  }

  // Unread message management
  markIndividualChatAsRead(user1Id: string, user2Id: string) {
    const chat = this.getIndividualChat(user1Id, user2Id);
    if (chat) {
      chat.unreadCount = 0;
    }
  }

  getUnreadCount(userId: string): number {
    let total = 0;
    for (const chat of Array.from(this.individualChats.values())) {
      if (chat.participants.includes(userId) && chat.unreadCount > 0) {
        total += chat.unreadCount;
      }
    }
    return total;
  }

  // Search and filtering
  searchMessages(query: string, userId?: string): ChatMessage[] {
    return this.messageHistory.filter((message: ChatMessage) => {
      const matchesQuery = message.text.toLowerCase().includes(query.toLowerCase());
      if (userId) {
        return matchesQuery && (message.sender === userId || message.receiver === userId);
      }
      return matchesQuery;
    });
  }

  // Get recent conversations for a user
  getRecentConversations(userId: string): IndividualChat[] {
    const conversations: IndividualChat[] = [];
    for (const chat of Array.from(this.individualChats.values())) {
      if (chat.participants.includes(userId)) {
        conversations.push(chat);
      }
    }
    return conversations.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp.getTime() || 0;
      const bTime = b.lastMessage?.timestamp.getTime() || 0;
      return bTime - aTime;
    });
  }

  // Notification system
  getNotificationCount(userId: string): number {
    return this.getUnreadCount(userId);
  }

  // Cleanup old messages (optional)
  cleanupOldMessages(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    for (const chat of Array.from(this.individualChats.values())) {
      chat.messages = chat.messages.filter((message: ChatMessage) => message.timestamp > cutoffDate);
    }

    for (const chat of Array.from(this.globalChats.values())) {
      chat.messages = chat.messages.filter((message: ChatMessage) => message.timestamp > cutoffDate);
    }

    this.messageHistory = this.messageHistory.filter((message: ChatMessage) => message.timestamp > cutoffDate);
  }
}

// Export singleton instance
export const chatSystem = new ChatSystem();

// Initialize with some sample data
export const initializeChatSystem = () => {
  // Add landlord
  chatSystem.addUser({
    id: 'landlord-1',
    name: 'Nuomotojas',
    type: 'landlord',
    isOnline: true,
    phone: '+37060000000',
    email: 'nuomotojas@example.com'
  });

  // Add some sample tenants
  chatSystem.addUser({
    id: 'tenant-1',
    name: 'Jonas Jonaitis',
    type: 'tenant',
    apartmentNumber: '1',
    isOnline: false,
    phone: '+37061111111',
    email: 'jonas@example.com'
  });

  chatSystem.addUser({
    id: 'tenant-2',
    name: 'Marija Marijaitė',
    type: 'tenant',
    apartmentNumber: '2',
    isOnline: true,
    phone: '+37062222222',
    email: 'marija@example.com'
  });

  // Add sample messages for different addresses
  // Vokiečių g. 117, Vilnius
  chatSystem.sendGlobalMessage('landlord-1', 'Sveiki visi! Šiandien bus atliekami darbai liftu. Atsiprašome už nepatogumą.', 'announcement', 'all', 'Vokiečių g. 117, Vilnius');
  chatSystem.sendGlobalMessage('tenant-2', 'Ačiū už informaciją!', 'text', 'all', 'Vokiečių g. 117, Vilnius');
  
  // Gedimino pr. 15, Vilnius
  chatSystem.sendGlobalMessage('landlord-1', 'Sveiki! Šiandien bus valoma teritorija. Prašome pasitraukti automobilius.', 'announcement', 'all', 'Gedimino pr. 15, Vilnius');
  chatSystem.sendGlobalMessage('tenant-1', 'Supratau, ačiū!', 'text', 'all', 'Gedimino pr. 15, Vilnius');
  
  // Konstitucijos pr. 25, Vilnius
  chatSystem.sendGlobalMessage('landlord-1', 'Sveiki! Šiandien bus tikrinami skaitliukai. Prašome pateikti duomenis.', 'announcement', 'all', 'Konstitucijos pr. 25, Vilnius');
  chatSystem.sendGlobalMessage('tenant-2', 'Pateikiau duomenis el. paštu.', 'text', 'all', 'Konstitucijos pr. 25, Vilnius');
  
  // Kalvarijų g. 45, Vilnius
  chatSystem.sendGlobalMessage('landlord-1', 'Sveiki! Šiandien bus remontuojamas vandentiekis. Vandens gali nebūti 2-3 valandas.', 'announcement', 'all', 'Kalvarijų g. 45, Vilnius');
  chatSystem.sendGlobalMessage('tenant-1', 'Supratau, pasiruošiu vandens rezervą.', 'text', 'all', 'Kalvarijų g. 45, Vilnius');
  
  // Individual messages
  chatSystem.sendIndividualMessage('landlord-1', 'tenant-1', 'Labas! Ar viskas tvarkoje su nuoma?');
  chatSystem.sendIndividualMessage('tenant-1', 'landlord-1', 'Taip, viskas gerai. Ačiū!');
}; 