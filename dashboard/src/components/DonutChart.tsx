const COLORS = ['#e94560', '#f39c12', '#9b59b6', '#3498db', '#e67e22', '#27ae60', '#e74c3c'];

interface DonutChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
}

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <p className="empty">No data available yet.</p>;
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const innerR = r * 0.6;

  let cumulative = 0;
  const arcs = data.map((d, i) => {
    const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += d.value;
    const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    const largeArc = d.value / total > 0.5 ? 1 : 0;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);

    const path = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    return (
      <path key={d.label} d={path} fill={d.color || COLORS[i % COLORS.length]} />
    );
  });

  const description = data.map((d) => `${d.label}: ${d.value.toLocaleString()}`).join(', ');

  return (
    <div className="donut-chart">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Donut chart showing ${total.toLocaleString()} total reports. ${description}`}
      >
        <title>Threat distribution: {total.toLocaleString()} reports</title>
        {arcs}
        <text x={cx} y={cy - 6} textAnchor="middle" className="donut-total" aria-hidden="true">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="donut-label" aria-hidden="true">
          reports
        </text>
      </svg>
      <div className="donut-legend" role="list" aria-label="Chart legend">
        {data.map((d, i) => (
          <div key={d.label} className="legend-item" role="listitem">
            <span className="legend-dot" style={{ background: d.color || COLORS[i % COLORS.length] }} aria-hidden="true" />
            <span className="legend-text">{d.label}</span>
            <span className="legend-value">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
