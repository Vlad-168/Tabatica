import { useRef } from "react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}

// Stepper with press-and-hold acceleration for quick large adjustments.
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, format }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const bump = (dir: number) => {
    onChange(clamp(valueRef.current + dir * step));
  };

  const hold = (dir: number) => {
    bump(dir);
    let delay = 380;
    const run = () => {
      bump(dir);
      delay = Math.max(60, delay * 0.78);
      timer.current = setTimeout(run, delay);
    };
    timer.current = setTimeout(run, delay);
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div className="stepper">
      <button
        className="step-btn"
        aria-label="decrease"
        disabled={value <= min}
        onPointerDown={() => hold(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        −
      </button>
      <span className="step-val">{format ? format(value) : value}</span>
      <button
        className="step-btn"
        aria-label="increase"
        disabled={value >= max}
        onPointerDown={() => hold(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        +
      </button>
    </div>
  );
}
