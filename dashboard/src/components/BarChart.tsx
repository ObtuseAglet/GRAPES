interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  maxWidth?: number;
}

export function BarChart({ data, maxWidth = 200 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div key={d.label} className="bar-row">
          <span className="bar-label">{d.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(d.value / max) * maxWidth}px`,
                background: d.color || '#667eea',
              }}
            />
          </div>
          <span className="bar-value">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
