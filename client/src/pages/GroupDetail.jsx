import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  ArrowLeft, PlusCircle, UserPlus, UserMinus, Receipt, Upload,
  TrendingDown, TrendingUp, Crown, Handshake, LogOut, Trash2
} from 'lucide-react';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [balanceDetail, setBalanceDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const fetchData = () => {
    Promise.all([
      api.get(`/groups/${groupId}`),
      api.get(`/groups/${groupId}/balances`),
      api.get(`/balances/group/${groupId}/detail`), // wait, the route is /api/v1/balances/group/:groupId/detail
    ])
      .then(([gRes, bRes, dRes]) => {
        setGroup(gRes.data.data);
        setBalances(bRes.data.data);
        setBalanceDetail(dRes.data.data);
      })
      .catch(() => toast.error('Failed to load group.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [groupId]);

  const myRole = group?.members?.find(m => m.userId === user?.id)?.role;
  const isAdmin = myRole === 'ADMIN';

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddingMember(true);
    try {
      await api.post(`/groups/${groupId}/members`, { email: addEmail.trim() });
      toast.success('Member added!');
      setAddEmail('');
      setShowAddMember(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this group?`)) return;
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      toast.success(`${memberName} removed.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.post(`/groups/${groupId}/leave`);
      toast.success('Left group.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot leave group.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group? This cannot be undone.')) return;
    try {
      await api.delete(`/groups/${groupId}`);
      toast.success('Group deleted.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete group.');
    }
  };

  if (loading) return <div style={{ minHeight: '100vh' }}><Navbar /><div className="spinner" /></div>;
  if (!group) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page fade-in">
        <button className="btn-ghost" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.75rem' }} onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Group Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.3rem', color: '#fff',
            }}>
              {group.name[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{group.name}</h1>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{group.members.length} members · {group.expenses?.length || 0} expenses</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate(`/groups/${groupId}/expenses/new`)}>
              <PlusCircle size={15} /> Add Expense
            </button>
            <button className="btn-ghost" onClick={() => navigate(`/groups/${groupId}/settle`)}>
              <Handshake size={15} /> Settle Up
            </button>
            {isAdmin && (
              <>
                <button className="btn-ghost" onClick={() => navigate(`/groups/${groupId}/import`)}>
                  <Upload size={15} /> Import
                </button>
                <button className="btn-ghost" onClick={() => setShowAddMember(!showAddMember)}>
                  <UserPlus size={15} /> Add Member
                </button>
              </>
            )}
          </div>
        </div>

        {/* Add Member Panel */}
        {showAddMember && isAdmin && (
          <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Add Member by Email</h3>
            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.75rem' }}>
              <input id="add-member-email" className="input" type="email" placeholder="member@example.com"
                value={addEmail} onChange={e => setAddEmail(e.target.value)} style={{ flex: 1 }} />
              <button className="btn-primary" type="submit" disabled={addingMember}>
                {addingMember ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Balances */}
            <div className="card">
              <h2 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingDown size={18} color="var(--color-primary)" /> Balances
              </h2>
              {balances.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>✅ All settled up!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {balances.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 600 }}>{b.from?.name}</span>
                        <TrendingDown size={14} color="#ef4444" />
                        <span style={{ fontWeight: 600 }}>{b.to?.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>₹{Number(b.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Balance Breakdown (Rohan's Drill-down Requirement) */}
            {balanceDetail && (balanceDetail.splitsOwed.length > 0 || balanceDetail.expensesPaid.length > 0) && (
              <div className="card">
                <h2 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingDown size={18} color="var(--color-primary)" /> My Balance Breakdown
                </h2>
                
                {balanceDetail.splitsOwed.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>I Owe For</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {balanceDetail.splitsOwed.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span>{s.description} <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>({new Date(s.expenseDate).toLocaleDateString()})</span></span>
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>₹{s.amountOwed.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {balanceDetail.expensesPaid.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>I Paid For</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {balanceDetail.expensesPaid.map(e => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span>{e.description} <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>({new Date(e.expenseDate).toLocaleDateString()})</span></span>
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>₹{e.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Members */}
            <div className="card">
              <h2 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="var(--color-primary)" /> Members
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {group.members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6c63ff55, #a78bfa55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem',
                      }}>
                        {m.user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                          {m.user.name} {m.userId === user?.id && <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{m.user.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {m.role === 'ADMIN' && <Crown size={14} color="#f59e0b" />}
                      {isAdmin && m.userId !== user?.id && (
                        <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleRemoveMember(m.userId, m.user.name)}>
                          <UserMinus size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <hr className="divider" />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={handleLeave}>
                  <LogOut size={14} /> Leave Group
                </button>
                {isAdmin && (
                  <button className="btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={handleDeleteGroup}>
                    <Trash2 size={14} /> Delete Group
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Expenses */}
          <div className="card" style={{ alignSelf: 'flex-start' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={18} color="var(--color-primary)" /> Expenses
            </h2>
            {(!group.expenses || group.expenses.length === 0) ? (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <Receipt size={36} />
                <p style={{ marginTop: '0.5rem' }}>No expenses yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {group.expenses.map(exp => (
                  <div key={exp.id} className="card" style={{ background: 'var(--color-surface-2)', cursor: 'pointer', padding: '1rem' }}
                    onClick={() => navigate(`/expenses/${exp.id}`)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{exp.description}</div>
                        <div style={{ color: 'var(--color-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                          Paid by {exp.paidBy.name} · {exp.splitType}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                        ₹{Number(exp.amountInInr).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
