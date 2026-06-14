import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ArrowLeft, Handshake } from 'lucide-react';

export default function Settlement() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [paidToId, setPaidToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    api.get(`/groups/${groupId}`)
      .then(res => {
        const otherMembers = res.data.data.members
          .map(m => m.user)
          .filter(u => u.id !== user?.id);
        
        setMembers(otherMembers);
        if (otherMembers.length > 0) {
          setPaidToId(otherMembers[0].id);
        }
      })
      .catch(() => toast.error('Failed to load group.'))
      .finally(() => setLoading(false));
  }, [groupId, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paidToId || !amount) return toast.error('Please select a recipient and amount.');
    
    setSubmitting(true);
    try {
      await api.post('/settlements', {
        groupId,
        paidToId,
        amount: parseFloat(amount),
        note: note.trim() || undefined
      });
      toast.success('Settlement recorded successfully!');
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page fade-in" style={{ maxWidth: 500 }}>
        <button className="btn-ghost" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.75rem' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Handshake size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Record a Payment</h1>
          </div>

          {members.length === 0 ? (
            <div className="empty-state">
              <p>You are the only member in this group.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">Who are you paying?</label>
                <select className="input" value={paidToId} onChange={e => setPaidToId(e.target.value)}>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Amount (₹)</label>
                <input 
                  className="input" 
                  type="number" 
                  min="0.01" 
                  step="0.01" 
                  placeholder="0.00"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                />
              </div>

              <div>
                <label className="label">Note (Optional)</label>
                <input 
                  className="input" 
                  type="text" 
                  placeholder="e.g. For last night's dinner"
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                />
              </div>

              <button className="btn-primary" type="submit" disabled={submitting} style={{ padding: '0.8rem', fontSize: '1rem', marginTop: '0.5rem' }}>
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
