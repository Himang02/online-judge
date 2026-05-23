import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { createProblem, publishProblem, addTestCase, getTags } from '../api/problems';

const STEPS = ['Problem Info', 'Examples', 'Test Cases', 'Preview'];

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

const DIFF_STYLES = {
    EASY:   { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(74,222,128,0.5)',  color: '#4ade80' },
    MEDIUM: { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.5)',  color: '#fb923c' },
    HARD:   { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(248,113,113,0.5)', color: '#f87171' },
};

function emptyExample() { return { input: '', output: '', explanation: '' }; }
function emptyTestCase() { return { input: '', output: '' }; }

export default function SetProblem() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [savedId, setSavedId] = useState(null);

    const [info, setInfo] = useState({
        title: '', description: '', inputFormat: '', outputFormat: '',
        constraints: '', difficulty: 'EASY', tagIds: [],
        timeLimit: 2000, memoryLimit: 256,
    });
    const [examples, setExamples] = useState([emptyExample()]);
    const [testCases, setTestCases] = useState([emptyTestCase()]);

    const setInfoField = (key) => (e) => setInfo((p) => ({ ...p, [key]: e.target.value }));

    const handleSaveDraft = async () => {
        setSaving(true);
        setError('');
        try {
            const problem = await createProblem({ ...info });
            setSavedId(problem.id);
        } catch (err) {
            setError(err.response?.data?.error ?? 'Failed to save draft');
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        setSaving(true);
        setError('');
        try {
            let id = savedId;
            if (!id) {
                const problem = await createProblem({ ...info });
                id = problem.id;
                setSavedId(id);
            }
            for (const ex of examples) {
                if (!ex.input || !ex.output) continue;
                await addTestCase(id, { input: ex.input, expectedOutput: ex.output, explanation: ex.explanation, isSample: true });
            }
            for (const tc of testCases) {
                if (!tc.input || !tc.output) continue;
                await addTestCase(id, { input: tc.input, expectedOutput: tc.output, isSample: false });
            }
            await publishProblem(id);
            navigate(`/problems/${id}`);
        } catch (err) {
            setError(err.response?.data?.error ?? 'Failed to publish');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Navbar variant="main" />
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Step sidebar */}
                <aside style={{ width: 170, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '20px 14px', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 14 }}>STEPS</div>
                    {STEPS.map((s, i) => {
                        const done = i < step;
                        const active = i === step;
                        return (
                            <div key={s} onClick={() => setStep(i)} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                                borderRadius: 7, marginBottom: 4, cursor: 'pointer',
                                background: active ? 'var(--accent-muted-bg)' : 'transparent',
                                color: active ? 'var(--accent-muted)' : done ? '#4ade80' : 'var(--muted)',
                            }}>
                                <span style={{
                                    width: 20, height: 20, borderRadius: '50%', display: 'inline-flex',
                                    alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                                    flexShrink: 0,
                                    background: active ? 'var(--accent)' : done ? 'rgba(74,222,128,0.15)' : 'var(--surface2)',
                                    color: active ? '#fff' : done ? '#4ade80' : 'var(--muted)',
                                    border: done ? '1px solid rgba(74,222,128,0.3)' : 'none',
                                }}>
                                    {done ? '✓' : i + 1}
                                </span>
                                <span style={{ fontSize: 13 }}>{s}</span>
                            </div>
                        );
                    })}
                </aside>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', paddingBottom: 80 }}>
                    {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 14 }}>{error}</div>}

                    {step === 0 && <StepInfo info={info} setInfoField={setInfoField} setInfo={setInfo} />}
                    {step === 1 && <StepExamples examples={examples} setExamples={setExamples} />}
                    {step === 2 && <StepTestCases testCases={testCases} setTestCases={setTestCases} />}
                    {step === 3 && <StepPreview info={info} examples={examples} />}
                </div>
            </div>

            {/* Bottom action bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '14px 24px', background: 'var(--surface)', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
            }}>
                <button onClick={handleSaveDraft} disabled={saving} style={ghostBtnStyle}>
                    Save Draft
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                    {STEPS.map((_, i) => (
                        <span key={i} style={{
                            display: 'inline-block',
                            width: i === step ? 20 : 8, height: 8, borderRadius: 4,
                            background: i < step ? '#4ade80' : i === step ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                            transition: 'all 0.2s',
                        }} />
                    ))}
                </div>

                {step < 3 ? (
                    <button onClick={() => setStep((s) => s + 1)} style={accentBtnStyle}>Next →</button>
                ) : (
                    <button onClick={handlePublish} disabled={saving} style={{ ...accentBtnStyle, background: '#4ade80', color: '#0a1628' }}>
                        {saving ? 'Publishing…' : '✓ Publish Problem'}
                    </button>
                )}
            </div>
        </div>
    );
}

function TagsInput({ onChange }) {
    const [allTags, setAllTags] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [fetchError, setFetchError] = useState('');

    useEffect(() => {
        getTags()
            .then(setAllTags)
            .catch((err) => setFetchError(err.response?.data?.error ?? err.message ?? 'Failed to load tags'));
    }, []);

    const toggle = (tag) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(tag.id) ? next.delete(tag.id) : next.add(tag.id);
            onChange([...next]);
            return next;
        });
    };

    if (fetchError) {
        return <span style={{ fontSize: 12, color: '#f87171' }}>Error loading tags: {fetchError}</span>;
    }

    if (allTags.length === 0) {
        return <span style={{ fontSize: 12, color: 'var(--muted)' }}>No tags available yet.</span>;
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allTags.map((t) => {
                const selected = selectedIds.has(t.id);
                return (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => toggle(t)}
                        style={{
                            padding: '4px 12px', borderRadius: 5, fontSize: 12, fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: selected ? 'rgba(99,102,241,0.2)' : 'var(--surface2)',
                            color: selected ? '#818cf8' : 'var(--muted)',
                            border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                        }}
                    >
                        {t.name}
                    </button>
                );
            })}
        </div>
    );
}

function StepInfo({ info, setInfoField, setInfo }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
            <Field label="Title">
                <input style={inputStyle} value={info.title} onChange={setInfoField('title')} placeholder="Problem title" />
            </Field>
            <Field label="Difficulty">
                <div style={{ display: 'flex', gap: 8 }}>
                    {DIFFICULTIES.map((d) => {
                        const s = DIFF_STYLES[d];
                        const active = info.difficulty === d;
                        return (
                            <button key={d} onClick={() => setInfo((p) => ({ ...p, difficulty: d }))} style={{
                                padding: '6px 18px', borderRadius: 7, border: `1px solid ${active ? s.border : 'var(--border)'}`,
                                background: active ? s.bg : 'transparent', color: active ? s.color : 'var(--muted)', fontWeight: 600, fontSize: 13,
                            }}>{d}</button>
                        );
                    })}
                </div>
            </Field>
            <Field label="Tags">
                <TagsInput onChange={(ids) => setInfo((p) => ({ ...p, tagIds: ids }))} />
            </Field>
            <Field label="Problem Statement">
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={info.description} onChange={setInfoField('description')} placeholder="Describe the problem…" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Input Format">
                    <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={info.inputFormat} onChange={setInfoField('inputFormat')} placeholder="Describe the input…" />
                </Field>
                <Field label="Output Format">
                    <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={info.outputFormat} onChange={setInfoField('outputFormat')} placeholder="Describe the output…" />
                </Field>
            </div>
            <Field label="Constraints">
                <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'monospace' }} value={info.constraints} onChange={setInfoField('constraints')} placeholder="1 ≤ n ≤ 10^5" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Time Limit (ms)">
                    <input style={inputStyle} type="number" value={info.timeLimit} onChange={setInfoField('timeLimit')} />
                </Field>
                <Field label="Memory Limit (MB)">
                    <input style={inputStyle} type="number" value={info.memoryLimit} onChange={setInfoField('memoryLimit')} />
                </Field>
            </div>
        </div>
    );
}

function StepExamples({ examples, setExamples }) {
    const add = () => setExamples((e) => [...e, emptyExample()]);
    const remove = (i) => setExamples((e) => e.filter((_, j) => j !== i));
    const update = (i, key, val) => setExamples((e) => e.map((ex, j) => j === i ? { ...ex, [key]: val } : ex));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
            {examples.map((ex, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Example {i + 1}</span>
                        {examples.length > 1 && (
                            <button onClick={() => remove(i)} style={{ ...ghostBtnStyle, fontSize: 12, padding: '2px 8px' }}>Remove</button>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                        <Field label="Input">
                            <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 60, resize: 'vertical' }} value={ex.input} onChange={(e) => update(i, 'input', e.target.value)} />
                        </Field>
                        <Field label="Output">
                            <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 60, resize: 'vertical' }} value={ex.output} onChange={(e) => update(i, 'output', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Explanation (optional)">
                        <input style={inputStyle} value={ex.explanation} onChange={(e) => update(i, 'explanation', e.target.value)} placeholder="Explain the example…" />
                    </Field>
                </div>
            ))}
            <button onClick={add} style={dashedAddBtn}>+ Add Example</button>
        </div>
    );
}

function StepTestCases({ testCases, setTestCases }) {
    const add = () => setTestCases((t) => [...t, emptyTestCase()]);
    const remove = (i) => setTestCases((t) => t.filter((_, j) => j !== i));
    const update = (i, key, val) => setTestCases((t) => t.map((tc, j) => j === i ? { ...tc, [key]: val } : tc));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
            {testCases.map((tc, i) => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Test Case {i + 1}</span>
                        {testCases.length > 1 && (
                            <button onClick={() => remove(i)} style={{ ...ghostBtnStyle, fontSize: 12, padding: '2px 8px' }}>✕</button>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Input">
                            <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 60, resize: 'vertical' }} value={tc.input} onChange={(e) => update(i, 'input', e.target.value)} />
                        </Field>
                        <Field label="Expected Output">
                            <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 60, resize: 'vertical' }} value={tc.output} onChange={(e) => update(i, 'output', e.target.value)} />
                        </Field>
                    </div>
                </div>
            ))}
            <button onClick={add} style={dashedAddBtn}>+ Add Test Case</button>
        </div>
    );
}

function StepPreview({ info, examples }) {
    return (
        <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{info.title || 'Untitled Problem'}</h2>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', marginBottom: 16 }}>{info.description}</p>
            {examples.filter((e) => e.input).map((ex, i) => (
                <div key={i} style={{ background: 'var(--editor-bg)', borderRadius: 6, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', marginBottom: 12 }}>
                    <div style={{ color: 'var(--muted)' }}>Input:</div>
                    <pre style={{ margin: '2px 0 8px' }}>{ex.input}</pre>
                    <div style={{ color: 'var(--muted)' }}>Output:</div>
                    <pre style={{ margin: '2px 0' }}>{ex.output}</pre>
                </div>
            ))}
            {info.constraints && (
                <pre style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.8, color: 'var(--muted)' }}>{info.constraints}</pre>
            )}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{label}</label>
            {children}
        </div>
    );
}

const inputStyle = {
    padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%',
};
const ghostBtnStyle = {
    padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 500,
};
const accentBtnStyle = {
    padding: '7px 20px', borderRadius: 7, border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
};
const dashedAddBtn = {
    padding: '10px', borderRadius: 8, border: '1px dashed var(--border)',
    background: 'transparent', color: 'var(--muted)', fontSize: 13, width: '100%',
};
