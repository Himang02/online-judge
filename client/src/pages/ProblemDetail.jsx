import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import Navbar from '../components/Navbar.jsx';
import DifficultyBadge from '../components/DifficultyBadge.jsx';
import TagChip from '../components/TagChip.jsx';
import LoginModal from '../components/LoginModal.jsx';
import { getProblemById } from '../api/problems';
import { submitCode, getSubmissionsByProblem, streamVerdict } from '../api/submissions';
import { getAIReview } from '../api/ai';
import { useAuth } from '../context/AuthContext.jsx';
import { VERDICT_LABELS, VERDICT_COLORS } from '../utils/verdicts';

const LANGUAGES = [
    { label: 'Python', value: 'PYTHON' },
    { label: 'C++',    value: 'CPP' },
    { label: 'Java',   value: 'JAVA' },
    { label: 'C',      value: 'C' },
];

const STARTER = {
    PYTHON: '# Write your solution here\n',
    CPP:    '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
    JAVA:   'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
    C:      '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
};

export default function ProblemDetail() {
    const { id } = useParams();
    const { isAuthenticated } = useAuth();

    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);

    const [leftTab, setLeftTab] = useState('description');
    const [bottomTab, setBottomTab] = useState('output');

    const [language, setLanguage] = useState('PYTHON');
    const [codeMap, setCodeMap] = useState(STARTER);

    const [submitting, setSubmitting] = useState(false);
    const [verdict, setVerdict] = useState(null);
    const [verdictLoading, setVerdictLoading] = useState(false);

    const [mySubmissions, setMySubmissions] = useState([]);
    const [aiReview, setAiReview] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const [showLoginModal, setShowLoginModal] = useState(false);
    const verdictSubId = useRef(null);

    useEffect(() => {
        getProblemById(id)
            .then(setProblem)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (isAuthenticated) {
            getSubmissionsByProblem(id).then(setMySubmissions).catch(() => {});
        }
    }, [id, isAuthenticated, verdict]);

    const handleSubmit = async () => {
        if (!isAuthenticated) { setShowLoginModal(true); return; }
        setSubmitting(true);
        setVerdict(null);
        setVerdictLoading(true);
        setBottomTab('output');
        try {
            const submission = await submitCode(id, language, codeMap[language]);
            verdictSubId.current = submission.id;
            streamVerdict(
                submission.id,
                (v) => { setVerdict(v); setVerdictLoading(false); },
                () => { setVerdictLoading(false); }
            );
        } catch (err) {
            setVerdict('IE');
            setVerdictLoading(false);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAIReview = async () => {
        if (!verdictSubId.current) return;
        setAiLoading(true);
        setAiError('');
        setBottomTab('ai');
        try {
            const data = await getAIReview(verdictSubId.current);
            setAiReview(data);
        } catch (err) {
            setAiError(err.response?.data?.error ?? 'AI review unavailable');
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
    if (!problem) return <div style={{ padding: 40, color: '#f87171' }}>Problem not found.</div>;

    const navbarHeight = 46;
    const bodyHeight = `calc(100vh - ${navbarHeight}px)`;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar
                variant="problem"
                problemTitle={`${problem.title}`}
                problemId={id}
                prevId={problem.prevId}
                nextId={problem.nextId}
            />

            <div style={{ display: 'flex', height: bodyHeight, overflow: 'hidden' }}>
                {/* Left panel */}
                <div style={{ width: '42%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                        {['description', 'submissions'].map((t) => (
                            <button key={t} onClick={() => setLeftTab(t)} style={{
                                padding: '10px 18px', border: 'none', background: 'transparent',
                                color: leftTab === t ? 'var(--text)' : 'var(--muted)',
                                borderBottom: leftTab === t ? '2px solid var(--accent-muted)' : '2px solid transparent',
                                fontSize: 13, fontWeight: leftTab === t ? 600 : 400,
                            }}>
                                {t === 'description' ? 'Description' : 'My Submissions'}
                            </button>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
                        {leftTab === 'description' ? (
                            <DescriptionTab problem={problem} />
                        ) : (
                            <SubmissionsTab submissions={mySubmissions} isAuthenticated={isAuthenticated} />
                        )}
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Editor toolbar */}
                    <div style={{
                        height: 44, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px',
                    }}>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={toolbarCtrlStyle}
                        >
                            {LANGUAGES.map((l) => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{ ...toolbarCtrlStyle, background: 'var(--accent)', color: '#fff', border: 'none' }}
                        >
                            {submitting ? 'Submitting…' : 'Submit'}
                        </button>
                    </div>

                    {/* Editor */}
                    <div style={{ flex: 1 }}>
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={LANG_TO_MONACO[language]}
                            value={codeMap[language]}
                            onChange={(val) => setCodeMap((m) => ({ ...m, [language]: val ?? '' }))}
                            options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false }}
                        />
                    </div>

                    {/* Bottom panel */}
                    <div style={{ height: 175, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface2)' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                            {['output', 'ai'].map((t) => (
                                <button key={t} onClick={() => setBottomTab(t)} style={{
                                    padding: '7px 16px', border: 'none', background: 'transparent',
                                    color: bottomTab === t ? 'var(--text)' : 'var(--muted)',
                                    borderBottom: bottomTab === t ? '2px solid var(--accent-muted)' : '2px solid transparent',
                                    fontSize: 12, fontWeight: bottomTab === t ? 600 : 400,
                                }}>
                                    {t === 'output' ? 'Output' : 'AI Review'}
                                </button>
                            ))}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                            {bottomTab === 'output' && (
                                <OutputTab
                                    verdictLoading={verdictLoading}
                                    verdict={verdict}
                                    showLoginModal={!isAuthenticated && verdict === null}
                                    onLoginClick={() => setShowLoginModal(true)}
                                    onAIReview={handleAIReview}
                                    hasSubmission={!!verdictSubId.current}
                                />
                            )}
                            {bottomTab === 'ai' && (
                                <AITab review={aiReview} loading={aiLoading} error={aiError} hasSubmission={!!verdictSubId.current} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showLoginModal && (
                <LoginModal onClose={() => setShowLoginModal(false)} onSwitch={() => setShowLoginModal(false)} />
            )}
        </div>
    );
}

function DescriptionTab({ problem }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{problem.title}</span>
                <DifficultyBadge difficulty={problem.difficulty} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {problem.tags.map((t) => <TagChip key={t.id} name={t.name} />)}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>{problem.description}</p>
            {problem.inputFormat && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>INPUT FORMAT</div>
                    <p style={{ fontSize: 13, lineHeight: 1.7 }}>{problem.inputFormat}</p>
                </div>
            )}
            {problem.outputFormat && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>OUTPUT FORMAT</div>
                    <p style={{ fontSize: 13, lineHeight: 1.7 }}>{problem.outputFormat}</p>
                </div>
            )}
            {problem.testCases?.map((tc, i) => (
                <div key={tc.id}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>EXAMPLE {i + 1}</div>
                    <div style={{ background: 'var(--editor-bg)', borderRadius: 6, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6 }}>
                        <div style={{ color: 'var(--muted)' }}>Input:</div>
                        <pre style={{ margin: '2px 0 8px' }}>{tc.input}</pre>
                        <div style={{ color: 'var(--muted)' }}>Output:</div>
                        <pre style={{ margin: '2px 0' }}>{tc.expectedOutput}</pre>
                        {tc.explanation && <><div style={{ color: 'var(--muted)', marginTop: 8 }}>Explanation:</div><p style={{ margin: '2px 0', fontFamily: 'inherit' }}>{tc.explanation}</p></>}
                    </div>
                </div>
            ))}
            {problem.constraints && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>CONSTRAINTS</div>
                    <pre style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.8, color: 'var(--text)' }}>{problem.constraints}</pre>
                </div>
            )}
        </div>
    );
}

