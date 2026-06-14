import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, Users, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: '0 1.5rem',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={18} color="#fff" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>SplitEase</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
          onClick={() => navigate('/groups/create')}>
          <PlusCircle size={14} /> New Group
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.85rem', color: '#fff',
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </span>
        </div>
        <button className="btn-ghost" style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }} onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </nav>
  );
}
