import { Plus, MessageSquare, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useState } from "react";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export default function ConversationSidebar({ 
  conversations, 
  activeConversationId, 
  onSelectConversation,
  onNewConversation 
}: ConversationSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Button 
          onClick={onNewConversation} 
          className="w-full justify-start gap-2"
          data-testid="button-new-conversation"
        >
          <Plus className="h-4 w-4" />
          New Content
        </Button>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarMenu>
          {conversations.map((conversation) => (
            <SidebarMenuItem key={conversation.id}>
              <SidebarMenuButton
                onClick={() => {
                  onSelectConversation(conversation.id);
                  console.log('Selected conversation:', conversation.title);
                }}
                className={`w-full p-3 rounded-lg hover-elevate transition-colors relative group ${
                  activeConversationId === conversation.id 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : ''
                }`}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
                data-testid={`button-conversation-${conversation.id}`}
              >
                <div className="flex items-start gap-3 w-full min-w-0">
                  <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {conversation.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(conversation.timestamp)}
                    </div>
                  </div>
                </div>
                
                {hoveredId === conversation.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('More options for:', conversation.title);
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          {conversations.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No content created yet</p>
              <p className="text-xs">Create your first video content</p>
            </div>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}