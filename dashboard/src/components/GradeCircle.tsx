interface GradeCircleProps {
  threats: number;
  categories: number;
}

export function computeGrade(threats: number, categories: number): { letter: string; color: string } {
  const score = Math.min(threats, 50) + categories * 3;
  if (score >= 30) return { letter: 'F', color: '#e74c3c' };
  if (score >= 20) return { letter: 'D', color: '#e67e22' };
  if (score >= 12) return { letter: 'C', color: '#f39c12' };
  if (score >= 5) return { letter: 'B', color: '#3498db' };
  return { letter: 'A', color: '#27ae60' };
}

export function GradeCircle({ threats, categories }: GradeCircleProps) {
  const grade = computeGrade(threats, categories);

  return (
    <span
      className="grade-circle"
      style={{ background: grade.color }}
      role="img"
      aria-label={`Privacy grade: ${grade.letter}`}
    >
      {grade.letter}
    </span>
  );
}
