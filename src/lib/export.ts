import type { HistoryEntry } from "../types";

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function csvCell(v: string | number | boolean): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV shaped so an Apple Shortcut can iterate rows and call
// "Log Health Sample" → Workout (High Intensity Interval Training).
export function exportCsv(history: HistoryEntry[]) {
  const header = [
    "Date",
    "Name",
    "Start",
    "End",
    "DurationMinutes",
    "ActiveMinutes",
    "WorkMinutes",
    "Cycles",
    "Sets",
    "Completed",
  ];
  const rows = history.map((h) => {
    const start = new Date(h.date - h.activeSeconds * 1000);
    const end = new Date(h.date);
    return [
      start.toISOString().slice(0, 10),
      h.name,
      start.toISOString(),
      end.toISOString(),
      (h.totalSeconds / 60).toFixed(2),
      (h.activeSeconds / 60).toFixed(2),
      (h.workSeconds / 60).toFixed(2),
      h.cycles,
      h.sets,
      h.completed,
    ]
      .map(csvCell)
      .join(",");
  });
  download(`tabatica-history-${stamp()}.csv`, "text/csv", [header.join(","), ...rows].join("\n"));
}

export function exportJson(history: HistoryEntry[]) {
  download(
    `tabatica-backup-${stamp()}.json`,
    "application/json",
    JSON.stringify({ app: "tabatica", version: 1, exportedAt: Date.now(), history }, null, 2),
  );
}
