import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSurpriseMe?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  onSurpriseMe,
  disabled = false, 
  placeholder = "Describe your video content idea..." 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      console.log('Message sent:', message.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="resize-none min-h-[44px] max-h-[150px] pr-12"
              data-testid="input-message"
              rows={1}
            />
          </div>
          {onSurpriseMe && (
            <Button
              onClick={onSurpriseMe}
              disabled={disabled}
              variant="outline"
              size="icon"
              data-testid="button-surprise-me"
              className="shrink-0 h-11 w-11"
              title="Surprise Me with Random Gospel Content"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            size="icon"
            data-testid="button-send"
            className="shrink-0 h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to generate content, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}