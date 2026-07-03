import { useState, useRef, useEffect } from 'react'

export default function RightPanel({ project, selectedNodeId }) {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hello! I am your AI assistant for this project. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    // Mocking an AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', content: 'This is a mocked response. You said: "' + userMessage.content + '"' }])
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="chat-right-panel tree-right-panel">
      <div className="chat-header">
        Project Assistant
      </div>
      <div className="chat-messages">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-message ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="chat-message bot" style={{ opacity: 0.7 }}>
            Typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input 
          type="text" 
          placeholder="Ask me anything..." 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={loading} title="Send">
          ➔
        </button>
      </div>
    </div>
  )
}
