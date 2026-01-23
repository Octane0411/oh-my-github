import { useEffect, useRef } from 'react';
import { Hammer, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { LogEntry } from '@/lib/types/chat';

interface FabricatorBlockProps {
  logs: LogEntry[];
  currentStep?: string;
  totalSteps?: number;
}

const logIcons = {
  info: Loader2,
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

const logColors = {
  info: 'text-blue-400',
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
};

export function FabricatorBlock({ logs, currentStep, totalSteps = 4 }: FabricatorBlockProps) {
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

  const completedSteps = logs.filter(log => log.type === 'success').length;
  const progress = Math.min((completedSteps / totalSteps) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Hammer className="w-5 h-5 text-purple-600 animate-pulse" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">
            ⚡ Fabrication Phase
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentStep || 'Generating your Agent Skill...'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">
            Step {completedSteps} of {totalSteps}
          </span>
          <span className="text-muted-foreground font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Terminal Logs */}
      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-xs font-mono text-gray-400">fabricator.log</span>
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="p-4 h-80 overflow-y-auto font-mono text-sm space-y-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {logs.length === 0 ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Initializing fabrication pipeline...</span>
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
