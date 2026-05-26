import { useRef, useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import ReactMarkdown from 'react-markdown'
import { Send, Loader2, Sparkles, History, MessageSquarePlus } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import { useConversationHistory, type HistoryMessage } from './useConversationHistory'
import { getSuggestedQuestions } from './suggestedQuestions'

const VITE_API_URL = import.meta.env['VITE_API_URL'] ?? ''

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => <p className="font-bold text-base mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-sm max-w-[85%] px-4 py-3 text-sm leading-relaxed">
      <ReactMarkdown components={MD_COMPONENTS}>{text}</ReactMarkdown>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="bg-indigo-500 text-white rounded-2xl rounded-br-sm max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  )
}

export function ChatPage() {
  const { babyId, birthDate } = useAuthStore()
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { register, handleSubmit, reset } = useForm<{ message: string }>()

  const { data: history = [] } = useConversationHistory(babyId)
  const suggestedQuestions = getSuggestedQuestions(birthDate)

  const { messages, sendMessage, isLoading } = useChat({
    connection: fetchServerSentEvents(
      () => `${VITE_API_URL}/api/ai/chat?babyId=${babyId ?? ''}`,
      () => ({
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}` },
        credentials: 'include',
      }),
    ),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function getMessageText(msg: (typeof messages)[number]): string {
    return msg.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; content: string }).content)
      .join('')
  }

  function handleSend({ message }: { message: string }) {
    const text = message.trim()
    if (!text || isLoading || !babyId || userMessages.length >= 20) return
    setView('chat')
    sendMessage(text)
    reset()
  }

  function handleSuggestion(text: string) {
    if (!babyId || isLoading) return
    setView('chat')
    sendMessage(text)
  }

  const groupedHistory = useMemo(() => {
    const groups: { day: string; messages: HistoryMessage[] }[] = []
    for (const msg of history) {
      const day = dayKey(msg.createdAt)
      const last = groups[groups.length - 1]
      if (last?.day === day) {
        last.messages.push(msg)
      } else {
        groups.push({ day, messages: [msg] })
      }
    }
    return groups
  }, [history])

  const userMessages = messages.filter((m) => m.role === 'user')
  const hasCurrentSession = messages.length > 0
  const hasAssistantResponse = messages.some((m) => m.role === 'assistant')

  if (!babyId) {
    return (
      <div className="p-4 text-sm text-gray-400 dark:text-gray-500">
        Baby profile not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
        <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Is This Normal?</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Ask about your baby's patterns</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('chat')}
            title="New chat"
            className={`p-2 rounded-lg transition-colors ${
              view === 'chat'
                ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <MessageSquarePlus size={18} />
          </button>
          <button
            onClick={() => setView('history')}
            title="View history"
            className={`p-2 rounded-lg transition-colors ${
              view === 'history'
                ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <History size={18} />
          </button>
        </div>
      </div>

      {/* History view */}
      {view === 'history' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {groupedHistory.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center pt-8">
              No conversation history yet.
            </p>
          ) : (
            groupedHistory.map((group) => (
              <div key={group.day} className="space-y-3">
                {/* Day divider */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                  <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {group.day}
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                </div>

                {group.messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-0.5`}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                      {msg.role === 'user'
                        ? <UserBubble text={msg.content} />
                        : <AssistantBubble text={msg.content} />
                      }
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                      {timeLabel(msg.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Chat view */}
      {view === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Suggestion chips — visible whenever there's no active session */}
            {!hasCurrentSession && (
              <div className="space-y-3 pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Ask anything about your baby's patterns, schedule, or behavior. The assistant uses your actual tracking data to answer.
                </p>
                <div className="flex flex-col md:flex-row md:flex-wrap md:justify-center gap-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q.text}
                      onClick={() => handleSuggestion(q.text)}
                      className="w-full md:w-auto text-left text-sm px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 active:opacity-70 transition-opacity"
                    >
                      <span>{q.text}</span>
                      {q.source && (
                        <span className="ml-1.5 text-[10px] text-indigo-400 dark:text-indigo-500 font-medium">
                          {q.source}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                  Limit: 20 questions per day.
                </p>
              </div>
            )}

            {/* Current session messages */}
            {messages.map((msg) => {
              const text = getMessageText(msg)
              if (!text) return null
              const isUser = msg.role === 'user'
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {isUser ? <UserBubble text={text} /> : <AssistantBubble text={text} />}
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                </div>
              </div>
            )}

            {hasAssistantResponse && (
              <p className="text-[11px] italic text-gray-400 dark:text-gray-500 text-center px-2 pb-2">
                ⚠️ Not medical advice — always consult your pediatrician for health concerns.
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 safe-bottom">
            {userMessages.length >= 20 && (
              <p className="text-xs text-amber-500 dark:text-amber-400 mb-2 text-center">
                Daily limit reached. Try again tomorrow.
              </p>
            )}
            <form onSubmit={handleSubmit(handleSend)} className="flex gap-2">
              <input
                {...register('message')}
                type="text"
                placeholder="Ask about your baby..."
                disabled={isLoading || userMessages.length >= 20}
                autoComplete="off"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || userMessages.length >= 20}
                className="flex-none w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500 text-white disabled:opacity-40 active:opacity-80 transition-opacity"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
