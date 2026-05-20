const STYLES = {
    EASY:   { background: 'rgba(34,197,94,0.12)',  color: '#4ade80' },
    MEDIUM: { background: 'rgba(251,146,60,0.12)', color: '#fb923c' },
    HARD:   { background: 'rgba(239,68,68,0.12)',  color: '#f87171' },
};

export default function DifficultyBadge({ difficulty }) {
    const s = STYLES[difficulty] ?? STYLES.EASY;
    return (
        <span style={{
            ...s,
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 12,
            letterSpacing: '0.02em',
        }}>
            {difficulty}
        </span>
    );
}
