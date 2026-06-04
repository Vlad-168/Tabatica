import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const Logo = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M9 2h6v2H9zM12 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 4h2v5l-3.5 2-1-1.7L11 13z" />
  </svg>
);
export const Prepare = (p: P) => (
  <svg {...base(p)}>
    <circle cx="13" cy="4" r="2" />
    <path d="M7 22l3-7 3 2 1 5M10 15l-1-4 4-1 3 3 3 1" />
  </svg>
);
export const Work = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M4 8l2-2 2 2-2 2zM16 16l2-2 2 2-2 2zM3 9l2 2M19 13l2 2" />
  </svg>
);
export const Rest = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 8v6M6 11h12M9 22l3-8 3 8" />
  </svg>
);
export const Cycle = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 11a9 9 0 0 1 15-6.7L21 7M21 13a9 9 0 0 1-15 6.7L3 17" />
    <path d="M21 3v4h-4M3 21v-4h4" />
  </svg>
);
export const Sets = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-9-9" />
    <path d="M12 7v5l3 2M21 3l-3 4-3-1" />
  </svg>
);
export const SetBreak = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9v6M15 9v6" />
  </svg>
);
export const Cooldown = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2v20M5 8l7-3 7 3M5 16l7 3 7-3M3 12h18" />
  </svg>
);
export const Play = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const Pause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
  </svg>
);
export const Prev = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M7 5h2v14H7zM20 5v14l-9-7z" />
  </svg>
);
export const Next = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M15 5h2v14h-2zM4 5v14l9-7z" />
  </svg>
);
export const Close = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const TimerTab = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M9 2h6M19 5l1.5 1.5" />
  </svg>
);
export const HistoryTab = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 8v4l3 2" />
  </svg>
);
export const SettingsTab = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </svg>
);
export const Save = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 3h12l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7" />
  </svg>
);
export const Trash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);
export const Apply = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
export const Download = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);
export const Check = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
export const Pip = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="4" width="19" height="15" rx="2.5" />
    <rect x="11" y="11" width="9" height="6.5" rx="1" fill="currentColor" />
  </svg>
);
export const Flame = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2c1 3-1 5-2 6-1.5 1.5-3 3-3 6a5 5 0 0 0 10 0c0-2-1-3.5-1-3.5.5 1 .5 3-1 3 0-3-2-4-2-5.5C12 6 13 4 12 2z" />
  </svg>
);
