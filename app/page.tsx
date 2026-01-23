'use client';

import { useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { useChatStore } from '@/lib/stores/chat-store';
import { InitialView } from '@/components/chat-ui/initial-view';
import { ConversationBlock } from '@/components/chat-ui/conversation-block';
import { ScoutBlock } from '@/components/chat-ui/scout-block';
import { ACSScoreCard } from '@/components/chat-ui/acs-score-card';
import { FabricatorBlock } from '@/components/chat-ui/fabricator-block';
import { SkillDeliveryCard } from '@/components/chat-ui/skill-delivery-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export default function SkillFactoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Zustand store
  const currentPhase = useChatStore((state) => state.currentPhase);
  const setPhase = useChatStore((state) => state.setPhase);
  const discoveryLogs = useChatStore((state) => state.discoveryLogs);
  const fabricationLogs = useChatStore((state) => state.fabricationLogs);
  const acsScores = useChatStore((state) => state.acsScores);
  const skillArtifact = useChatStore((state) => state.skillArtifact);
  const addDiscoveryLog = useChatStore((state) => state.addDiscoveryLog);
  const addFabricationLog = useChatStore((state) => state.addFabricationLog);
  const setACSScores = useChatStore((state) => state.setACSScores);
  const setSkillArtifact = useChatStore((state) => state.setSkillArtifact);
  const reset = useChatStore((state) => state.reset);

  // Vercel AI SDK useChat hook
  const { messages, input, handleInputChange, handleSubmit, isLoading, data, append, error } = useChat({
    api: '/api/consultant',
    onResponse: (response) => {
      console.log('[useChat] Response received:', response.status, response.statusText);
    },
    onToolCall: async ({ toolCall }) => {
      console.log('[useChat] Tool call detected:', toolCall);

      // Phase transition based on tool name
      if (toolCall.toolName === 'findRepository') {
        console.log('[useChat] Switching to DISCOVERY phase');
        setPhase('DISCOVERY');
      } else if (toolCall.toolName === 'generateSkill') {
        console.log('[useChat] Switching to FABRICATION phase');
        setPhase('FABRICATION');
      }
    },
    onFinish: (message) => {
      console.log('[useChat] Message finished:', message);

      // Handle tool results
      if (message.toolInvocations) {
        message.toolInvocations.forEach((inv) => {
          console.log('[useChat] Tool invocation:', inv.toolName, inv.state);
          if (inv.state === 'result') {
            handleToolResult(inv.toolName, inv.result);
          }
        });
      }
    },
    onError: (error) => {
      console.error('[useChat] Error occurred:', error);
    },
  });

  // Handle tool results
  const handleToolResult = (toolName: string, result: any) => {
    console.log('Tool result:', toolName, result);

    if (toolName === 'findRepository') {
      if (result?.repositories && result.repositories.length > 0) {
        setACSScores(result.repositories);
        addDiscoveryLog(`✅ Found ${result.repositories.length} suitable repositories`, 'success');
      } else {
        addDiscoveryLog(result?.summary || 'No repositories found', 'warning');
      }
    } else if (toolName === 'generateSkill') {
      if (result?.success && result?.skill) {
        setSkillArtifact(result.skill);
        setPhase('DELIVERY');
        addFabricationLog('✅ Skill generation completed!', 'success');
      } else {
        // Phase 7 stub response
        addFabricationLog(result?.message || 'Skill generation pending', 'warning');
        if (result?.details && Array.isArray(result.details)) {
          result.details.forEach((detail: string) => {
            addFabricationLog(`  • ${detail}`, 'info');
          });
        }
      }
    }
  };

  // Handle streaming tool events
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Process the latest data event
    const latestEvent = data[data.length - 1];

    if (latestEvent && typeof latestEvent === 'object' && 'type' in latestEvent) {
      const streamData = latestEvent as any;

      if (streamData.type === 'tool_event') {
        const { toolName, event } = streamData;

        // Route events to appropriate log based on tool
        if (toolName === 'findRepository') {
          if (event.type === 'log' || event.type === 'progress') {
            addDiscoveryLog(event.message, 'info');
          } else if (event.type === 'error') {
            addDiscoveryLog(event.message, 'error');
          }
        } else if (toolName === 'generateSkill') {
          if (event.type === 'log' || event.type === 'progress') {
            addFabricationLog(event.message, 'info');
          } else if (event.type === 'error') {
            addFabricationLog(event.message, 'error');
          }
        }
      }
    }
  }, [data, addDiscoveryLog, addFabricationLog]);

  // Auto-scroll to bottom when phase changes or new messages arrive
  useEffect(() => {
    // Don't scroll on IDLE phase or when there's no content
    if (currentPhase === 'IDLE' || !containerRef.current) {
      return;
    }

    // Only scroll if there are messages or logs
    const hasContent = messages.length > 0 || discoveryLogs.length > 0 || fabricationLogs.length > 0;
    if (hasContent) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, currentPhase, discoveryLogs, fabricationLogs]);

  // Debug: Monitor messages changes
  useEffect(() => {
    console.log('[useEffect] Messages updated:', messages.length, 'messages');
    console.log('[useEffect] Latest messages:', messages);
  }, [messages]);

  // Debug: Monitor error
  useEffect(() => {
    if (error) {
      console.error('[useEffect] Error detected:', error);
    }
  }, [error]);

  // Debug: Monitor loading state
  useEffect(() => {
    console.log('[useEffect] Loading state:', isLoading);
  }, [isLoading]);

  // When conversation starts, transition to CONSULTATION phase
  useEffect(() => {
    if (messages.length > 0 && currentPhase === 'IDLE') {
      console.log('[useEffect] Transitioning from IDLE to CONSULTATION');
      setPhase('CONSULTATION');
    }
  }, [messages, currentPhase, setPhase]);

  const handleInitialSubmit = (message: string) => {
    console.log('[handleInitialSubmit] User message:', message);
    // Use append to add user message
    append({
      role: 'user',
      content: message,
    });
    console.log('[handleInitialSubmit] Message appended, waiting for response...');
    // Phase will be set automatically by useEffect when messages.length > 0
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleInitialSubmit(suggestion);
  };

  const handleConvertToSkill = async (repoUrl: string) => {
    // Call the generateSkill tool through the chat API
    await append({
      role: 'user',
      content: `Please convert this repository to a skill: ${repoUrl}`,
    });
  };

  const handleDownloadSkill = () => {
    if (!skillArtifact) return;

    const blob = new Blob([skillArtifact.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skillArtifact.name.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    reset();
    window.location.reload();
  };

  // Convert AI SDK messages to our format
  const conversationMessages = messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    suggestions: msg.role === 'assistant' ? [] : undefined,
  }));

  return (
    <div className="flex flex-col bg-background" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Debug Panel */}
      <div className="fixed top-16 right-4 bg-card border border-border p-4 rounded-lg shadow-lg z-50 max-w-sm text-xs">
        <div className="font-bold mb-2">调试信息</div>
        <div className="space-y-1">
          <div>Phase: <span className="font-mono text-primary">{currentPhase}</span></div>
          <div>Messages: <span className="font-mono">{messages.length}</span></div>
          <div>Loading: <span className="font-mono">{isLoading ? '✅' : '❌'}</span></div>
          <div>Error: <span className="font-mono text-destructive">{error ? error.message : 'None'}</span></div>
          <div>Discovery Logs: <span className="font-mono">{discoveryLogs.length}</span></div>
          <div>Fabrication Logs: <span className="font-mono">{fabricationLogs.length}</span></div>
          <div>ACS Scores: <span className="font-mono">{acsScores.length}</span></div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {/* IDLE Phase: Show initial view */}
        {currentPhase === 'IDLE' && <InitialView onSubmit={handleInitialSubmit} />}

        {/* CONSULTATION Phase: Show conversation */}
        {currentPhase === 'CONSULTATION' && (
          <div className="space-y-6 py-6 pb-32">
            <ConversationBlock
              messages={conversationMessages}
              onSuggestionClick={handleSuggestionClick}
            />
          </div>
        )}

        {/* DISCOVERY Phase: Show scout block and ACS scores */}
        {currentPhase === 'DISCOVERY' && (
          <div className="space-y-6 py-6 pb-32">
            {conversationMessages.length > 0 && (
              <ConversationBlock
                messages={conversationMessages}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
            <ScoutBlock logs={discoveryLogs} />

            {acsScores.length > 0 && (
              <div className="max-w-4xl mx-auto px-4 space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Found {acsScores.length} repositories
                </h3>
                <div className="grid gap-4">
                  {acsScores.map((repo, idx) => (
                    <ACSScoreCard
                      key={idx}
                      repository={repo}
                      onConvert={handleConvertToSkill}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FABRICATION Phase: Show conversation history + fabricator block */}
        {currentPhase === 'FABRICATION' && (
          <div className="space-y-6 py-6 pb-32">
            {conversationMessages.length > 0 && (
              <ConversationBlock
                messages={conversationMessages}
                onSuggestionClick={handleSuggestionClick}
              />
            )}

            {/* Show previous discovery results if available */}
            {discoveryLogs.length > 0 && (
              <ScoutBlock logs={discoveryLogs} />
            )}

            {acsScores.length > 0 && (
              <div className="max-w-4xl mx-auto px-4 space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Found {acsScores.length} repositories
                </h3>
                <div className="grid gap-4">
                  {acsScores.map((repo, idx) => (
                    <ACSScoreCard
                      key={idx}
                      repository={repo}
                      onConvert={handleConvertToSkill}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Fabrication progress */}
            <FabricatorBlock logs={fabricationLogs} />
          </div>
        )}

        {/* DELIVERY Phase: Show complete journey + skill delivery */}
        {currentPhase === 'DELIVERY' && skillArtifact && (
          <div className="space-y-6 py-6 pb-32">
            {conversationMessages.length > 0 && (
              <ConversationBlock
                messages={conversationMessages}
                onSuggestionClick={handleSuggestionClick}
              />
            )}

            {/* Show previous discovery results if available */}
            {discoveryLogs.length > 0 && (
              <ScoutBlock logs={discoveryLogs} />
            )}

            {acsScores.length > 0 && (
              <div className="max-w-4xl mx-auto px-4 space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Found {acsScores.length} repositories
                </h3>
                <div className="grid gap-4">
                  {acsScores.map((repo, idx) => (
                    <ACSScoreCard
                      key={idx}
                      repository={repo}
                      onConvert={handleConvertToSkill}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Show fabrication logs */}
            {fabricationLogs.length > 0 && (
              <FabricatorBlock logs={fabricationLogs} />
            )}

            {/* Final skill delivery */}
            <SkillDeliveryCard
              artifact={skillArtifact}
              onDownload={handleDownloadSkill}
              onReset={handleReset}
            />
          </div>
        )}
      </div>

      {/* Input Area - Fixed bottom with gradient backdrop (prototype-based) */}
      {(currentPhase === 'CONSULTATION' || currentPhase === 'DISCOVERY') && (
        <div className="input-container">
          <form onSubmit={handleSubmit} className="input-wrapper" autoComplete="off">
            <textarea
              ref={inputRef as any}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about tools, frameworks, or APIs..."
              disabled={isLoading}
              rows={1}
              className="input-field"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="send-button"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
