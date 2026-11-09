export type DayKey = "mon" | "wed" | "fri";

export interface ExerciseDef {
  id: string;
  name: string;
  sets: number;
  min: number;
  max: number;
  /** kg increment when progressing */
  step: number;
}

const ex = (name: string, sets: number, min: number, max: number, step = 2.5): ExerciseDef => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  sets,
  min,
  max,
  step,
});

export const PROGRAM: Record<DayKey, { label: string; title: string; exercises: ExerciseDef[] }> = {
  mon: {
    label: "Mon",
    title: "Monday",
    exercises: [
      ex("Chest Press", 3, 8, 12),
      ex("Incline Chest Press", 3, 8, 12),
      ex("Low Row", 3, 8, 12),
      ex("Leg Press", 3, 10, 12, 5),
      ex("Lateral Raises", 3, 12, 15, 1),
      ex("Dumbbell Shrugs", 2, 10, 15, 2),
    ],
  },
  wed: {
    label: "Wed",
    title: "Wednesday",
    exercises: [
      ex("Hack Squat", 3, 8, 12, 5),
      ex("Lat Pulldown", 3, 8, 12),
      ex("T-Bar Row", 3, 8, 12),
      ex("Leg Curl", 3, 10, 15),
      ex("Reverse Pec Deck", 3, 12, 15),
      ex("Hammer Curls", 2, 10, 12, 1),
    ],
  },
  fri: {
    label: "Fri",
    title: "Friday",
    exercises: [
      ex("Incline Chest Press", 3, 8, 12),
      ex("Pec Deck", 3, 10, 15),
      ex("Shoulder Press", 2, 8, 12),
      ex("Lat Pulldown", 3, 8, 12),
      ex("Lateral Raises", 3, 12, 15, 1),
      ex("Dumbbell Shrugs", 2, 10, 15, 2),
    ],
  },
};

export const CORE: ExerciseDef[] = [
  { id: "dead-bugs", name: "Dead Bugs (per side)", sets: 2, min: 8, max: 12, step: 0 },
  { id: "reverse-crunch", name: "Reverse Crunch", sets: 2, min: 10, max: 15, step: 0 },
];

export interface SetEntry {
  w: string;
  r: string;
  done: boolean;
}
export interface ExerciseLog {
  id: string;
  name: string;
  min: number;
  max: number;
  sets: SetEntry[];
}
export interface Session {
  id: string;
  day: DayKey;
  date: string; // ISO
  durationSec: number;
  exercises: ExerciseLog[];
}
export interface ActiveWorkout {
  day: DayKey;
  startedAt: number;
  core: boolean;
  exercises: ExerciseLog[];
  coreLogs: ExerciseLog[];
}
export interface BodyEntry {
  date: string; // yyyy-mm-dd
  weight?: number;
  waist?: number;
}
export interface AppData {
  version: 1;
  profile: { weightKg: number; heightCm: number };
  sessions: Session[];
  body: BodyEntry[];
  active: ActiveWorkout | null;
  restDefault: number;
}

export const STORAGE_KEY = "gym60:v1";

export const defaultData = (): AppData => ({
  version: 1,
  profile: { weightKg: 80, heightCm: 183 },
  sessions: [],
  body: [],
  active: null,
  restDefault: 90,
});

export function isAppData(x: unknown): x is AppData {
  const d = x as AppData;
  return !!d && typeof d === "object" && Array.isArray(d.sessions) && Array.isArray(d.body) && !!d.profile;
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    return isAppData(parsed) ? { ...defaultData(), ...parsed } : defaultData();
  } catch {
    return defaultData();
  }
}

export function saveData(d: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* storage full or blocked */
  }
}

export function lastLog(sessions: Session[], exId: string): ExerciseLog | undefined {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  for (const s of sorted) {
    const l = s.exercises.find((e) => e.id === exId && e.sets.some((x) => x.done));
    if (l) return l;
  }
  return undefined;
}

export interface Suggestion {
  weight: number | null;
  text: string;
  kind: "up" | "hold" | "reps" | "new";
}

/**
 * Double progression: reach the top of the rep range on every set, then add weight.
 * Any set below the minimum → hold the weight. Otherwise → add reps at same weight.
 */
export function suggest(def: Pick<ExerciseDef, "min" | "max" | "step">, last?: ExerciseLog): Suggestion {
  const done = last?.sets.filter((s) => s.done && Number(s.w) >= 0 && Number(s.r) > 0) ?? [];
  if (!done.length) return { weight: null, kind: "new", text: "First time: pick a weight you can lift with good form for the rep range." };
  const w = Math.max(...done.map((s) => Number(s.w)));
  const top = done.filter((s) => Number(s.w) === w);
  const reps = top.map((s) => Number(s.r));
  if (def.step > 0 && reps.every((r) => r >= def.max) && top.length >= done.length) {
    const nw = Math.round((w + def.step) * 10) / 10;
    return { weight: nw, kind: "up", text: `Hit ${def.max} reps on all sets — try ${nw} kg.` };
  }
  if (reps.some((r) => r < def.min)) {
    return { weight: w, kind: "hold", text: `Below ${def.min} reps last time — stay at ${w} kg and build reps.` };
  }
  return { weight: w, kind: "reps", text: `Stay at ${w} kg and aim for +1 rep per set (up to ${def.max}).` };
}

export function newWorkout(day: DayKey, sessions: Session[], core: boolean): ActiveWorkout {
  const mk = (d: ExerciseDef): ExerciseLog => {
    const s = suggest(d, lastLog(sessions, d.id));
    const w = s.weight != null ? String(s.weight) : "";
    return {
      id: d.id,
      name: d.name,
      min: d.min,
      max: d.max,
      sets: Array.from({ length: d.sets }, () => ({ w, r: "", done: false })),
    };
  };
  return {
    day,
    startedAt: Date.now(),
    core,
    exercises: PROGRAM[day].exercises.map(mk),
    coreLogs: CORE.map(mk),
  };
}

export function todayKey(date = new Date()): DayKey {
  const d = date.getDay();
  if (d === 1 || d === 2) return "mon";
  if (d === 3 || d === 4) return "wed";
  return "fri";
}

export const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};