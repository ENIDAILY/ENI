import ChatInput from '../ChatInput';

export default function ChatInputExample() {
  const handleSendMessage = (message: string) => {
    console.log('Example: Message sent ->', message);
  };

  return (
    <div className="max-w-4xl">
      <ChatInput 
        onSendMessage={handleSendMessage}
        placeholder="Ask me anything..."
      />
    </div>
  );
}