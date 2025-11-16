'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Users, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  memoryId?: string
  insights?: PersonalInsights
  golemExplorerUrl?: string
}

interface PersonalInsights {
  scheduleAnalysis: {
    busyPeriods: string[];
    freeTimes: string[];
    upcomingImportantMeetings: string[];
    workloadLevel: 'light' | 'moderate' | 'heavy' | 'overwhelming';
  };
  recommendations: {
    meals: string[];
    workoutTimes: string[];
    breakSuggestions: string[];
    priorities: string[];
  };
  wellness: {
    stressIndicators: string[];
    energyOptimization: string[];
    balanceScore: number;
  };
}

interface PersonalizedChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  isLoading: boolean
  isTyping: boolean
  onClearChat: () => void
  storeMemory: boolean
  onToggleMemory: (enabled: boolean) => void
  insights?: PersonalInsights
  onShowProfile?: () => void
}

export function PersonalizedChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading, 
  isTyping, 
  onClearChat,
  storeMemory,
  onToggleMemory,
  insights,
  onShowProfile
}: PersonalizedChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  const formatTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Just now';
      }
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      return 'Just now';
    }
  }

  const quickPrompts = [
    "What's on my schedule?",
    "Help me plan my day",
    "Quick meal ideas?",
    "Productivity tips"
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50">
      
      {/* Messages - Enhanced Neumorphism layout */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border-4 border-gray-500 bg-blue-500 shadow-[6px_6px_0px_0px_rgba(107,114,128,1)]">
              <Users className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3">
              Hey there, friend! 👋
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              I'm Amigo, your AI companion! Let's chat, plan your day, and make life easier together.
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                  className={`max-w-[80%] rounded-xl px-5 py-4 transition-all border-3 border-gray-500 ${
                    message.role === 'user'
                      ? 'text-white bg-blue-500 shadow-[4px_4px_0px_0px_rgba(107,114,128,1)]'
                      : 'text-gray-900 bg-white shadow-[4px_4px_0px_0px_rgba(107,114,128,1)]'
                  }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                <p className={`text-xs mt-2 font-bold ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                  {formatTime(message.timestamp)}
                </p>
                
                {(message.entityUrl || message.transactionUrl) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                      {message.entityUrl && (
                        <a
                          href={message.entityUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all border-2 border-gray-500 uppercase tracking-wide ${
                            message.role === 'user' 
                              ? 'bg-white/20 text-white hover:bg-white/30 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]' 
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white shadow-[2px_2px_0px_0px_rgba(107,114,128,1)]'
                          }`}
                        >
                          Entity →
                        </a>
                      )}
                      {message.transactionUrl && (
                        <a
                          href={message.transactionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all border-2 border-gray-500 uppercase tracking-wide ${
                            message.role === 'user' 
                              ? 'bg-white/20 text-white hover:bg-white/30 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]' 
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white shadow-[2px_2px_0px_0px_rgba(107,114,128,1)]'
                          }`}
                        >
                          TX →
                        </a>
                      )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-xl px-5 py-4 border-3 border-gray-500 shadow-[4px_4px_0px_0px_rgba(107,114,128,1)]">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" strokeWidth={3} />
                    <span className="text-sm font-bold text-gray-900">Thinking...</span>
                  </div>
                </div>
              </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Neo-Brutalism */}
      <div className="border-t-4 border-gray-500 bg-white px-6 py-5">
        <div className="max-w-3xl mx-auto">
          {/* Quick prompts - Enhanced */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(prompt)}
                  className="text-xs font-bold px-4 py-2 rounded-lg text-gray-900 bg-white border-3 border-gray-500 shadow-[3px_3px_0px_0px_rgba(107,114,128,1)] hover:shadow-[4px_4px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
                placeholder="Message Amigo..."
              className="flex-1 px-5 py-4 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none resize-none transition-all border-3 border-gray-500 bg-white font-medium"
              rows={1}
              disabled={isLoading}
            />
              <button
                type="submit"
                className="p-4 rounded-xl text-white transition-all disabled:opacity-50 border-3 border-gray-500 bg-blue-500 hover:bg-blue-600 shadow-[4px_4px_0px_0px_rgba(107,114,128,1)] hover:shadow-[6px_6px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(107,114,128,1)]"
                disabled={!inputValue.trim() || isLoading}
              >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
              ) : (
                <Send className="w-5 h-5" strokeWidth={3} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
