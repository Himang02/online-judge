import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Logo from './Logo.jsx';
import LoginModal from './LoginModal.jsx';
import RegisterModal from './RegisterModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = { height: 58, background: 'var(--surface)', borderBottom: '1px solid var(--border)' };

function Avatar({ name }) {
    const initials = (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <span style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent-muted-bg)', color: 'var(--accent-muted)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
        }}>
            {initials}
        </span>
    );
}

export default function Navbar({ variant = 'main', problemTitle, problemId, prevId, nextId }) {
    const { isAuthenticated, role, user, logout } = useAuth();
    const location = useLocation();
    const [modal, setModal] = useState(null);

    const navLink = (to, label) => {
        const active = location.pathname === to;
        return (
            <Link key={to} to={to} style={{
                fontSize: 15, fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--accent-muted)' : '2px solid transparent',
                paddingBottom: 2,
            }}>
                {label}
            </Link>
        );
    };

    if (variant === 'problem') {
        return (
            <nav style={{ ...NAV, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                <div style={{ flex: 1 }}>
                    <Link to="/"><Logo size={30} /></Link>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {prevId && (
                        <Link to={`/problems/${prevId}`} style={navBtnStyle}>‹</Link>
                    )}
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                        {problemTitle ?? ''}
                    </span>
                    {nextId && (
                        <Link to={`/problems/${nextId}`} style={navBtnStyle}>›</Link>
                    )}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                    <Link to="/problems" style={{ fontSize: 14, color: 'var(--muted)' }}>← Problems</Link>
                    {isAuthenticated && <Avatar name={user?.name} />}
                </div>
            </nav>
        );
    }

    return (
        <>
            <nav style={{ ...NAV, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20 }}>
                <Link to="/"><Logo size={30} /></Link>
                <span style={{ width: 1, height: 20, background: 'var(--border)' }} />
                {navLink('/problems', 'Problems')}
                {isAuthenticated && navLink('/submissions', 'Submissions')}
                {role === 'PROBLEM_SETTER' && navLink('/set-problem', 'Set Problem')}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {!isAuthenticated ? (
                        <>
                            <button onClick={() => setModal('login')} style={ghostBtnStyle}>Login</button>
                            <button onClick={() => setModal('register')} style={accentBtnStyle}>Register</button>
                        </>
                    ) : (
                        <>
                            {role === 'PROBLEM_SETTER' && (
                                <span style={{
                                    fontSize: 11, padding: '3px 10px', borderRadius: 20,
                                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                                    border: '1px solid rgba(165,180,252,0.2)',
                                }}>PROBLEM_SETTER</span>
                            )}
                            <button onClick={logout} style={{ ...ghostBtnStyle, fontSize: 12 }}>Logout</button>
                            <Avatar name={user?.name} />
                        </>
                    )}
                </div>
            </nav>
            {modal === 'login' && (
                <LoginModal onClose={() => setModal(null)} onSwitch={() => setModal('register')} />
            )}
            {modal === 'register' && (
                <RegisterModal onClose={() => setModal(null)} onSwitch={() => setModal('login')} />
            )}
        </>
    );
}

const navBtnStyle = {
    width: 26, height: 26, borderRadius: 5, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text)', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 14,
};

const ghostBtnStyle = {
    padding: '6px 16px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 500,
};

const accentBtnStyle = {
    padding: '6px 16px', borderRadius: 7, border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
};
