import { useEffect, useRef, useState } from "react";
import { Shell } from "./components/Shell";

interface Lap {
  index: number;
  splitMs: number;   // time since previous lap
  totalMs: number;   // elapsed at lap moment
}

const LAPS_KEY = "stopwatch:laps";

function format(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function loadLaps(): Lap[] {
  try {
    const raw = localStorage.getItem(LAPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Lap[];
  } catch {
    return [];
  }
}

export default function App() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<Lap[]>(() => loadLaps());

  // Anchor the timer to a wall-clock baseline so background tabs and
  // long pauses don't drift the display. Re-render every 33ms (~30fps)
  // for a smooth centisecond ticker; source of truth is Date.now().
  const startedAt = useRef<number | null>(null);
  const accumulated = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const base = startedAt.current ?? Date.now();
      setElapsed(accumulated.current + (Date.now() - base));
    };
    tick();
    const id = window.setInterval(tick, 33);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    localStorage.setItem(LAPS_KEY, JSON.stringify(laps));
  }, [laps]);

  // Keyboard shortcuts: Space = start/stop, L = lap, R = reset.
  // Skip if a form input is focused so we don't hijack typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === " ") {
        e.preventDefault();
        startStop();
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        lap();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, elapsed, laps]);

  function startStop() {
    if (running) {
      accumulated.current += Date.now() - (startedAt.current ?? Date.now());
      startedAt.current = null;
      setRunning(false);
    } else {
      startedAt.current = Date.now();
      setRunning(true);
    }
  }

  function reset() {
    setRunning(false);
    accumulated.current = 0;
    startedAt.current = null;
    setElapsed(0);
    setLaps([]);
  }

  function lap() {
    if (!running) return;
    const last = laps[0]?.totalMs ?? 0;
    const next: Lap = {
      index: laps.length + 1,
      totalMs: elapsed,
      splitMs: elapsed - last,
    };
    setLaps((prev) => [next, ...prev]);
  }

  const splits = laps.map((l) => l.splitMs);
  const fastest = splits.length > 1 ? Math.min(...splits) : null;
  const slowest = splits.length > 1 ? Math.max(...splits) : null;

  return (
    <Shell>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "1.5rem 0" }}>
        <h1
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "0.25rem",
          }}
        >
          Stopwatch
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>
          Tap <strong>Lap</strong> while running to record splits. Everything stays in your browser.
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
          Shortcuts: <kbd>Space</kbd> start/stop &middot; <kbd>L</kbd> lap &middot; <kbd>R</kbd> reset
        </p>

        <div
          aria-label="elapsed time"
          style={{
            fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
            fontSize: "clamp(3rem, 14vw, 5.5rem)",
            fontVariantNumeric: "tabular-nums",
            textAlign: "center",
            padding: "2rem 0",
            letterSpacing: "-0.02em",
          }}
        >
          {format(elapsed)}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={startStop}
            style={{
              background: running ? "#dc2626" : "var(--accent, #2563eb)",
              color: "white",
              border: 0,
              padding: "0.85rem 2rem",
              borderRadius: "0.75rem",
              fontWeight: 700,
              fontSize: "1rem",
              fontFamily: "inherit",
              cursor: "pointer",
              minWidth: "140px",
            }}
          >
            {running ? "Stop" : elapsed === 0 ? "Start" : "Resume"}
          </button>
          <button
            type="button"
            onClick={lap}
            disabled={!running}
            style={{
              background: "transparent",
              color: "var(--ink, #1a1a1a)",
              border: "1px solid var(--line, #e5e5e5)",
              padding: "0.85rem 2rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              fontSize: "1rem",
              fontFamily: "inherit",
              cursor: running ? "pointer" : "not-allowed",
              minWidth: "100px",
              opacity: running ? 1 : 0.4,
            }}
          >
            Lap
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={elapsed === 0 && laps.length === 0}
            style={{
              background: "transparent",
              color: "var(--muted, #6b6b6b)",
              border: "1px solid var(--line, #e5e5e5)",
              padding: "0.85rem 2rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              fontSize: "1rem",
              fontFamily: "inherit",
              cursor: elapsed === 0 && laps.length === 0 ? "not-allowed" : "pointer",
              minWidth: "100px",
              opacity: elapsed === 0 && laps.length === 0 ? 0.4 : 1,
            }}
          >
            Reset
          </button>
        </div>

        {laps.length > 0 && (
          <div style={{ marginTop: "2.5rem" }}>
            <h2
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "0.85rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                marginBottom: "0.5rem",
              }}
            >
              Laps
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                borderTop: "1px solid var(--line, #e5e5e5)",
              }}
            >
              {laps.map((l) => {
                const highlight =
                  fastest !== null && l.splitMs === fastest
                    ? "var(--accent, #2563eb)"
                    : slowest !== null && l.splitMs === slowest
                      ? "#dc2626"
                      : "inherit";
                return (
                  <li
                    key={l.index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "1rem",
                      alignItems: "baseline",
                      padding: "0.7rem 0",
                      borderBottom: "1px solid var(--line, #e5e5e5)",
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                      fontSize: "0.95rem",
                    }}
                  >
                    <span style={{ color: "var(--muted)", minWidth: "2.5rem" }}>
                      #{l.index}
                    </span>
                    <span style={{ color: highlight, fontWeight: highlight !== "inherit" ? 700 : 400 }}>
                      {format(l.splitMs)}
                    </span>
                    <span style={{ color: "var(--muted)" }}>{format(l.totalMs)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Shell>
  );
}
