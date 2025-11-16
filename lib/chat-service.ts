import { MemoryService } from './memory-service';
import { getGolemStorage } from './golem-storage';
import { getEncryptionService } from './encryption';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export class ChatService {
  private memoryService: MemoryService;
  private readonly CHAT_SESSION_KEY = 'chat_session';
  private readonly CHAT_HISTORY_TYPE = 'conversation';
  private readonly CHAT_ENTITY_KEY = 'chat_history_main';
  private chatEntityKey: string | null = null; // Track the actual entity key from Arkiv DB

  constructor() {
    // Initialize memory service with Arkiv DB only
    this.memoryService = new MemoryService();
  }

  async initialize(): Promise<void> {
    await this.memoryService.initialize();
    
    // Load chat entity key from localStorage if available
    if (typeof window !== 'undefined') {
      const storedEntityKey = localStorage.getItem('chat-entity-key');
      if (storedEntityKey) {
        this.chatEntityKey = storedEntityKey;
        console.log('📊 Loaded chat entity key from localStorage:', storedEntityKey);
      }
    }
    
    console.log('Chat service initialized with Arkiv DB');
  }

  /**
   * Save chat messages to Arkiv DB
   */
  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    try {
      console.log('💾 Saving chat messages to Arkiv DB...', messages.length, 'messages');
      
      // Create a chat session object
      const chatSession: ChatSession = {
        id: this.CHAT_SESSION_KEY,
        messages: messages,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Use a direct approach: store with a known entity key
      // This bypasses the query limitations
      const golemStorage = this.memoryService['golemStorage'];
      
      // Create a memory entry with a specific ID
      const memoryId = this.CHAT_ENTITY_KEY;
      const now = new Date();
      
      const memory = {
        id: memoryId,
        content: JSON.stringify(chatSession),
        type: this.CHAT_HISTORY_TYPE as 'conversation',
        category: 'chat_history',
        tags: ['chat', 'conversation', 'history'],
        owner: 'ethereum-wallet',
        createdAt: now,
        updatedAt: now,
        encrypted: false,
        ipfsHash: '',
        nearTransactionId: '',
        checksum: this.generateChecksum(JSON.stringify(chatSession)),
        accessPolicy: {
          owner: 'ethereum-wallet',
          permissions: []
        },
        metadata: {
          size: JSON.stringify(chatSession).length,
          mimeType: 'application/json',
          encoding: 'utf-8',
          checksum: this.generateChecksum(JSON.stringify(chatSession)),
          version: 1,
          relatedMemories: []
        }
      };

      // Upload directly to Arkiv DB
      const uploadResult = await golemStorage.uploadMemory(memory);
      memory.ipfsHash = uploadResult.entityKey;
      
      // Store the actual entity key for future retrieval
      this.chatEntityKey = uploadResult.entityKey;
      
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat-entity-key', uploadResult.entityKey);
      }

      console.log('✅ Chat messages saved to Arkiv DB with entity key:', uploadResult.entityKey);
      const explorerUrl =
        process.env.NEXT_PUBLIC_ARKIV_EXPLORER_URL ||
        process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL ||
        'https://explorer.mendoza.hoodi.arkiv.network';
      const entityUrl = `${explorerUrl}/entity/${uploadResult.entityKey}`;
      console.log(`🔗 Entity URL: ${entityUrl}`);
      console.log(`🔗 Transaction URL: ${uploadResult.transactionUrl || 'Not available'}`);
    } catch (error) {
      console.error('Failed to save chat messages:', error);
      throw error;
    }
  }

  /**
   * Load chat messages from Arkiv DB
   */
  async loadChatMessages(): Promise<ChatMessage[]> {
    try {
      console.log('💬 Loading chat messages from Arkiv DB...');
      
      const golemStorage = this.memoryService['golemStorage'];
      
      // First, try to load from localStorage if we have a tracked entity key
      if (typeof window !== 'undefined') {
        const storedEntityKey = localStorage.getItem('chat-entity-key');
        console.log('📊 Stored entity key from localStorage:', storedEntityKey);
        if (storedEntityKey) {
          this.chatEntityKey = storedEntityKey;
        }
      }
      
      console.log('📊 Current chat entity key:', this.chatEntityKey);
      
      // Try to retrieve chat history using the tracked entity key
      if (this.chatEntityKey) {
        try {
          console.log('🔍 Trying to load chat history with tracked entity key:', this.chatEntityKey);
          const chatMemory = await golemStorage.retrieveMemory(this.chatEntityKey);
          
          if (chatMemory && chatMemory.content) {
            try {
              // Parse the chat session
              const chatSession: ChatSession = JSON.parse(chatMemory.content);
              
              if (chatSession.messages && Array.isArray(chatSession.messages)) {
                console.log('✅ Loaded chat history from tracked entity:', chatSession.messages.length, 'messages');
                // Convert string timestamps back to Date objects
                const messagesWithDates = chatSession.messages.map(msg => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                }));
                return messagesWithDates;
              }
            } catch (parseError) {
              console.warn('Failed to parse chat history from tracked entity:', parseError);
            }
          }
        } catch (retrieveError) {
          console.log('📝 Tracked entity key not found, searching for chat history...');
        }
      }
      
      // If no tracked entity key or it failed, search for chat history in owned memories
      try {
        console.log('🔍 Searching for chat history in owned memories...');
        const allEntityKeys = await golemStorage.getAllEntityKeys();
        
        for (const entityKey of allEntityKeys) {
          try {
            const memory = await golemStorage.retrieveMemory(entityKey);
            if (memory && memory.type === this.CHAT_HISTORY_TYPE && memory.category === 'chat_history') {
              try {
                const chatSession: ChatSession = JSON.parse(memory.content);
                if (chatSession.messages && Array.isArray(chatSession.messages)) {
                  console.log('✅ Found chat history in entity:', entityKey, 'with', chatSession.messages.length, 'messages');
                  
                  // Store this entity key for future use
                  this.chatEntityKey = entityKey;
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chat-entity-key', entityKey);
                  }
                  
                  // Convert string timestamps back to Date objects
                  const messagesWithDates = chatSession.messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                  }));
                  return messagesWithDates;
                }
              } catch (parseError) {
                console.warn('Failed to parse chat session from entity:', entityKey, parseError);
              }
            }
          } catch (error) {
            // Skip non-chat entities
            continue;
          }
        }
      } catch (searchError) {
        console.log('📝 No chat history found in search (this is normal for first use)');
      }

      // Return default welcome message if no chat history found
      console.log('📝 No chat history found, returning welcome message');
      return [{
        id: 'welcome',
        content: "Hello! I'm your privacy-first AI assistant. I can help you with various tasks while keeping all our conversations secure and private. What would you like to discuss?",
        role: 'assistant' as const,
        timestamp: new Date()
      }];
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      
      // Return welcome message on error
      return [{
        id: 'welcome',
        content: "Hello! I'm your privacy-first AI assistant. I can help you with various tasks while keeping all our conversations secure and private. What would you like to discuss?",
        role: 'assistant' as const,
        timestamp: new Date()
      }];
    }
  }

  /**
   * Add a new message to chat and save to Arkiv DB
   */
  async addMessage(content: string, role: 'user' | 'assistant'): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: uuidv4(),
      content,
      role,
      timestamp: new Date()
    };

    // Load existing messages
    const existingMessages = await this.loadChatMessages();
    
    // Add new message
    const updatedMessages = [...existingMessages, message];
    
    // Save updated messages to Arkiv DB
    await this.saveChatMessages(updatedMessages);
    
    return message;
  }

  /**
   * Clear chat history from Arkiv DB
   */
  async clearChatHistory(): Promise<void> {
    try {
      console.log('🗑️ Clearing chat history from Arkiv DB...');
      
      // Search for existing chat history
      const searchResult = await this.memoryService.searchMemories({
        query: 'chat_history',
        type: this.CHAT_HISTORY_TYPE,
        category: 'chat_history',
        tags: ['chat', 'conversation', 'history'],
        limit: 1
      });

      if (searchResult.memories.length > 0) {
        // Delete the existing chat history
        await this.memoryService.deleteMemory(searchResult.memories[0].id);
        console.log('✅ Chat history cleared from Arkiv DB');
      }

      // Save welcome message as new history
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: "Hello! I'm your privacy-first AI assistant. I can help you with various tasks while keeping all our conversations secure and private. What would you like to discuss?",
        role: 'assistant' as const,
        timestamp: new Date()
      };

      await this.saveChatMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      throw error;
    }
  }

  /**
   * Get chat statistics
   */
  async getChatStats(): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    lastActivity: Date | null;
  }> {
    try {
      const messages = await this.loadChatMessages();
      
      const userMessages = messages.filter(m => m.role === 'user').length;
      const assistantMessages = messages.filter(m => m.role === 'assistant').length;
      const lastActivity = messages.length > 0 ? messages[messages.length - 1].timestamp : null;

      return {
        totalMessages: messages.length,
        userMessages,
        assistantMessages,
        lastActivity
      };
    } catch (error) {
      console.error('Failed to get chat stats:', error);
      return {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        lastActivity: null
      };
    }
  }

  /**
   * Get the current chat entity key for transaction URL display
   */
  getChatEntityKey(): string | null {
    return this.chatEntityKey;
  }

  /**
   * Debug method to check chat persistence status
   */
  async debugChatPersistence(): Promise<void> {
    console.log('🔍 Chat Persistence Debug:');
    console.log('📊 Chat Entity Key:', this.chatEntityKey);
    
    if (typeof window !== 'undefined') {
      const storedEntityKey = localStorage.getItem('chat-entity-key');
      const golemEntityKeys = localStorage.getItem('golem-entity-keys');
      console.log('📊 localStorage chat-entity-key:', storedEntityKey);
      console.log('📊 localStorage golem-entity-keys:', golemEntityKeys ? JSON.parse(golemEntityKeys).length : 0, 'keys');
    }
    
    try {
      const messages = await this.loadChatMessages();
      console.log('📊 Loaded messages count:', messages.length);
      console.log('📊 First message:', messages[0]?.content?.substring(0, 50) || 'No messages');
    } catch (error) {
      console.error('📊 Error loading messages:', error);
    }
  }

  /**
   * Generate checksum for content
   */
  private generateChecksum(content: string): string {
    // Simple checksum implementation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Singleton instance
let chatServiceInstance: ChatService | null = null;

export function getChatService(): ChatService {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatService();
  }
  return chatServiceInstance;
}