function SubmissionsTab({ submissions, isAuthenticated }) {
    if (!isAuthenticated) return (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Login to view your submissions.</p>
    );
    if (!submissions.length) return (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>No submissions yet.</p>
    );
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Status', 'Language', 'Submitted'].map((h) => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {submissions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 8px', color: VERDICT_COLORS[s.verdict] }}>{VERDICT_LABELS[s.verdict] ?? s.verdict}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--muted)' }}>{s.language}</td>
                        <td style={{ padding: '7px 8px', color: 'var(--muted)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function OutputTab({ verdictLoading, verdict, onLoginClick, onAIReview, hasSubmission }) {
    if (verdictLoading) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Judging…</p>;
    if (!verdict) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Submit your code to see the result.</p>;

    const color = VERDICT_COLORS[verdict];
    const label = VERDICT_LABELS[verdict] ?? verdict;

    return (
        <div>
            <span style={{ fontSize: 16, fontWeight: 700, color }}>{label}</span>
            {verdict === 'AC' && (
                <button onClick={onAIReview} style={{
                    marginLeft: 16, fontSize: 12, padding: '3px 10px', borderRadius: 6,
                    border: '1px solid rgba(96,165,250,0.35)', background: 'transparent', color: 'var(--accent-muted)',
                }}>
                    See AI Review →
                </button>
            )}
        </div>
    );
}

function AITab({ review, loading, error, hasSubmission }) {
    if (!hasSubmission) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Submit your code first to get an AI review.</p>;
    if (loading) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Generating review…</p>;
    if (error) return <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>;
    if (!review) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Click "See AI Review →" in the Output tab.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {review.timeComplexity && <Pill label="Time" value={review.timeComplexity} />}
                {review.spaceComplexity && <Pill label="Space" value={review.spaceComplexity} />}
                {review.readabilityScore && <Pill label="Readability" value={`${review.readabilityScore}/10`} />}
            </div>
            {review.summary && <p style={{ lineHeight: 1.6, color: 'var(--text)' }}>{review.summary}</p>}
            {review.improvements?.length > 0 && (
                <ul style={{ paddingLeft: 16, color: 'var(--muted)', lineHeight: 1.7 }}>
                    {review.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            )}
        </div>
    );
}

function Pill({ label, value }) {
    return (
        <span style={{
            padding: '2px 8px', borderRadius: 12, fontSize: 11,
            background: 'var(--accent-muted-bg)', color: 'var(--accent-muted)',
            border: '1px solid rgba(96,165,250,0.2)',
        }}>
            {label}: {value}
        </span>
    );
}

const toolbarCtrlStyle = {
    height: 32, fontSize: 12.5, fontWeight: 600, borderRadius: 6,
    padding: '0 12px', cursor: 'pointer',
    background: 'var(--surface2)', color: 'var(--text)',
    border: '1px solid var(--border)',
};

const LANG_TO_MONACO = { PYTHON: 'python', CPP: 'cpp', JAVA: 'java', C: 'c' };
