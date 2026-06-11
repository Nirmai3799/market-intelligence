import { useState, useRef, useEffect } from 'react'
import { sendChat } from '../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  ticker: string
  analysisContext: object
}

export default function ChatPanel({ ticker, analysisContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await sendChat(ticker, analysisContext, newMessages)
      setMessages([...newMessages, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    'Why is RSI so low?',
    'Should I buy the dip here?',
    'What could change your view to bullish?',
    'How does this compare to the sector?',
  ]

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-white font-semibold text-base mb-4">Ask the Analyst — {ticker}</h3>

      {/* Suggestion chips — shown only before first message */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs text-gray-400 border border-gray-700 hover:border-blue-600 hover:text-blue-400 px-3 py-1.5 rounded-full transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Message history */}
      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-200 rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask anything about this stock..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
        >
          Send
        </button>
      </div>
    </div>
  )
}
