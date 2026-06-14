import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ArrowLeft, Receipt, CheckCircle } from 'lucide-react';

export default function AddExpense() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(user?.id || '');
  const [splitType, setSplitType] = useState('EQUAL');
  
  // Split data states
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [unequalSplits, setUnequalSplits] = useState({});
  const [percentageSplits, setPercentageSplits] = useState({});
  const [sharesSplits, setSharesSplits] = useState({});

  useEffect(() => {
    api.get(`/groups/${groupId}`)
      .then(res => {
        const groupMembers = res.data.data.members.map(m => m.user);
        setMembers(groupMembers);
        
        // Default to all users selected for EQUAL
        const allIds = new Set(groupMembers.map(m => m.id));
        setSelectedUsers(allIds);

        // Initialize empty split states
        const initial = {};
        groupMembers.forEach(m => initial[m.id] = '');
        setUnequalSplits({ ...initial });
        setPercentageSplits({ ...initial });
        setSharesSplits({ ...initial });
      })
      .catch(() => toast.error('Failed to load group members.'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const toggleUserSelection = (id) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const handleInput = (id, value, stateObj, setter) => {
    setter({ ...stateObj, [id]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount || !paidById) return toast.error('Fill in description, amount, and who paid.');

    let splitData = {};

    if (splitType === 'EQUAL') {
      if (selectedUsers.size === 0) return toast.error('Select at least one participant.');
      splitData.userIds = Array.from(selectedUsers);
    } else if (splitType === 'UNEQUAL') {
      const splits = Object.entries(unequalSplits)
        .filter(([_, amt]) => amt && parseFloat(amt) > 0)
        .map(([userId, amt]) => ({ userId, amount: parseFloat(amt) }));
      if (splits.length === 0) return toast.error('Enter at least one split amount.');
      splitData.splits = splits;
    } else if (splitType === 'PERCENTAGE') {
      const splits = Object.entries(percentageSplits)
        .filter(([_, pct]) => pct && parseFloat(pct) > 0)
        .map(([userId, pct]) => ({ userId, percentage: parseFloat(pct) }));
      if (splits.length === 0) return toast.error('Enter at least one percentage.');
      splitData.splits = splits;
    } else if (splitType === 'SHARES') {
      const splits = Object.entries(sharesSplits)
        .filter(([_, shr]) => shr && parseInt(shr) > 0)
        .map(([userId, shr]) => ({ userId, shares: parseInt(shr) }));
      if (splits.length === 0) return toast.error('Enter at least one share.');
      splitData.splits = splits;
    }

    setSubmitting(true);
    try {
      await api.post('/expenses', {
        groupId,
        description,
        amount: parseFloat(amount),
        paidById,
        splitType,
        splitData
      });
      toast.success('Expense added!');
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page fade-in" style={{ maxWidth: 600 }}>
        <button className="btn-ghost" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.75rem' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #22c55e, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Receipt size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Add an Expense</h1>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Basic Info */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 2 }}>
                <label className="label">Description</label>
                <input className="input" type="text" placeholder="e.g. Dinner at Taj"
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Amount (₹)</label>
                <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Who Paid?</label>
              <select className="input" value={paidById} onChange={e => setPaidById(e.target.value)}>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.id === user?.id ? 'You' : m.name}</option>
                ))}
              </select>
            </div>

            <hr className="divider" />

            {/* Split Type Selection */}
            <div>
              <label className="label">Split Type</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'].map(type => (
                  <button key={type} type="button"
                    className={`btn-ghost ${splitType === type ? 'active' : ''}`}
                    style={{
                      borderColor: splitType === type ? 'var(--color-primary)' : 'var(--color-border)',
                      background: splitType === type ? 'rgba(108,99,255,0.1)' : 'transparent',
                      color: splitType === type ? 'var(--color-primary)' : 'var(--color-muted)'
                    }}
                    onClick={() => setSplitType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Split Inputs */}
            <div style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.id === user?.id ? 'You' : m.name}</span>
                  </div>

                  {splitType === 'EQUAL' && (
                    <button type="button" onClick={() => toggleUserSelection(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <CheckCircle size={20} color={selectedUsers.has(m.id) ? '#22c55e' : 'var(--color-border)'} />
                    </button>
                  )}

                  {splitType === 'UNEQUAL' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>₹</span>
                      <input className="input" type="number" min="0" step="0.01" style={{ width: 100, padding: '0.4rem 0.5rem' }}
                        value={unequalSplits[m.id]} onChange={e => handleInput(m.id, e.target.value, unequalSplits, setUnequalSplits)} />
                    </div>
                  )}

                  {splitType === 'PERCENTAGE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input className="input" type="number" min="0" max="100" step="0.01" style={{ width: 80, padding: '0.4rem 0.5rem' }}
                        value={percentageSplits[m.id]} onChange={e => handleInput(m.id, e.target.value, percentageSplits, setPercentageSplits)} />
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>%</span>
                    </div>
                  )}

                  {splitType === 'SHARES' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input className="input" type="number" min="0" step="1" style={{ width: 80, padding: '0.4rem 0.5rem' }}
                        value={sharesSplits[m.id]} onChange={e => handleInput(m.id, e.target.value, sharesSplits, setSharesSplits)} />
                      <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>shares</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button className="btn-primary" type="submit" disabled={submitting} style={{ padding: '0.8rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              {submitting ? 'Saving...' : 'Save Expense'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
