import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import DifficultyBadge from '../components/DifficultyBadge.jsx';
import { getMySubmissions } from '../api/submissions';
import { VERDICT_LABELS, VERDICT_COLORS } from '../utils/verdicts';

const LANGUAGES = ['', 'C', 'CPP', 'JAVA', 'PYTHON'];
const VERDICTS = ['', 'AC', 'WA', 'TLE', 'MLE', 'RTE', 'CE', 'IE'];

export default function Submissions() {
    const [data, setData] = useState({ submissions: [], total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [verdict, setVerdict] = useState('');
    const [language, setLanguage] = useState('');
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        setLoading(true);
        const params = { page, ...(search && { search }), ...(verdict && { verdict }), ...(language && { language }) };
        getMySubmissions(params)
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, search, verdict, language]);

    const { submissions, total, totalPages } = data;

    const acCount = submissions.filter((s) => s.verdict === 'AC').length;
    const waCount = submissions.filter((s) => s.verdict === 'WA').length;
    const otherCount = submissions.filter((s) => !['AC', 'WA'].includes(s.verdict)).length;

    return (
        <div>
            <Navbar variant="main" />
            <div style={{ padding: '24px 28px' }}>

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                        { label: 'Total', value: total },
                        { label: 'Accepted', value: acCount, color: '#4ade80' },
                        { label: 'Wrong Answer', value: waCount, color: '#f87171' },
                        { label: 'TLE / Other', value: otherCount, color: '#fb923c' },
                    ].map((c) => (
                        <div key={c.label} style={{
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: '14px 16px',
                        }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: c.color ?? 'var(--text)' }}>{c.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
                    <input
                        style={inputStyle}
                        placeholder="🔍  Search by problem name…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                    <select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} style={selectStyle}>
                        <option value="">All Languages</option>
                        {LANGUAGES.filter(Boolean).map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

                {/* Verdict pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {VERDICTS.map((v) => {
                        const active = verdict === v;
                        const color = v ? VERDICT_COLORS[v] : 'var(--accent-muted)';
                        return (
                            <button key={v} onClick={() => { setVerdict(v); setPage(1); }} style={{
                                padding: '4px 12px', borderRadius: 12, border: `1px solid ${active ? color : 'var(--border)'}`,
                                background: active ? `${color}22` : 'transparent',
                                color: active ? color : 'var(--muted)', fontSize: 12, cursor: 'pointer',
                            }}>
                                {v ? VERDICT_LABELS[v] : 'All'}
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
                ) : submissions.length === 0 ? (
                    <div style={{ color: 'var(--muted)', padding: 20 }}>No submissions found.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Problem', 'Difficulty', 'Verdict', 'Language', 'Runtime', 'Submitted'].map((h) => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((s) => (
                                <>
                                    <tr
                                        key={s.id}
                                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={tdStyle}>
                                            <Link
                                                to={`/problems/${s.problemId}`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: 'var(--accent-muted)' }}
                                            >
                                                {s.problem?.title ?? s.problemId}
                                            </Link>
                                        </td>
                                        <td style={tdStyle}>
                                            {s.problem?.difficulty && <DifficultyBadge difficulty={s.problem.difficulty} />}
                                        </td>
                                        <td style={{ ...tdStyle, color: VERDICT_COLORS[s.verdict], fontWeight: 600 }}>
                                            {VERDICT_LABELS[s.verdict] ?? s.verdict}
                                        </td>
                                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>{s.language}</td>
                                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>
                                            {s.runtime != null ? `${s.runtime} ms` : '—'}
                                        </td>
                                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>
                                            {new Date(s.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                    {expanded === s.id && (
                                        <tr key={`${s.id}-drawer`}>
                                            <td colSpan={6} style={{ padding: 0 }}>
                                                <div style={{ background: 'var(--editor-bg)', padding: 16, position: 'relative' }}>
                                                    <button
                                                        onClick={() => setExpanded(null)}
                                                        style={{ position: 'absolute', top: 10, right: 14, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16 }}
                                                    >✕</button>
                                                    <pre style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, color: 'var(--text)', overflowX: 'auto' }}>
                                                        {s.code ?? '(code not available)'}
                                                    </pre>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button key={p} onClick={() => setPage(p)} style={{
                                width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)',
                                background: page === p ? 'var(--accent)' : 'transparent',
                                color: page === p ? '#fff' : 'var(--muted)', fontSize: 13,
                            }}>{p}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle = {
    flex: 1, padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none',
};
const selectStyle = {
    padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none',
};
const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 600 };
const tdStyle = { padding: '10px 12px', fontSize: 13 };
