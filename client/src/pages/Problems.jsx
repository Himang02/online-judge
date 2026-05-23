import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import DifficultyBadge from '../components/DifficultyBadge.jsx';
import TagChip from '../components/TagChip.jsx';
import { useProblems } from '../hooks/useProblems';
import { getTags } from '../api/problems';
import { useAuth } from '../context/AuthContext.jsx';

const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD'];

export default function Problems() {
    const { isAuthenticated } = useAuth();
    const [search, setSearch] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [tag, setTag] = useState('');
    const [page, setPage] = useState(1);
    const [tags, setTags] = useState([]);

    useEffect(() => {
        getTags().then(setTags).catch(() => {});
    }, []);

    const params = {
        ...(search && { search }),
        ...(difficulty && { difficulty }),
        ...(tag && { tag }),
        page,
    };

    const { problems, total, totalPages, loading } = useProblems(params);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Navbar variant="main" />
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Sidebar */}
                <aside style={{
                    width: 185, background: 'var(--surface)', borderRight: '1px solid var(--border)',
                    padding: '18px 0', overflowY: 'auto', flexShrink: 0,
                }}>
                    <SideSection title="Difficulty">
                        {DIFFICULTIES.map((d) => (
                            <SideItem
                                key={d}
                                label={d === 'ALL' ? 'All' : d}
                                active={difficulty === (d === 'ALL' ? '' : d)}
                                onClick={() => { setDifficulty(d === 'ALL' ? '' : d); setPage(1); }}
                            />
                        ))}
                    </SideSection>
                    <SideSection title="Topics">
                        <SideItem label="All" active={tag === ''} onClick={() => { setTag(''); setPage(1); }} />
                        {tags.map((t) => (
                            <SideItem key={t.id} label={t.name} active={tag === t.name}
                                onClick={() => { setTag(t.name); setPage(1); }} />
                        ))}
                    </SideSection>
                </aside>

                {/* Content */}
                <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto' }}>
                    {/* Search bar — temporarily disabled */}
                    {/* <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <input
                            style={inputStyle}
                            placeholder="🔍  Search problems…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div> */}

                    {/* Table */}
                    {loading ? (
                        <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
                    ) : problems.length === 0 ? (
                        <div style={{ color: 'var(--muted)', padding: 20 }}>No problems found.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['#', 'Title', 'Tags', 'Difficulty', 'Acceptance'].map((h) => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {problems.map((p, i) => (
                                    <tr
                                        key={p.id}
                                        style={trStyle}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={tdStyle}>{(page - 1) * 20 + i + 1}</td>
                                        <td style={tdStyle}>
                                            <Link to={`/problems/${p.id}`} style={{ color: 'var(--text)', fontWeight: 500 }}>
                                                {p.title}
                                            </Link>
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {p.tags.slice(0, 2).map((t) => <TagChip key={t.id} name={t.name} />)}
                                            </div>
                                        </td>
                                        <td style={tdStyle}><DifficultyBadge difficulty={p.difficulty} /></td>
                                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>
                                            {p.acceptanceRate !== null ? `${p.acceptanceRate}%` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button key={p} onClick={() => setPage(p)} style={{
                                    width: 32, height: 32, borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: page === p ? 'var(--accent)' : 'transparent',
                                    color: page === p ? '#fff' : 'var(--muted)',
                                    fontSize: 13,
                                }}>{p}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SideSection({ title, children }) {
    return (
        <div style={{ marginBottom: 24, padding: '0 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
                {title.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
        </div>
    );
}

function SideItem({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            textAlign: 'left', padding: '5px 10px', borderRadius: 6, border: 'none',
            background: active ? 'var(--accent-muted-bg)' : 'transparent',
            color: active ? 'var(--accent-muted)' : 'var(--muted)',
            fontSize: 13, cursor: 'pointer',
        }}>
            {label}
        </button>
    );
}

const inputStyle = {
    flex: 1, padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none',
};
const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 600 };
const tdStyle = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)' };
const trStyle = { cursor: 'pointer', background: 'transparent', transition: 'background 0.1s' };
