'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useChatStore } from '@/lib/stores/chat-store';
import type { Phase, ScoredRepository, SkillArtifact } from '@/lib/types/chat';
import { InitialView } from '@/components/chat-ui/initial-view';

// Type for tool event data
interface ToolEventData {
  toolName: string;
  event: {
    type: 'log' | 'progress' | 'result' | 'error';
    message: string;
    data?: unknown;
    timestamp: number;
  };
}
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previousPhaseRef = useRef<Phase>('IDLE');
  const [isPhaseTransitioning, setIsPhaseTransitioning] = useState(false);

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

  const [input, setInput] = useState('');

  // Vercel AI SDK useChat hook (v6)
  const {
    messages,
    sendMessage,
    status,
    error
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/consultant'
    }),

    // Handle transient tool events via onData callback
    onData: (dataPart) => {
      console.log('[useChat] Received data part:', dataPart);

      if (dataPart.type === 'data-tool-event') {
        const { toolName, event } = dataPart.data as ToolEventData;
        console.log('[useChat] Tool event:', toolName, event.type, event.message);

        // Phase transition based on tool name
        if (toolName === 'findRepository') {
          if (currentPhase !== 'DISCOVERY') {
            console.log('[useChat] Switching to DISCOVERY phase');
            setPhase('DISCOVERY');
          }
          // Add discovery logs
          if (event.type === 'log' || event.type === 'progress') {
            addDiscoveryLog(event.message, 'info');
          } else if (event.type === 'error') {
            addDiscoveryLog(event.message, 'error');
          }
        } else if (toolName === 'generateSkill') {
          if (currentPhase !== 'FABRICATION') {
            console.log('[useChat] Switching to FABRICATION phase');
            setPhase('FABRICATION');
          }
          // Add fabrication logs
          if (event.type === 'log' || event.type === 'progress') {
            addFabricationLog(event.message, 'info');
          } else if (event.type === 'error') {
            addFabricationLog(event.message, 'error');
          }
        }
      }
    },

    onFinish: ({ message }) => {
      console.log('[useChat] Message finished:', message);

      // Handle tool results from message parts
      message.parts.forEach((part) => {
        // Check for tool parts
        if (part.type.startsWith('tool-')) {
          const toolName = part.type.replace('tool-', '');

          // Type guard for tool parts with state
          if ('state' in part && part.state === 'output-available' && 'output' in part) {
            // Handle tool output
            handleToolResult(toolName, part.output);
          }
        }
      });
    },

    onError: (error) => {
      console.error('[useChat] Error occurred:', error);
    },
  });

  // Handle tool results
  const handleToolResult = (toolName: string, result: unknown) => {
    console.log('Tool result:', toolName, result);

    if (toolName === 'findRepository') {
      // Type guard for findRepository result
      const isValidResult = (r: unknown): r is { repositories: ScoredRepository[]; summary?: string } => {
        return typeof r === 'object' && r !== null && 'repositories' in r && Array.isArray(r.repositories);
      };

      if (isValidResult(result) && result.repositories.length > 0) {
        setACSScores(result.repositories);
        addDiscoveryLog(`✅ Found ${result.repositories.length} suitable repositories`, 'success');
      } else if (isValidResult(result)) {
        addDiscoveryLog(result.summary || 'No repositories found', 'warning');
      }
    } else if (toolName === 'generateSkill') {
      // Type guard for generateSkill result
      const isValidResult = (r: unknown): r is { success: boolean; skill?: SkillArtifact; message?: string; details?: string[] } => {
        return typeof r === 'object' && r !== null && 'success' in r;
      };

      if (isValidResult(result)) {
        if (result.success && result.skill) {
          setSkillArtifact(result.skill);
          setPhase('DELIVERY');
          addFabricationLog('✅ Skill generation completed!', 'success');
        } else {
          // Phase 7 stub response
          addFabricationLog(result.message || 'Skill generation pending', 'warning');
          if (result.details && Array.isArray(result.details)) {
            result.details.forEach((detail: string) => {
              addFabricationLog(`  • ${detail}`, 'info');
            });
          }
        }
      }
    }
  };

  // Note: Tool events are now handled via onData callback in useChat
  // No need for separate useEffect to process message parts

  // Detect phase transitions
  useEffect(() => {
    if (previousPhaseRef.current === 'IDLE' && currentPhase !== 'IDLE') {
      setIsPhaseTransitioning(true);
      // Reset transition flag after animation completes
      setTimeout(() => setIsPhaseTransitioning(false), 200);
    }
    previousPhaseRef.current = currentPhase;
  }, [currentPhase]);

  // Auto-scroll to bottom when phase changes or new messages arrive
  useEffect(() => {
    // Don't scroll during phase transition (prevents scroll on IDLE -> CONSULTATION)
    if (isPhaseTransitioning || currentPhase === 'IDLE' || !containerRef.current) {
      return;
    }

    // Only scroll if there are messages or logs
    const hasContent = messages.length > 0 || discoveryLogs.length > 0 || fabricationLogs.length > 0;
    if (hasContent) {
      // Double requestAnimationFrame to ensure DOM is fully rendered
      // First RAF: layout calculation, Second RAF: paint complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const container = containerRef.current;
            const isOverflowing = container.scrollHeight > container.clientHeight;
            
            // Only scroll if content overflows the container
            if (isOverflowing) {
              container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth',
              });
            }
          }
        });
      });
    }
  }, [messages, discoveryLogs, fabricationLogs, isPhaseTransitioning, currentPhase]);

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

  // Debug: Monitor status
  useEffect(() => {
    console.log('[useEffect] Status:', status);
  }, [status]);

  // When conversation starts, transition to CONSULTATION phase
  useEffect(() => {
    if (messages.length > 0 && currentPhase === 'IDLE') {
      console.log('[useEffect] Transitioning from IDLE to CONSULTATION');
      setPhase('CONSULTATION');
    }
  }, [messages, currentPhase, setPhase]);

  const handleInitialSubmit = (message: string) => {
    console.log('[handleInitialSubmit] User message:', message);
    // Use sendMessage (v6 API)
    sendMessage({ text: message });
    console.log('[handleInitialSubmit] Message sent, waiting for response...');
    // Phase will be set automatically by useEffect when messages.length > 0
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleInitialSubmit(suggestion);
  };

  const handleConvertToSkill = async (repoUrl: string) => {
    // Call the generateSkill tool through the chat API
    sendMessage({ text: `Please convert this repository to a skill: ${repoUrl}` });
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
  const conversationMessages = messages.map((msg) => {
    // Extract text content from parts array
    const textContent = msg.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map(part => part.text)
      .join('\n');

    return {
      role: msg.role as 'user' | 'assistant',
      content: textContent,
      suggestions: msg.role === 'assistant' ? [] : undefined,
    };
  });

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Debug Panel */}
      <div className="fixed top-16 right-4 bg-card border border-border p-4 rounded-lg shadow-lg z-50 max-w-sm text-xs">
        <div className="font-bold mb-2">调试信息</div>
        <div className="space-y-1">
          <div>Phase: <span className="font-mono text-primary">{currentPhase}</span></div>
          <div>Messages: <span className="font-mono">{messages.length}</span></div>
          <div>Loading: <span className="font-mono">{status === 'streaming' || status === 'submitted' ? '✅' : '❌'}</span></div>
          <div>Error: <span className="font-mono text-destructive">{error ? error.message : 'None'}</span></div>
          <div>Discovery Logs: <span className="font-mono">{discoveryLogs.length}</span></div>
          <div>Fabrication Logs: <span className="font-mono">{fabricationLogs.length}</span></div>
          <div>ACS Scores: <span className="font-mono">{acsScores.length}</span></div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {/* IDLE Phase: Show initial view (no content-area background) */}
        {currentPhase === 'IDLE' && <InitialView onSubmit={handleInitialSubmit} />}

        {/* Content area with frosted glass background for conversation phases */}
        {currentPhase !== 'IDLE' && (
          <div className="content-area">
            {/* CONSULTATION Phase: Show conversation */}
            {currentPhase === 'CONSULTATION' && (
              <div className="space-y-3 pt-4 pb-40">
                <ConversationBlock
                  messages={conversationMessages}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}

            {/* DISCOVERY Phase: Show scout block and ACS scores */}
            {currentPhase === 'DISCOVERY' && (
              <div className="space-y-3 pt-4 pb-40">
                {conversationMessages.length > 0 && (
                  <ConversationBlock
                    messages={conversationMessages}
                    onSuggestionClick={handleSuggestionClick}
                  />
                )}
                <ScoutBlock logs={discoveryLogs} />

                {acsScores.length > 0 && (
                  <div className="space-y-4">
                    {/* Top Recommendation */}
                    <div className="max-w-4xl mx-auto px-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🎯</span>
                        <h3 className="text-base font-semibold text-foreground">
                          Best Match
                        </h3>
                      </div>
                      <div className="max-w-[380px]">
                        <ACSScoreCard
                          repository={acsScores[0]!}
                          onConvert={handleConvertToSkill}
                        />
                      </div>
                    </div>

                    {/* Alternatives */}
                    {acsScores.length > 1 && (
                      <div className="max-w-4xl mx-auto px-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          📋 If you need different trade-offs ({acsScores.length - 1} alternatives)
                        </h3>
                        <div className="repo-scroll-wrapper">
                          <div className="overflow-x-auto repo-scroll-container">
                            <div className="flex gap-4 py-1">
                              {acsScores.slice(1).map((repo, idx) => (
                                <div key={idx + 1} className="flex-shrink-0" style={{ width: '340px' }}>
                                  <ACSScoreCard
                                    repository={repo}
                                    onConvert={handleConvertToSkill}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* FABRICATION Phase: Show conversation history + fabricator block */}
            {currentPhase === 'FABRICATION' && (
              <div className="space-y-3 pt-4 pb-40">
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
                  <div className="space-y-4">
                    {/* Top Recommendation */}
                    <div className="max-w-4xl mx-auto px-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🎯</span>
                        <h3 className="text-base font-semibold text-foreground">
                          Best Match
                        </h3>
                      </div>
                      <div className="max-w-[380px]">
                        <ACSScoreCard
                          repository={acsScores[0]!}
                          onConvert={handleConvertToSkill}
                        />
                      </div>
                    </div>

                    {/* Alternatives */}
                    {acsScores.length > 1 && (
                      <div className="max-w-4xl mx-auto px-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          📋 If you need different trade-offs ({acsScores.length - 1} alternatives)
                        </h3>
                        <div className="repo-scroll-wrapper">
                          <div className="overflow-x-auto repo-scroll-container">
                            <div className="flex gap-4 py-1">
                              {acsScores.slice(1).map((repo, idx) => (
                                <div key={idx + 1} className="flex-shrink-0" style={{ width: '340px' }}>
                                  <ACSScoreCard
                                    repository={repo}
                                    onConvert={handleConvertToSkill}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fabrication progress */}
                <FabricatorBlock logs={fabricationLogs} />
              </div>
            )}

            {/* DELIVERY Phase: Show complete journey + skill delivery */}
            {currentPhase === 'DELIVERY' && skillArtifact && (
              <div className="space-y-3 pt-4 pb-40">
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
                  <div className="space-y-4">
                    {/* Top Recommendation */}
                    <div className="max-w-4xl mx-auto px-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🎯</span>
                        <h3 className="text-base font-semibold text-foreground">
                          Best Match
                        </h3>
                      </div>
                      <div className="max-w-[380px]">
                        <ACSScoreCard
                          repository={acsScores[0]!}
                          onConvert={handleConvertToSkill}
                        />
                      </div>
                    </div>

                    {/* Alternatives */}
                    {acsScores.length > 1 && (
                      <div className="max-w-4xl mx-auto px-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          📋 If you need different trade-offs ({acsScores.length - 1} alternatives)
                        </h3>
                        <div className="repo-scroll-wrapper">
                          <div className="overflow-x-auto repo-scroll-container">
                            <div className="flex gap-4 py-1">
                              {acsScores.slice(1).map((repo, idx) => (
                                <div key={idx + 1} className="flex-shrink-0" style={{ width: '340px' }}>
                                  <ACSScoreCard
                                    repository={repo}
                                    onConvert={handleConvertToSkill}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
        )}
      </div>
      {/* Input Area - Fixed bottom with gradient backdrop (prototype-based) */}
      {(currentPhase === 'CONSULTATION' || currentPhase === 'DISCOVERY') && (
        <div className="input-container">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                sendMessage({ text: input });
                setInput('');
              }
            }} 
            className="input-wrapper" 
            autoComplete="off"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about tools, frameworks, or APIs..."
                disabled={status === 'streaming'}
                rows={1}
                className="input-field pr-14"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) {
                      sendMessage({ text: input });
                      setInput('');
                    }
                  }
                }}
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button
                  type="submit"
                  disabled={status === 'streaming' || !input.trim()}
                  className="send-button"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
