import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { LogEntry } from '@/lib/types/chat';

interface FabricatorBlockProps {
  logs: LogEntry[];
}

/**
 * FabricatorBlock - Claude-style conversation flow for fabrication logs
 * 
 * Shows fabrication progress as inline conversation steps with animated states
 */
export function FabricatorBlock({ logs }: FabricatorBlockProps) {
  if (logs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="ml-9 pl-3 border-l-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 py-2 px-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg">
            <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
            <span className="text-sm text-purple-600 dark:text-purple-400">Initializing fabrication pipeline...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="ml-9 pl-3 border-l-2 border-purple-200 dark:border-purple-800 space-y-1">
        {logs.map((log, index) => {
          const isLast = index === logs.length - 1;
          const isInProgress = log.type === 'info' && isLast;

          return (
            <div
              key={log.id}
              className={`
                flex items-start gap-3 py-2 px-3 rounded-lg transition-all
                ${isInProgress ? 'bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800' : 'bg-transparent'}
              `}
            >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {log.type === 'success' && (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />
              )}
              {log.type === 'error' && (
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
              )}
              {log.type === 'warning' && (
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
              )}
              {log.type === 'info' && (
                <div className="relative">
                  <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                  {isInProgress && (
                    <div className="absolute inset-0 animate-ping">
                      <div className="w-4 h-4 rounded-full bg-purple-400/20" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className={`
                text-sm leading-relaxed
                ${log.type === 'success' ? 'text-foreground' : ''}
                ${log.type === 'error' ? 'text-red-600 dark:text-red-400' : ''}
                ${log.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : ''}
                ${log.type === 'info' ? isInProgress ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-muted-foreground' : ''}
              `}>
                {log.message}
              </p>
            </div>

            {/* Animated dots for in-progress state */}
            {isInProgress && (
              <div className="flex items-center gap-1 ml-2">
                <div className="w-1 h-1 rounded-full bg-purple-600 dark:bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-purple-600 dark:bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 rounded-full bg-purple-600 dark:bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
