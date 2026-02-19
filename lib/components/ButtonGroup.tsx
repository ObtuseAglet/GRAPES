interface ButtonGroupOption<T extends string> {
  value: T;
  label: string;
}

interface ButtonGroupProps<T extends string> {
  options: ButtonGroupOption<T>[];
  active: T | null;
  className?: string;
  onSelect: (value: T) => void;
}

export function ButtonGroup<T extends string>({
  options,
  active,
  className = '',
  onSelect,
}: ButtonGroupProps<T>) {
  return (
    <div className="btn-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${className} ${active === opt.value ? 'active' : ''}`}
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
