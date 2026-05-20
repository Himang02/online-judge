import { useState, useEffect } from 'react';
import { register as registerApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterModal({ onClose, onSwitch }) {
    const { login } = useAuth();
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token } = await registerApi(form.name, form.username, form.email, form.password);
            login(token);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error ?? 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>Create account</h2>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input style={inputStyle} placeholder="Full name" value={form.name} onChange={set('name')} required />
                    <input style={inputStyle} placeholder="Username" value={form.username} onChange={set('username')} required />
                    <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
                    <input style={inputStyle} type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
                    {error && <span style={{ color: '#f87171', fontSize: 13 }}>{error}</span>}
                    <button type="submit" disabled={loading} style={submitBtnStyle}>
                        {loading ? 'Creating…' : 'Create account'}
                    </button>
                </form>
                <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
                    Already have an account?{' '}
                    <button onClick={onSwitch} style={linkBtnStyle}>Sign in</button>
                </p>
            </div>
        </div>
    );
}

const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const cardStyle = {
    background: 'var(--surface)', borderRadius: 12, padding: 32,
    width: 400, border: '1px solid var(--border)',
};
const inputStyle = {
    padding: '10px 12px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, outline: 'none',
};
const submitBtnStyle = {
    padding: '10px', borderRadius: 7, border: 'none', background: 'var(--accent)',
    color: '#fff', fontWeight: 600, fontSize: 14,
};
const linkBtnStyle = {
    background: 'none', border: 'none', color: 'var(--accent-muted)',
    cursor: 'pointer', fontSize: 13, padding: 0,
};
