import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-4 p-4">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <Bot className="w-4 h-4" />
        </div>
      </div>
      
      <div className="flex-1 max-w-3xl">
        <div className="inline-block p-4 rounded-2xl bg-card border border-card-border mr-12">
          <div className="flex items-center gap-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-muted-foreground ml-2">Creating content...</span>
          </div>
        </div>
      </div>
    </div>
  );
}