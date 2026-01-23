import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

interface ConversationBlockProps {
  messages: Message[];
  onSuggestionClick?: (suggestion: string) => void;
}

/**
 * ConversationBlock - Linear chat style (prototype-based)
 *
 * Design: Left-aligned messages with header (avatar + role) and content sections
 * No chat bubbles, clean linear flow
 * Uses shadcn color system for full theme support
 */
export function ConversationBlock({ messages, onSuggestionClick }: ConversationBlockProps) {
  return (
    <div className="max-w-4xl mx-auto px-4">
      {messages.map((message, index) => (
        <div key={index} className="message-item">
          {/* Message Header */}
          <div className="message-header">
            <div className={`message-avatar ${message.role === 'user' ? 'user-avatar' : 'agent-avatar'}`}>
              {message.role === 'user' ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="message-role">
              {message.role === 'user' ? 'User' : 'Agent'}
            </div>
          </div>

          {/* Message Content */}
          <div className="message-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="text-foreground">{children}</p>,
                strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="text-foreground">{children}</ul>,
                li: ({ children }) => <li className="text-foreground">{children}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Suggestion Buttons */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="suggestion-buttons">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="suggestion-btn"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
