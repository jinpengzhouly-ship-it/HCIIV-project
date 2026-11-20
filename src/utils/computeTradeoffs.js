export const ICON = {
  car: 'M3 15.5V12l1.8-4.6A2 2 0 0 1 6.7 6h10.6a2 2 0 0 1 1.9 1.4L21 12v3.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z M3 12h18 M6 16.5V19 M18 16.5V19 M7 14h1.5 M15.5 14H17',
  train: 'M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z M4 10h16 M12 3v7 M8 13.5h.01 M16 13.5h.01 M8 17l-2 4 M16 17l2 4',
  bus: 'M6 3h12a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2Z M4 7h16 M4 12h16 M7 18v2.5 M17 18v2.5 M7.5 15h1 M15.5 15h1',
  bicycle: 'M2 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z M15 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z M5.5 17.5 9 10h7.5l2 7.5 M9 10l3 7.5H5.5 M12 17.5 16.5 10 M8 7h3 M15.5 6.5h2l-1 3.5',
};

export const OK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
export const NO_PATH = 'M6 6l12 12M18 6 6 18';

export const TIMEFRAMES = [
  { id: 'trip', label: '1 Trip', unit: 'per trip', mult: 1 },
  { id: 'week', label: '1 Week', unit: 'per week (10 trips)', mult: 10 },
  { id: 'semester', label: '1 Semester', unit: 'per semester (150 trips)', mult: 150 },
  { id: 'year', label: '1 Year', unit: 'per year (300 trips)', mult: 300 },
];

export const getTimeframe = (id) =>
  TIMEFRAMES.find((t) => t.id === id) || TIMEFRAMES[0];

export const clampB = (v) =>
  Number.isFinite(v) ? Math.min(10, Math.max(0, Math.round(v * 2) / 2)) : 6;

export const clampT = (v) =>
  Number.isFinite(v) ? Math.min(90, Math.max(15, Math.round(v / 5) * 5)) : 60;

export const eur = (v, mult = 1) => {
  const scaled = v * mult;
  return scaled >= 100 ? `€${Math.round(scaled).toLocaleString()}` : `€${scaled.toFixed(2)}`;
};

export const kg = (v, mult = 1) => {
  const scaled = v * mult;
  return scaled >= 100 ? `${Math.round(scaled).toLocaleString()} kg` : `${scaled.toFixed(2)} kg`;
};

export const fmtTime = (mins, mult = 1) => {
  const scaled = mins * mult;
  if (mult === 1) return `${Math.round(scaled)} min`;
  const hrs = scaled / 60;
  return hrs >= 100 ? `${Math.round(hrs)} hrs` : `${hrs.toFixed(1)} hrs`;
};

export const ceil5 = (v) => Math.ceil(v / 5) * 5;

export const joinList = (a) =>
  a.length <= 1 ? a[0] || '' : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;

export const minBy = (list, key) =>
  list.reduce((a, b) => (a === null || b[key] < a[key] ? b : a), null);

export function computeTradeoffs(rawModes, budget, time) {
  const modes = rawModes.map((m) => {
    const inBudget = m.costEUR <= budget + 1e-9;
    const inTime = m.minutes <= time;
    const eligible = inBudget && inTime;
    const reason = eligible
      ? 'Within your limits'
      : !inBudget && !inTime
      ? 'Over budget and time'
      : !inBudget
      ? 'Over budget'
      : 'Over time';

    const isPareto = !rawModes.some(
      (other) =>
        other.id !== m.id &&
        other.costEUR <= m.costEUR + 1e-9 &&
        other.minutes <= m.minutes &&
        (other.costEUR < m.costEUR - 1e-9 || other.minutes < m.minutes)
    );

    return { ...m, inBudget, inTime, eligible, reason, isPareto };
  });

  const elig = modes.filter((m) => m.eligible);
  return {
    modes,
    elig,
    n: elig.length,
    lowCo2: minBy(elig, 'kgCO2e'),
    lowCost: minBy(elig, 'costEUR'),
    fastest: minBy(elig, 'minutes'),
  };
}