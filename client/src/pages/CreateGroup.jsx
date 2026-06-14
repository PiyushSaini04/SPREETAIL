import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import { Users, ArrowLeft } from 'lucide-react';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Group name is required.');
    setLoading(true);
    try {
      const res = await api.post('/groups', { name: name.trim() });
      toast.success('Group created!');
      navigate(`/groups/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page fade-in" style={{ maxWidth: 520 }}>
        <button className="btn-ghost" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.75rem' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Create a Group</h1>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>You'll be added as admin automatically</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Group Name</label>
              <input
                id="group-name"
                className="input"
                type="text"
                placeholder="e.g. Goa Trip, Hostel Expenses..."
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <button id="create-group-btn" className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
