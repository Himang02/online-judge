export default function Logo({ size = 26 }) {
    const boxR = Math.round(size * 0.18);
    const bracketFs = Math.round(size * 0.55);
    const aFs = Math.round(size * 0.70);
    const wordFs = Math.round(size * 0.60);

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3, userSelect: 'none' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <rect width={size} height={size} rx={boxR} fill="#060f1e" />
                <text
                    x="50%"
                    y="54%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontFamily="Courier New, monospace"
                    fontWeight="700"
                >
                    <tspan fill="#2563eb" fontSize={bracketFs}>&lt;</tspan>
                    <tspan fill="#60a5fa" fontSize={aFs}>A</tspan>
                    <tspan fill="#2563eb" fontSize={bracketFs}>/&gt;</tspan>
                </text>
            </svg>
            <span style={{ fontSize: wordFs, fontWeight: 800, lineHeight: 1 }}>
                <span style={{ color: '#60a5fa' }}>Algo</span>
                <span style={{ color: '#e2e8f0' }}>Arena</span>
            </span>
        </span>
    );
}
