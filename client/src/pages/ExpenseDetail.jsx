import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import { ArrowLeft, Receipt, Send, Trash2, Clock } from 'lucide-react';

export default function ExpenseDetail() {
  const { expenseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { joinExpense, leaveExpense, sendMessage, onNewMessage, connected } = useSocket();

  const [expense, setExpense] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get(`/expenses/${expenseId}`),
      api.get(`/expenses/${expenseId}/messages`)
    ])
      .then(([expRes, msgRes]) => {
        setExpense(expRes.data.data);
        setMessages(msgRes.data.data);
      })
      .catch(() => toast.error('Failed to load expense details.'))
      .finally(() => setLoading(false));
  }, [expenseId]);

  useEffect(() => {
    if (!loading && expense) {
      joinExpense(expenseId);
      const unsubscribe = onNewMessage((msg) => {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      });

      return () => {
        unsubscribe();
        leaveExpense(expenseId);
      };
    }
  }, [loading, expenseId, expense]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(expenseId, chatInput.trim(), user.id);
    setChatInput('');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this expense? This will recalculate all balances.')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success('Expense deleted.');
      navigate(`/groups/${expense.groupId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  if (loading) return <div className="spinner" />;
  if (!expense) return null;

  const isCreator = expense.createdById === user?.id;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="page fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 800 }}>
        
        <div>
          <button className="btn-ghost" style={{ padding: '0.4rem 0.75rem' }} onClick={() => navigate(`/groups/${expense.groupId}`)}>
            <ArrowLeft size={16} /> Back to Group
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* Left Column: Details & Splits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #22c55e, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={24} color="#fff" />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{expense.description}</h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <Clock size={12} /> {new Date(expense.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22c55e' }}>₹{Number(expense.amountInInr).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Paid by {expense.paidBy.name}</div>
                </div>
              </div>

              {isCreator && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <button className="btn-danger" onClick={handleDelete} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                    <Trash2 size={14} /> Delete Expense
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Split Breakdown ({expense.splitType})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {expense.splits.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        {s.user.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{s.user.id === user?.id ? 'You' : s.user.name}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>₹{Number(s.amountOwed).toLocaleString('en-IN')}</span>
                      {expense.splitType === 'PERCENTAGE' && <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{s.percentage}%</span>}
                      {expense.splitType === 'SHARES' && <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{s.shares} shares</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Chat */}
          <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Expense Chat</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
                {connected ? 'Live' : 'Connecting...'}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--color-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                  No messages yet.<br/>Start the conversation!
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.user.id === user?.id;
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.2rem', marginLeft: isMe ? 0 : '0.5rem', marginRight: isMe ? '0.5rem' : 0 }}>
                        {isMe ? 'You' : msg.user.name}
                      </span>
                      <div style={{
                        background: isMe ? 'var(--color-primary)' : 'var(--color-surface-2)',
                        color: isMe ? '#fff' : 'var(--color-text)',
                        padding: '0.6rem 1rem',
                        borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        maxWidth: '85%',
                        fontSize: '0.9rem',
                        wordBreak: 'break-word',
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', background: 'var(--color-surface)' }}>
              <input 
                className="input" 
                type="text" 
                placeholder="Type a message..." 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                style={{ flex: 1, borderRadius: 20 }}
              />
              <button className="btn-primary" type="submit" disabled={!connected || !chatInput.trim()} style={{ borderRadius: '50%', width: 42, height: 42, padding: 0, flexShrink: 0 }}>
                <Send size={16} style={{ marginLeft: -2 }} />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
