import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { aiService } from '../../services/aiService';
import { copilotService } from '../../services/copilotService';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const CivicCopilot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Check role authorization on mount
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setMessages([{ role: 'assistant', content: 'Unauthorized: Civic Copilot is restricted to administrative personnel.' }]);
    } else if (user) {
      setMessages([{ 
        role: 'assistant', 
        content: `Hello ${user?.displayName || 'Admin'}. I am Civic Copilot. I can analyze recent reports, priorities, and durability metrics. How can I help you?` 
      }]);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (user?.role !== 'admin') throw new Error("Unauthorized.");

      const dynamicContext = await copilotService.getContextForQuestion(userMessage, user);
      
      const answer = await aiService.askCopilot(userMessage, dynamicContext, user?.role);
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'I am sorry, I encountered an error communicating with the intelligence service.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1">Civic Copilot</h1>
        <p className="text-muted">AI Intelligence bounded by your authorized municipal data.</p>
      </header>

      <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Chat Area */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: m.role === 'user' ? 'var(--text-primary)' : 'var(--accent)',
                color: m.role === 'user' ? 'white' : 'var(--bg-main)',
                flexShrink: 0
              }}>
                {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div style={{ 
                maxWidth: '75%',
                background: m.role === 'user' ? 'var(--surface-hover)' : 'transparent',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                padding: '1rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                lineHeight: '1.6'
              }}>
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={20} className="animate-spin" />
              </div>
              <div className="text-muted">Analyzing civic data...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '1.5rem', background: 'var(--surface-soft)', borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about recurring problems, critical issues, or priorities..."
              disabled={isLoading}
              style={{ flex: 1, padding: '1rem 1.5rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--text-primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer' }}
            >
              <Send size={20} style={{ transform: 'translateX(2px)' }} />
            </button>
          </form>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <SuggestionBadge text="What needs my attention today?" onClick={() => setInput("What needs my attention today?")} />
            <SuggestionBadge text="Which problems keep coming back?" onClick={() => setInput("Which problems keep coming back?")} />
            <SuggestionBadge text="Which department has the most unresolved issues?" onClick={() => setInput("Which department has the most unresolved issues?")} />
          </div>
        </div>
      </div>
    </div>
  );
};

const SuggestionBadge = ({ text, onClick }) => (
  <button 
    onClick={onClick}
    type="button"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
  >
    {text}
  </button>
);

export default CivicCopilot;
