import { 
  type User, 
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type ApiKey,
  type InsertApiKey,
  type UpdateApiKey
} from "@shared/schema";
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversations(): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  
  // Message methods
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // API Key management methods
  getApiKeys(provider?: string): Promise<ApiKey[]>;
  getActiveApiKeys(provider: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, updates: UpdateApiKey): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<boolean>;
  incrementApiKeyUsage(id: string): Promise<void>;
}

// AES encryption utility for storing API keys securely
const ALGORITHM = 'aes-256-gcm';

// Validate encryption key at startup
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('WARNING: Using default encryption key for development. Set ENCRYPTION_KEY for production!');
      return Buffer.from('dev-encryption-key-32-characters'.padEnd(32, '0').slice(0, 32));
    }
    throw new Error('ENCRYPTION_KEY environment variable is required for API key storage. Please set a 32-character key.');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long for security.');
  }
  return Buffer.from(key.padEnd(32, '0').slice(0, 32));
}

const ENCRYPTION_KEY_BUFFER = getEncryptionKey();

function encryptKey(key: string): string {
  try {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
    
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
}

function decryptKey(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('API key decryption failed - ensure ENCRYPTION_KEY is consistent:', error?.message || 'Unknown error');
    throw new Error('Failed to decrypt API key - check encryption key');
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private apiKeys: Map<string, ApiKey>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.apiKeys = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      id,
      ...insertConversation,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updated: Conversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }

  // Message methods
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      id,
      ...insertMessage,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  // API Key management methods
  async getApiKeys(provider?: string): Promise<ApiKey[]> {
    const allKeys = Array.from(this.apiKeys.values());
    if (provider) {
      return allKeys.filter(key => key.provider === provider);
    }
    return allKeys;
  }

  async getActiveApiKeys(provider: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(key => key.provider === provider && key.isActive)
      .sort((a, b) => {
        // Sort by lastUsed (oldest first for rotation) and usage count
        if (!a.lastUsed && !b.lastUsed) return 0;
        if (!a.lastUsed) return -1;
        if (!b.lastUsed) return 1;
        return a.lastUsed.getTime() - b.lastUsed.getTime();
      });
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = randomUUID();
    const now = new Date();
    
    const apiKey: ApiKey = {
      id,
      name: insertApiKey.name,
      provider: insertApiKey.provider,
      keyValue: encryptKey(insertApiKey.keyValue), // Store encrypted with AES
      isActive: insertApiKey.isActive ?? true,
      lastUsed: null,
      usageCount: "0",
      createdAt: now,
      updatedAt: now,
    };
    
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async updateApiKey(id: string, updates: UpdateApiKey): Promise<ApiKey | undefined> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return undefined;
    
    const now = new Date();
    const updated: ApiKey = {
      ...apiKey,
      ...updates,
      updatedAt: now,
    };
    
    // If keyValue is being updated, encrypt it
    if (updates.keyValue) {
      updated.keyValue = encryptKey(updates.keyValue);
    }
    
    this.apiKeys.set(id, updated);
    return updated;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    return this.apiKeys.delete(id);
  }

  async incrementApiKeyUsage(id: string): Promise<void> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return;
    
    const currentCount = parseInt(apiKey.usageCount) || 0;
    const updated: ApiKey = {
      ...apiKey,
      usageCount: (currentCount + 1).toString(),
      lastUsed: new Date(),
      updatedAt: new Date(),
    };
    
    this.apiKeys.set(id, updated);
  }

  // Helper method to get decrypted API key
  getDecryptedApiKey(id: string): string | undefined {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return undefined;
    
    try {
      return decryptKey(apiKey.keyValue);
    } catch (error) {
      console.error(`Failed to decrypt API key ${id}:`, error);
      return undefined;
    }
  }
}

export const storage = new MemStorage();
