import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar.jsx';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

export default function ImportExpenses() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file) return toast.error('Please select a CSV file first.');
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    try {
      const res = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(res.data.data);
      toast.success('Preview generated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionChange = (id, action) => {
    setPreviewData(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === id ? { ...r, userDecision: action } : r)
    }));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await api.post('/import/confirm', {
        groupId,
        rows: previewData.rows,
        exchangeRate: Number(exchangeRate)
      });
      toast.success(`Import complete: ${res.data.data.importedCount} expenses imported, ${res.data.data.settlementsCount} settlements, ${res.data.data.skippedCount} skipped.`);
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page fade-in">
        <button className="btn-ghost" style={{ marginBottom: '1.5rem', padding: '0.4rem 0.75rem' }} onClick={() => navigate(`/groups/${groupId}`)}>
          <ArrowLeft size={16} /> Back to Group
        </button>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Import Expenses (CSV)</h1>
        <p style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
          Upload your group's expense spreadsheet. We'll preview it and highlight any issues before saving.
        </p>

        {!previewData ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', border: '2px dashed var(--color-border)' }}>
            <Upload size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem' }}>Select CSV File</h2>
            <input type="file" accept=".csv" onChange={handleFileChange} style={{ marginBottom: '1.5rem' }} />
            <div>
              <button className="btn-primary" onClick={handlePreview} disabled={!file || loading}>
                {loading ? 'Processing...' : 'Generate Preview'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} color="var(--color-primary)" />
                  Import Summary
                </h3>
                <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                  Total Rows: <strong>{previewData.summary.total}</strong> · 
                  Valid: <strong style={{ color: '#22c55e' }}>{previewData.summary.valid}</strong> · 
                  Anomalies: <strong style={{ color: '#ef4444' }}>{previewData.summary.anomalies}</strong>
                  {previewData.summary.usersToCreate?.length > 0 && (
                    <> · New users to create: <strong>{previewData.summary.usersToCreate.join(', ')}</strong></>
                  )}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {previewData.hasUSD && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>USD to INR Rate</label>
                    <input type="number" className="input" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} style={{ width: '100px' }} />
                  </div>
                )}
                <button className="btn-primary" onClick={handleConfirm} disabled={loading} style={{ height: 'fit-content' }}>
                  {loading ? 'Importing...' : 'Confirm Import'} <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Review Rows</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {previewData.rows.map(row => (
                <div key={row.id} className="card" style={{ borderLeft: `4px solid ${row.hasAnomaly ? '#ef4444' : '#22c55e'}`, background: 'var(--color-surface-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {row.hasAnomaly ? <AlertTriangle size={18} color="#ef4444" /> : <CheckCircle size={18} color="#22c55e" />}
                        {row.parsed.description || 'Untitled Expense'}
                      </div>
                      <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                        <span><strong>Date:</strong> {row.parsed.date ? new Date(row.parsed.date).toLocaleDateString() : 'Unknown'}</span>
                        <span><strong>Paid By:</strong> {row.parsed.paidBy || 'Unknown'}</span>
                        <span><strong>Amount:</strong> {row.parsed.currency} {row.parsed.amount}</span>
                        <span><strong>Split:</strong> {row.parsed.splitType || 'Settlement'}</span>
                      </div>
                      
                      {row.hasAnomaly && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                          <strong style={{ color: '#ef4444', fontSize: '0.85rem' }}>Anomaly Detected: {row.issueType}</strong>
                          <ul style={{ margin: '0.25rem 0 0 1.5rem', color: '#f87171', fontSize: '0.85rem' }}>
                            {row.anomalyDetails.map((d, i) => <li key={i}>{d}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ minWidth: '160px', textAlign: 'right' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>Action</label>
                      <select 
                        className="input" 
                        value={row.userDecision} 
                        onChange={e => handleActionChange(row.id, e.target.value)}
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      >
                        <option value="Approve">Approve (Import)</option>
                        <option value="Reject Row">Reject Row</option>
                        <option value="Skip Row">Skip Row</option>
                        {row.issueType === 'Settlement' && <option value="Import as Settlement">Import as Settlement</option>}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
