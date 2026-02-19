interface StatusBadgeProps {
  color: string;
  text: string;
}

export function StatusBadge({ color, text }: StatusBadgeProps) {
  return (
    <div className="popup-status" style={{ color }}>
      <span className="status-dot" style={{ background: color }} />
      {text}
    </div>
  );
}
