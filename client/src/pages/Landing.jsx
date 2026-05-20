import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Logo from '../components/Logo.jsx';
import DifficultyBadge from '../components/DifficultyBadge.jsx';
import TagChip from '../components/TagChip.jsx';
import { useProblems } from '../hooks/useProblems';

export default function Landing() {
    const { problems } = useProblems({ limit: 4 });

    return (
        <div>
            <Navbar variant="main" />

            {/* Hero */}
            <section style={{ textAlign: 'center', padding: '60px 28px 52px' }}>
                <span style={{
                    display: 'inline-block', marginBottom: 20,
                    padding: '4px 14px', borderRadius: 20,
                    background: 'var(--accent-muted-bg)', color: 'var(--accent-muted)',
                    border: '1px solid rgba(96,165,250,0.2)', fontSize: 13,
                }}>
                    ✦ Practice · Submit · Improve
                </span>
                <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16 }}>
                    Your Arena for<br />
                    <span style={{ color: 'var(--accent-muted)' }}>Competitive Coding</span>
                </h1>
                <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 28px' }}>
                    Practice algorithmic problems, submit solutions in multiple languages,
                    and get AI-powered code reviews.
                </p>
                <Link to="/problems">
                    <button style={{
                        padding: '11px 28px', background: 'var(--accent)', color: '#fff',
                        border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
                    }}>
                        Explore Problems →
                    </button>
                </Link>
            </section>

            {/* Feature cards */}
            <section style={{ padding: '0 28px 44px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                    { icon: '⚙️', title: 'Multi-language Support', desc: 'C, C++, Java, Python' },
                    { icon: '🤖', title: 'AI Code Review', desc: 'Feedback on logic, complexity, style' },
                    { icon: '📊', title: 'Track Progress', desc: 'Submission history, solved count' },
                ].map((f) => (
                    <div key={f.title} style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 10, padding: 20,
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{f.desc}</div>
                    </div>
                ))}
            </section>

            {/* Featured problems */}
            <section style={{ padding: '0 28px 40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Featured Problems</span>
                    <Link to="/problems" style={{ fontSize: 13, color: 'var(--accent-muted)' }}>View all →</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {problems.map((p) => (
                        <Link key={p.id} to={`/problems/${p.id}`}>
                            <div style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 8, padding: '10px 14px',
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <DifficultyBadge difficulty={p.difficulty} />
                                <span style={{ fontWeight: 500, flex: 1 }}>{p.title}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {p.tags.slice(0, 2).map((t) => <TagChip key={t.id} name={t.name} />)}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                background: 'var(--surface)', borderTop: '1px solid var(--border)',
                padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Logo size={22} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Built for coders, by coders.</span>
            </footer>
        </div>
    );
}
