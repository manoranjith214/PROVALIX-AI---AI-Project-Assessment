import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../../context/AIContext';
import { 
  Sparkles, 
  X, 
  Send, 
  User as UserIcon, 
  Plus, 
  History, 
  Trash2, 
  BookOpen, 
  FolderGit2,
  ChevronLeft,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Eraser,
  Code2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ProvalixLogo } from '../common/ProvalixLogo';

/**
 * Helper to render markdown content with syntax code blocks and copy buttons
 */
const FormattedMessage: React.FC<{
  content: string;
  onCopyCode: (code: string) => void;
  copiedSnippet: string | null;
}> = ({ content, onCopyCode, copiedSnippet }) => {
  // Split on code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: 'text', value: textBefore });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      value: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  const trailingText = content.slice(lastIndex);
  if (trailingText) {
    parts.push({ type: 'text', value: trailingText });
  }

  return (
    <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          const isCopied = copiedSnippet === part.value;
          return (
            <div
              key={index}
              className="my-2 rounded-xl overflow-hidden border border-[#243047] bg-[#090D16] text-[#E2E8F0]"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F172A] border-b border-[#1E293B] text-[11px] text-[#94A3B8]">
                <span className="flex items-center gap-1.5 font-mono font-medium text-[#A78BFA]">
                  <Code2 className="w-3.5 h-3.5" />
                  {part.language}
                </span>
                <button
                  type="button"
                  onClick={() => onCopyCode(part.value)}
                  className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-1.5 py-0.5 rounded hover:bg-[#1E293B]"
                  title="Copy code snippet"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-[11px] sm:text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed text-[#CBD5E1]">
                <code>{part.value}</code>
              </pre>
            </div>
          );
        }

        // Render plain text with basic markdown (bold, lists, inline code)
        const lines = part.value.split('\n');
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lIdx} className="h-1.5" />;
              }

              // Heading formatting
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-xs sm:text-sm font-bold text-[#F8FAFC] mt-2 mb-1">
                    {trimmed.replace('### ', '')}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-sm font-bold text-[#A78BFA] mt-2.5 mb-1">
                    {trimmed.replace('## ', '')}
                  </h3>
                );
              }

              // Bullet points
              const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
              const textContent = isBullet ? trimmed.slice(2) : trimmed;

              // Parse inline formatting: **bold** and `code`
              const segments = textContent.split(/(\*\*.*?\*\*|`.*?`)/g);

              const formattedLine = segments.map((seg, sIdx) => {
                if (seg.startsWith('**') && seg.endsWith('**')) {
                  return (
                    <strong key={sIdx} className="font-semibold text-[#F8FAFC]">
                      {seg.slice(2, -2)}
                    </strong>
                  );
                }
                if (seg.startsWith('`') && seg.endsWith('`')) {
                  return (
                    <code
                      key={sIdx}
                      className="px-1 py-0.5 rounded bg-[#090D16] text-[#A78BFA] font-mono text-[11px] border border-[#1E293B]"
                    >
                      {seg.slice(1, -1)}
                    </code>
                  );
                }
                return seg;
              });

              if (isBullet) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-[#7C3AED] font-bold mt-0.5">•</span>
                    <span className="flex-1">{formattedLine}</span>
                  </div>
                );
              }

              return <p key={lIdx}>{formattedLine}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};

