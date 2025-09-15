import ConversationSidebar from '../ConversationSidebar';
import { SidebarProvider } from "@/components/ui/sidebar";

const mockConversations = [
  {
    id: '1',
    title: 'React Component Help',
    lastMessage: 'How do I create a todo list component?',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  },
  {
    id: '2', 
    title: 'JavaScript Arrays',
    lastMessage: 'Can you explain array methods?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: '3',
    title: 'CSS Flexbox Layout',
    lastMessage: 'I need help with flexbox alignment',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
];

export default function ConversationSidebarExample() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="h-[600px] w-full flex">
        <ConversationSidebar
          conversations={mockConversations}
          activeConversationId="1"
          onSelectConversation={(id) => console.log('Selected conversation:', id)}
          onNewConversation={() => console.log('New conversation started')}
        />
      </div>
    </SidebarProvider>
  );
}