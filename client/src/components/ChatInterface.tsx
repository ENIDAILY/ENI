import { useState, useRef, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ConversationSidebar from "./ConversationSidebar";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import ThemeToggle from "./ThemeToggle";

// Using types from shared schema
interface ConversationWithMessages {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

export default function ChatInterface() {
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch conversations
  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ['/api/conversations'],
  });
  
  // Fetch messages for active conversation
  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ['/api/conversations', activeConversationId, 'messages'],
    enabled: !!activeConversationId,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async ({ message, conversationId }: { message: string; conversationId?: string }) => {
      const response = await apiRequest('POST', '/api/chat', { message, conversationId });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch conversations and messages
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      if (activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeConversationId, 'messages'] });
      }
      
      // Set active conversation if this was a new conversation
      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
      }
      
      setIsTyping(false);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setIsTyping(false);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    setIsTyping(true);
    chatMutation.mutate({ 
      message: content, 
      conversationId: activeConversationId 
    });
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    console.log('Starting new conversation');
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
            lastMessage: '', // We'll get this from the last message in messages
            timestamp: new Date(conv.updatedAt || conv.createdAt),
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
                <h1 className="font-semibold text-lg">AI Chat</h1>
                <p className="text-sm text-muted-foreground">Powered by GitHub AI</p>
              </div>
            </div>
            <ThemeToggle />
          </header>
          
          <main className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {(!activeConversationId || messages.length === 0) ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="text-4xl mb-4">🤖</div>
                    <h2 className="text-xl font-semibold mb-2">Welcome to AI Chat</h2>
                    <p className="text-muted-foreground mb-4">
                      Start a conversation with our AI assistant powered by GitHub's inference endpoint. 
                      Ask questions, get help with coding, or chat about anything!
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
              disabled={isTyping}
              placeholder="Ask me anything..."
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}