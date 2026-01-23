import { useEffect, useRef } from 'react';
import { Search, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { LogEntry } from '@/lib/types/chat';

interface ScoutBlockProps {
  logs: LogEntry[];
  reasoning?: string;
}

const logIcons = {
  info: Loader2,
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

const logColors = {
  info: 'text-blue-600',
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
};

export function ScoutBlock({ logs, reasoning }: ScoutBlockProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 bg-muted border border-border rounded-lg">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-muted-foreground/10 rounded-full flex items-center justify-center">
            <Search className="w-5 h-5 text-foreground animate-pulse" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">
            🔍 Discovery Phase
          </h3>
          <p className="text-sm text-muted-foreground">
            Searching GitHub and analyzing repositories...
          </p>
        </div>
      </div>

      {/* Reasoning Display */}
      {reasoning && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="text-sm font-semibold text-purple-900 mb-2">
            💭 Reasoning
          </h4>
          <p className="text-sm text-purple-800 leading-relaxed">
            {reasoning}
          </p>
        </div>
      )}

      {/* Terminal Logs */}
      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-xs font-mono text-gray-400">scout.log</span>
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="p-4 h-64 overflow-y-auto font-mono text-sm space-y-2 terminal-logs"
          style={{ scrollbarWidth: 'thin' }}
        >
          {logs.length === 0 ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Initializing discovery agent...</span>
            </div>
          ) : (
            logs.map((log) => {
              const Icon = logIcons[log.type];
              const iconColor = logColors[log.type];

              return (
                <div key={log.id} className="flex items-start space-x-2 text-gray-300">
                  <span className="text-gray-600 text-xs select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor} ${log.type === 'info' ? 'animate-spin' : ''}`} />
                  <span className="flex-1">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
