export default function TagChip({ name }) {
    return (
        <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 12,
            background: 'rgba(96,165,250,0.1)',
            color: 'var(--accent-muted)',
            border: '1px solid rgba(96,165,250,0.2)',
        }}>
            {name}
        </span>
    );
}
