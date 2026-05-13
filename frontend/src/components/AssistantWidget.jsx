import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { assistantStream } from '@/lib/api'
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

function Message({ role, content, streaming }) {
  const isAssistant = role === 'assistant'
  return (
    <div className={cn('flex gap-2.5 text-sm', isAssistant ? 'items-start' : 'items-start flex-row-reverse')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        isAssistant ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      </div>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-3.5 py-2.5 leading-relaxed',
        isAssistant
          ? 'bg-muted text-foreground rounded-tl-sm'
          : 'bg-primary text-primary-foreground rounded-tr-sm'
      )}>
        {content}
        {streaming && <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle" />}
      </div>
    </div>
  )
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  // Scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus textarea when opened
  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus()
  }, [open])

  const send = () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setStreaming(true)

    // Add a placeholder assistant message to stream into
    const assistantIdx = updated.length
    setMessages((prev) => [...prev, { role: 'assistant', content: '', _streaming: true }])

    // Build the messages array for the API (role + content only)
    const apiMessages = updated.map(({ role, content }) => ({ role, content }))

    assistantStream(
      apiMessages,
      (chunk) => {
        setMessages((prev) => {
          const next = [...prev]
          next[assistantIdx] = { ...next[assistantIdx], content: next[assistantIdx].content + chunk }
          return next
        })
      },
      () => {
        setMessages((prev) => {
          const next = [...prev]
          if (next[assistantIdx]) next[assistantIdx] = { ...next[assistantIdx], _streaming: false }
          return next
        })
        setStreaming(false)
      },
      (err) => {
        setMessages((prev) => {
          const next = [...prev]
          next[assistantIdx] = { role: 'assistant', content: `Error: ${err}`, _streaming: false }
          return next
        })
        setStreaming(false)
      }
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Open AI assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[380px] flex-col rounded-2xl border bg-background shadow-2xl"
          style={{ height: '520px' }}>
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Bot className="h-5 w-5 text-primary-foreground" />
              <div>
                <p className="text-sm font-semibold text-primary-foreground leading-none">LandReg Assistant</p>
                <p className="text-xs text-primary-foreground/70 mt-0.5">Guides you through your step</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
              onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <Bot className="h-10 w-10 opacity-20" />
                <div>
                  <p className="text-sm font-medium">How can I help?</p>
                  <p className="text-xs mt-1 opacity-70">Ask me anything about your registration step.</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <Message key={i} role={msg.role} content={msg.content} streaming={msg._streaming} />
            ))}
          </div>

          {/* Input */}
          <div className="border-t px-3 py-3 flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              rows={1}
              className="resize-none min-h-[40px] max-h-[120px] text-sm"
              placeholder="Ask about your workflow step…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
            <Button size="icon" className="h-10 w-10 shrink-0" onClick={send} disabled={!input.trim() || streaming}>
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
