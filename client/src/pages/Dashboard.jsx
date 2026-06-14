import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Users, ArrowRight, TrendingDown, TrendingUp, Minus, PlusCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/groups'),
      api.get('/balances/me'),
    ])
      .then(([gRes, bRes]) => {
        setGroups(gRes.data.data);
        setBalanceSummary(bRes.data.data);
      })
      .catch(() => toast.error('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page fade-in">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Hello, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>Here's your expense overview</p>
        </div>

        {/* Balance Summary Cards */}
        {balanceSummary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TrendingDown size={18} color="#ef4444" />
                <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem', fontWeight: 600 }}>YOU OWE</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>
                ₹{balanceSummary.totalOwed.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="card" style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={18} color="#22c55e" />
                <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem', fontWeight: 600 }}>YOU ARE OWED</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e' }}>
                ₹{balanceSummary.totalReceivable.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="card" style={{
              borderColor: balanceSummary.netBalance >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
              background: balanceSummary.netBalance >= 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Minus size={18} color={balanceSummary.netBalance >= 0 ? '#22c55e' : '#ef4444'} />
                <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem', fontWeight: 600 }}>NET BALANCE</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: balanceSummary.netBalance >= 0 ? '#22c55e' : '#ef4444' }}>
                {balanceSummary.netBalance >= 0 ? '+' : ''}₹{Math.abs(balanceSummary.netBalance).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}

        {/* Groups List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your Groups</h2>
          <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }} onClick={() => navigate('/groups/create')}>
            <PlusCircle size={14} /> New Group
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : groups.length === 0 ? (
          <div className="card empty-state">
            <Users size={48} style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>No groups yet</h3>
            <p style={{ marginBottom: '1.5rem' }}>Create a group to start splitting expenses</p>
            <button className="btn-primary" onClick={() => navigate('/groups/create')}>
              <PlusCircle size={16} /> Create your first group
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {groups.map(group => (
              <div key={group.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => navigate(`/groups/${group.id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '1.1rem', color: '#fff', flexShrink: 0,
                  }}>
                    {group.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{group.name}</div>
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}>
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="var(--color-muted)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
