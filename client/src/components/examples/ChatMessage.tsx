import ChatMessage from '../ChatMessage';

export default function ChatMessageExample() {
  return (
    <div className="space-y-4">
      <ChatMessage 
        message="Hello! How can I help you today?" 
        isUser={false}
        timestamp={new Date()}
      />
      <ChatMessage 
        message="I need help with creating a React component. Can you show me how to build a todo list?" 
        isUser={true}
        timestamp={new Date()}
      />
      <ChatMessage 
        message="I'd be happy to help you create a todo list component! Here's a simple example:\n\n```tsx\nfunction TodoList() {\n  const [todos, setTodos] = useState([]);\n  return <div>Todo component</div>;\n}\n```\n\nThis creates a basic foundation for your todo list." 
        isUser={false}
        timestamp={new Date()}
      />
    </div>
  );
}