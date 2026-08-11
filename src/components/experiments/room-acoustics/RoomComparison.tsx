"use client";

import { describeRoom } from "@/lib/acoustics/rt60";

export type SavedRoom = {
  id: number;
  label: string;
  rt60: number;
};

/**
 * Two or more rooms next to each other.
 *
 * A reverberation time on its own is an abstract number — 0.4 seconds means
 * nothing to most people. The same number beside a hallway at 1.2 does. The
 * bars are scaled against a fixed 2-second ceiling rather than the largest
 * measurement, so adding a very live room does not silently shrink the others.
 */
const SCALE_CEILING_S = 2;

export function RoomComparison({
  rooms,
  onClear,
}: {
  rooms: SavedRoom[];
  onClear: () => void;
}) {
  if (rooms.length === 0) return null;

  return (
    <section className="border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="lab-label">
          {rooms.length === 1 ? "Measured so far" : "Rooms compared"}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="lab-label transition-colors hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <ul className="mt-4 space-y-4">
        {rooms.map((room) => {
          const character = describeRoom(room.rt60);
          const width = Math.min(100, (room.rt60 / SCALE_CEILING_S) * 100);
          return (
            <li key={room.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{room.label}</p>
                <p className="font-mono text-sm">
                  {room.rt60.toFixed(2)}s
                  <span className="ml-2 text-faint">{character.label}</span>
                </p>
              </div>
              <div
                className="mt-1.5 h-2 w-full bg-background"
                role="img"
                aria-label={`${room.label}: ${room.rt60.toFixed(2)} seconds, ${character.label}`}
              >
                <div
                  className="h-full bg-marker"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-faint">
        {rooms.length === 1
          ? "Measure a second room — a bathroom or an empty hallway makes the difference obvious."
          : "Bars are scaled to a two-second ceiling, so rooms stay comparable as you add more. Same phone, same clap style, or the comparison is not fair."}
      </p>
    </section>
  );
}