export const AIAssistantDrawer: React.FC = () => {
  const { 
    isOpen, 
    closeAssistant, 
    toggleAssistant, 
    messages, 
    sendMessage, 
    retryLastMessage,
    suggestedQuestions,
    startNewConversation,
    clearCurrentConversation,
    conversations,
    loadConversation,
    deleteConversation,
    isLoading,
    error,
    activeProjectId
  } = useAI();

  const [inputText, setInputText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copiedAnswerId, setCopiedAnswerId] = useState<string | null>(null);
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('provalix_ai_assistant_enabled');
      return stored !== 'false';
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem('provalix_ai_assistant_enabled');
        setIsEnabled(stored !== 'false');
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('provalix:ai_settings_changed', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('provalix:ai_settings_changed', handleStorage);
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;
    setInputText('');
    await sendMessage(query);
  };

  const handleCopyAnswer = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnswerId(id);
    setTimeout(() => setCopiedAnswerId(null), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeSnippet(code);
    setTimeout(() => setCopiedCodeSnippet(null), 2000);
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Floating Circular Trigger */}
      <button
        onClick={toggleAssistant}
        className="fixed bottom-6 right-6 z-40 w-[60px] h-[60px] rounded-full bg-[#7C3AED] text-white shadow-2xl hover:bg-[#6D28D9] hover:scale-105 active:scale-95 transition-all flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/40 cursor-pointer"
        aria-label="Open AI Assistant"
        title="Provalix AI Assistant"
      >
        <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
        <span className="sr-only">AI Assistant</span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          onClick={closeAssistant}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-[#0F172A] z-50 shadow-2xl border-l border-[#1E293B] flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#0B1120]">
          <div className="flex items-center gap-2.5">
            {showHistory ? (
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg hover:bg-[#172033] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                title="Back to chat"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <ProvalixLogo variant="icon-only" size="sm" />
            )}
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-1.5">
                {showHistory ? 'Conversation History' : 'Provalix AI Assistant V2'}
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                {showHistory ? 'Stored RAG sessions' : activeProjectId ? 'Project Context Active' : 'Multilingual • Tanglish • Evaluation RAG'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!showHistory && (
              <>
                <button
                  onClick={() => startNewConversation()}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
                  title="New Conversation"
                  aria-label="New Conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => clearCurrentConversation()}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
                  title="Clear Current Chat"
                  aria-label="Clear Current Chat"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] transition-colors"
                  title="Past Conversations"
                  aria-label="Past Conversations"
                >
                  <History className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={closeAssistant}
              className="text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#172033] transition-colors"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History View */}
        {showHistory ? (
          <div className="flex-1 p-4 overflow-y-auto divide-y divide-[#1E293B]">
            {conversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#94A3B8]">
                No past conversations found.
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#172033] rounded-xl transition-colors cursor-pointer group"
                  onClick={() => {
                    loadConversation(conv.id);
                    setShowHistory(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                      {conv.title || 'Untitled Conversation'}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
                      {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Error banner if any */}
            {error && (
              <div className="mx-4 mt-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-red-400">
                <div className="flex items-center gap-2 truncate">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => retryLastMessage()}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-300 hover:text-white bg-red-500/20 px-2 py-0.5 rounded-lg transition-colors shrink-0"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {/* Chat History */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 text-sm ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                      msg.sender === 'user'
                        ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30'
                        : 'bg-[#172033] text-[#A78BFA] border border-[#243047]'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <UserIcon className="w-3.5 h-3.5" />
                    ) : (
                      <img src="/provalix-icon.png" alt="Provalix AI" className="w-4 h-4 object-contain" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#172033] border border-[#243047] text-[#F8FAFC]'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">{msg.text}</p>
                    ) : (
                      <FormattedMessage
                        content={msg.text}
                        onCopyCode={handleCopyCode}
                        copiedSnippet={copiedCodeSnippet}
                      />
                    )}

                    {/* Source Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#1E293B]">
                        <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Sources & Rubrics Cited:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {msg.sources.map((src, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] bg-[#111827] border border-[#243047] px-2 py-0.5 rounded text-[#CBD5E1]"
                            >
                              {src.category === 'User Project Evaluation' || src.category === 'Classroom Evaluation' ? (
                                <FolderGit2 className="w-2.5 h-2.5 text-[#A78BFA]" />
                              ) : (
                                <BookOpen className="w-2.5 h-2.5 text-[#A78BFA]" />
                              )}
                              {src.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer: timestamp + copy answer button */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px]">
                      <span className={msg.sender === 'user' ? 'text-purple-200' : 'text-[#64748B]'}>
                        {msg.timestamp}
                      </span>
                      {msg.sender === 'ai' && (
                        <button
                          type="button"
                          onClick={() => handleCopyAnswer(msg.id, msg.text)}
                          className="flex items-center gap-1 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                          title="Copy Answer"
                        >
                          {copiedAnswerId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing / Loading indicator */}
              {isLoading && (
                <div className="flex gap-2.5 text-sm items-center text-[#94A3B8]">
                  <div className="w-7 h-7 rounded-lg bg-[#172033] text-[#A78BFA] border border-[#243047] flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-[#172033] border border-[#243047] rounded-xl px-3.5 py-2 text-xs text-[#94A3B8] flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-bounce" />
                    </span>
                    <span>Provalix Assistant is formulating response...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Quick Actions */}
            <div className="border-t border-[#1E293B] bg-[#0B1120]">
              {suggestedQuestions && suggestedQuestions.length > 0 && (
                <div className="px-3 pt-2.5 pb-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 flex-nowrap border-b border-[#1E293B]/40">
                  <span className="text-[10px] font-semibold text-[#A78BFA] flex items-center gap-1 shrink-0 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-[#7C3AED]" /> Quick Actions:
                  </span>
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSend(q)}
                      className="shrink-0 text-xs bg-[#172033] hover:bg-[#7C3AED]/20 border border-[#243047] hover:border-[#7C3AED]/50 text-[#CBD5E1] hover:text-[#F8FAFC] px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="p-3 sm:p-4">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Ask in English, Tamil, Tanglish, or Hindi..."
                    className="flex-1 bg-[#0F172A] border border-[#243047] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all text-[#F8FAFC] placeholder:text-[#64748B]"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!inputText.trim() || isLoading}
                    className="!px-3.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
