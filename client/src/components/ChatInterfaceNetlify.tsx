import { useState, useRef, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import ConversationSidebar from "./ConversationSidebar";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link } from "wouter";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

// Local storage utilities
const STORAGE_KEY = 'ai-chat-conversations';

const loadConversations = (): Conversation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((conv: any) => ({
        ...conv,
        timestamp: new Date(conv.timestamp),
        messages: conv.messages || []
      }));
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
  }
  return [];
};

const saveConversations = (conversations: Conversation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversations:', error);
  }
};

export default function ChatInterfaceNetlify() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const loadedConversations = loadConversations();
    setConversations(loadedConversations);
    if (loadedConversations.length > 0) {
      setActiveConversationId(loadedConversations[0].id);
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    setIsTyping(true);

    try {
      // If no active conversation, create one
      let currentConversationId = activeConversationId;
      if (!currentConversationId) {
        const newConversation: Conversation = {
          id: Date.now().toString(),
          title: content.length > 50 ? content.substring(0, 47) + "..." : content,
          lastMessage: content,
          timestamp: new Date(),
          messages: []
        };
        
        setConversations(prev => [newConversation, ...prev]);
        currentConversationId = newConversation.id;
        setActiveConversationId(currentConversationId);
      }

      // Add user message
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        content,
        isUser: true,
        createdAt: new Date().toISOString(),
      };

      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { 
              ...conv, 
              messages: [...conv.messages, userMessage],
              lastMessage: content,
              timestamp: new Date()
            }
          : conv
      ));

      // Call API with conversation history
      const conversationHistory = messages.slice(-10); // Send last 10 messages for context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: content
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Add AI response
      const aiMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        content: data.response,
        isUser: false,
        createdAt: new Date().toISOString(),
      };

      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { 
              ...conv, 
              messages: [...conv.messages, aiMessage],
              lastMessage: data.response,
              timestamp: new Date()
            }
          : conv
      ));

    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        content: "Sorry, I encountered an error. Please make sure your GitHub token is configured correctly.",
        isUser: false,
        createdAt: new Date().toISOString(),
      };

      setConversations(prev => prev.map(conv => 
        conv.id === activeConversationId 
          ? { 
              ...conv, 
              messages: [...conv.messages, errorMessage],
              lastMessage: errorMessage.content,
              timestamp: new Date()
            }
          : conv
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewConversation = () => {
    setActiveConversationId(undefined);
  };

  const handleSurpriseMe = async () => {
    setIsTyping(true);
    
    try {
      // Call AI to generate a random evangelical question/prompt
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: "Generate a single random, creative, and inspiring evangelical content prompt. Make it specific and engaging. Examples: 'Create content about overcoming addiction through faith', 'Generate content about God's grace in times of loss', 'Create content about finding purpose through Christ'. Give me just one unique prompt, no explanation or formatting, just the prompt itself."
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Use the AI-generated prompt directly
      const aiGeneratedPrompt = data.response.trim();
      
      // Call handleSendMessage with the AI-generated prompt
      setIsTyping(false);
      handleSendMessage(aiGeneratedPrompt);
      
    } catch (error) {
      console.error('Surprise Me error:', error);
      setIsTyping(false);
      
      // Fallback to static prompts if AI fails
      const fallbackPrompts = [
        "Create inspiring gospel content about God's love and salvation",
        "Generate powerful content about faith overcoming obstacles", 
        "Create content about the hope found in Jesus Christ",
        "Generate content about God's forgiveness and grace",
        "Create content about the power of prayer and faith",
        "Generate content about God's plan for our lives",
        "Create content about eternal life through Jesus",
        "Generate content about God's unconditional love"
      ];
      
      const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
      handleSendMessage(randomPrompt);
    }
  };

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <ConversationSidebar
          conversations={conversations.map(conv => ({
            id: conv.id,
            title: conv.title,
            lastMessage: conv.lastMessage,
            timestamp: conv.timestamp,
          }))}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-4 border-b border-border bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="font-semibold text-lg">Evangelical Content Creator</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Video Content Generation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="ghost" size="icon" data-testid="button-admin">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {(!activeConversationId || messages.length === 0) ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="text-4xl mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Welcome to Evangelical Content Creator</h2>
                    <p className="text-muted-foreground mb-4">
                      Generate comprehensive evangelical video content with 6 detailed image prompts, 
                      individual voiceovers, and music suggestions. Use the ✨ Surprise Me button for random gospel content!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your content projects are saved locally in your browser.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message.content}
                      isUser={message.isUser}
                      timestamp={new Date(message.createdAt)}
                    />
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            <ChatInput 
              onSendMessage={handleSendMessage}
              onSurpriseMe={handleSurpriseMe}
              disabled={isTyping}
              placeholder="Describe your video content idea..."
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}