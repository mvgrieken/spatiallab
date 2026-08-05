"use client";

/** SVG plot of the energy decay curve — no charting dependency needed. */
export function DecayChart({
  points,
  rt60,
}: {
  points: Array<{ t: number; db: number }>;
  rt60: number;
}) {
  const width = 320;
  const height = 150;
  const padX = 30;
  const padY = 12;
  const maxT = points[points.length - 1]?.t || 1;
  const x = (t: number) => padX + (t / maxT) * (width - padX - 8);
  const y = (db: number) => padY + (-db / 60) * (height - padY - 22);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.db).toFixed(1)}`)
    .join(" ");

  return (
    <figure className="border border-line bg-surface p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Energy decay curve: the sound drops 60 decibels in about ${rt60.toFixed(2)} seconds`}
      >
        {[0, -20, -40, -60].map((db) => (
          <g key={db}>
            <line
              x1={padX}
              x2={width - 8}
              y1={y(db)}
              y2={y(db)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={padX - 5}
              y={y(db) + 3}
              textAnchor="end"
              fontSize="8"
              fontFamily="var(--font-geist-mono), monospace"
              fill="var(--faint)"
            >
              {db}
            </text>
          </g>
        ))}
        {/* RT60 marker, only when it falls inside the plotted window */}
        {rt60 <= maxT && (
          <g>
            <line
              x1={x(rt60)}
              x2={x(rt60)}
              y1={padY}
              y2={height - 22}
              stroke="var(--marker)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={x(rt60) + 4}
              y={padY + 9}
              fontSize="9"
              fontFamily="var(--font-geist-mono), monospace"
              fill="var(--marker)"
            >
              RT60
            </text>
          </g>
        )}
        <path d={path} fill="none" stroke="var(--foreground)" strokeWidth="2" />
        <text
          x={padX}
          y={height - 6}
          fontSize="8"
          fontFamily="var(--font-geist-mono), monospace"
          fill="var(--faint)"
        >
          0s
        </text>
        <text
          x={width - 8}
          y={height - 6}
          textAnchor="end"
          fontSize="8"
          fontFamily="var(--font-geist-mono), monospace"
          fill="var(--faint)"
        >
          {maxT.toFixed(1)}s
        </text>
      </svg>
      <figcaption className="mt-1 text-[11px] text-faint">
        Energy decay after your clap (dB over time).
      </figcaption>
    </figure>
  );
}
