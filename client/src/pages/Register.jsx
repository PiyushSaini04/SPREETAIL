import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { Users, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error('Fill in all fields.');
    if (password.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      login(res.data.data);
      toast.success('Account created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a1d2e 0%, #0f1117 70%)',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 0 30px rgba(108,99,255,0.4)',
          }}>
            <Users size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>SplitEase</h1>
          <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>Split expenses effortlessly</p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create your account</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input id="reg-name" className="input" style={{ paddingLeft: '2.25rem' }} type="text" placeholder="Your Name"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input id="reg-email" className="input" style={{ paddingLeft: '2.25rem' }} type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input id="reg-password" className="input" style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  type={showPwd ? 'text' : 'password'} placeholder="At least 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
                }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button id="reg-btn" className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
