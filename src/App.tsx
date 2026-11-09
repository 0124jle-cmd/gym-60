import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Dumbbell, LineChart, Database, Timer, Flame, Plus, Trash2, Download, Upload, ChevronDown, X } from "lucide-react";
import {
  PROGRAM, CORE, type AppData, type DayKey, type ExerciseLog, type ActiveWorkout, type BodyEntry,
  defaultData, loadData, saveData, newWorkout, todayKey, fmt, suggest, lastLog, isAppData,
} from "./lib/gym";
import { cn } from "./lib/utils";

type Tab = "train" | "progress" | "data";

export default function App() {
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("train");

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);

  const update = (fn: (d: AppData) => AppData) => setData((d) => fn(d));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="pt-safe sticky top-0 z-30 border-b border-border bg-background/90 px-5 pb-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-end justify-between">
          <h1 className="font-display text-3xl font-extrabold leading-none">
            GYM <span className="text-primary">60</span>
          </h1>
          <span className="text-xs text-muted-foreground">{data.profile.weightKg} kg · {data.profile.heightCm} cm</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-32 pt-4">
        {!ready ? null : tab === "train" ? (
          <Train data={data} update={update} />
        ) : tab === "progress" ? (
          <Progress data={data} update={update} />
        ) : (
          <DataTab data={data} setData={setData} />
        )}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-3">
          {([["train", "Train", Dumbbell], ["progress", "Progress", LineChart], ["data", "Data", Database]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold", tab === k ? "text-primary" : "text-muted-foreground")}>
              <I className="h-6 w-6" />{l}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ---------------- TRAIN ---------------- */

function Train({ data, update }: { data: AppData; update: (f: (d: AppData) => AppData) => void }) {
  const [day, setDay] = useState<DayKey>(() => todayKey());
  const [core, setCore] = useState(false);
  const active = data.active;

  if (!active) {
    const plan = PROGRAM[day];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
          {(Object.keys(PROGRAM) as DayKey[]).map((k) => (
            <button key={k} onClick={() => setDay(k)} className={cn("min-h-12 rounded-xl font-display text-lg font-bold uppercase", day === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {PROGRAM[k].label}
            </button>
          ))}
        </div>
        <WarmUp />
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-2xl font-bold uppercase">{plan.title}</h2>
          <ul className="mt-3 divide-y divide-border">
            {plan.exercises.map((e) => {
              const s = suggest(e, lastLog(data.sessions, e.id));
              return (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <span className="font-semibold">{e.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {e.sets}×{e.min}-{e.max}{s.weight != null && <span className="ml-2 text-primary">{s.weight} kg</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <label className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card px-4">
          <span><span className="font-semibold">Add core finisher</span><br /><span className="text-sm text-muted-foreground">Dead bugs + reverse crunch, 2 sets each</span></span>
          <input type="checkbox" checked={core} onChange={(e) => setCore(e.target.checked)} className="h-6 w-6 accent-primary" />
        </label>
        <button onClick={() => update((d) => ({ ...d, active: newWorkout(day, d.sessions, core) }))} className="shadow-glow min-h-16 w-full rounded-2xl bg-primary font-display text-2xl font-extrabold uppercase text-primary-foreground active:scale-[0.98]">
          Start {plan.title}
        </button>
      </div>
    );
  }

  return <ActiveView data={data} active={active} update={update} />;
}

function WarmUp() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex min-h-14 w-full items-center justify-between px-4">
        <span className="flex items-center gap-2 font-semibold"><Flame className="h-5 w-5 text-warning" />Warm-up (~5 min)</span>
        <ChevronDown className={cn("h-5 w-5 transition", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="space-y-2 px-4 pb-4 text-sm text-muted-foreground">
          <li><b className="text-foreground">1.</b> 2–3 minutes easy movement (bike, rower, brisk walk).</li>
          <li><b className="text-foreground">2.</b> Dynamic mobility: arm circles, leg swings, hip openers, band pull-aparts.</li>
          <li><b className="text-foreground">3.</b> First big lift: 1–2 ramp-up sets (e.g. ~50% × 8, ~75% × 4) before working sets.</li>
          <li><b className="text-foreground">4.</b> Later heavy exercises: one lighter preparation set first.</li>
        </ol>
      )}
    </section>
  );
}

function useNow(active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function beep() {
  try {
    navigator.vibrate?.([200, 100, 200]);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  } catch { /* ignore */ }
}

function ActiveView({ data, active, update }: { data: AppData; active: ActiveWorkout; update: (f: (d: AppData) => AppData) => void }) {
  const now = useNow();
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const fired = useRef(false);
  const elapsed = (now - active.startedAt) / 1000;
  const restLeft = restEnd ? (restEnd - now) / 1000 : 0;

  useEffect(() => {
    if (restEnd && restLeft <= 0 && !fired.current) {
      fired.current = true;
      beep();
      setRestEnd(null);
    }
  }, [restLeft, restEnd]);

  const startRest = (s: number) => { fired.current = false; setRestEnd(Date.now() + s * 1000); };

  const setLog = (key: "exercises" | "coreLogs", i: number, si: number, patch: Partial<ExerciseLog["sets"][number]>) =>
    update((d) => {
      if (!d.active) return d;
      const list = d.active[key].map((e, ei) => ei !== i ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) });
      return { ...d, active: { ...d.active, [key]: list } };
    });

  const toggle = (key: "exercises" | "coreLogs", i: number, si: number, done: boolean) => {
    const s = active[key][i]?.sets[si];
    if (!s) return;
    const patch: Partial<typeof s> = { done };
    if (done && !s.r) patch.r = String(active[key][i]!.max);
    setLog(key, i, si, patch);
    if (done) startRest(data.restDefault);
  };

  const all = [...active.exercises, ...(active.core ? active.coreLogs : [])].flatMap((e) => e.sets);
  const doneCount = all.filter((s) => s.done).length;

  const finish = () => {
    if (!confirm(doneCount ? "Finish and save this workout?" : "No sets checked. Discard this workout?")) return;
    update((d) => {
      if (!d.active) return d;
      if (!doneCount) return { ...d, active: null };
      const exs = [...d.active.exercises, ...(d.active.core ? d.active.coreLogs : [])];
      return {
        ...d,
        active: null,
        sessions: [...d.sessions, { id: String(Date.now()), day: d.active.day, date: new Date().toISOString(), durationSec: Math.round(elapsed), exercises: exs }],
      };
    });
  };

  const pct = Math.min(100, (elapsed / 3600) * 100);
  const over = elapsed > 3600;

  return (
    <div className="space-y-4">
      <section className="sticky top-[calc(max(env(safe-area-inset-top),0.75rem)+3.25rem)] z-20 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{PROGRAM[active.day].title} · {doneCount}/{all.length} sets</p>
            <p className={cn("font-display text-4xl font-extrabold tabular-nums", over ? "text-destructive" : "text-foreground")}>{fmt(elapsed)}<span className="text-lg text-muted-foreground"> / 60:00</span></p>
          </div>
          <button onClick={finish} className="min-h-12 rounded-xl bg-secondary px-4 font-semibold">Finish</button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full", over ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} /></div>
        <div className="mt-3 flex items-center gap-2">
          {restEnd ? (
            <>
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-primary-foreground">
                <Timer className="h-5 w-5" /><span className="font-display text-2xl font-extrabold tabular-nums">{fmt(restLeft)}</span><span className="text-sm font-semibold">rest</span>
              </div>
              <button onClick={() => setRestEnd((e) => (e ? e + 15000 : e))} className="min-h-12 rounded-xl bg-secondary px-3 font-semibold">+15</button>
              <button aria-label="Stop rest" onClick={() => setRestEnd(null)} className="min-h-12 rounded-xl bg-secondary px-3"><X className="h-5 w-5" /></button>
            </>
          ) : (
            [60, 90, 120].map((s) => (
              <button key={s} onClick={() => { update((d) => ({ ...d, restDefault: s })); startRest(s); }} className={cn("min-h-12 flex-1 rounded-xl border font-semibold", data.restDefault === s ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                Rest {s}s
              </button>
            ))
          )}
        </div>
      </section>

      {active.exercises.map((e, i) => (
        <ExerciseCard key={e.id + i} log={e} hint={suggest(PROGRAM[active.day].exercises[i] ?? { min: e.min, max: e.max, step: 2.5 }, lastLog(data.sessions, e.id))} onSet={(si, p) => setLog("exercises", i, si, p)} onToggle={(si, d) => toggle("exercises", i, si, d)} />
      ))}
      {active.core && (
        <>
          <h3 className="px-1 pt-2 font-display text-xl font-bold uppercase text-muted-foreground">Core finisher</h3>
          {active.coreLogs.map((e, i) => (
            <ExerciseCard key={e.id} log={e} bodyweight hint={{ weight: null, kind: "new", text: i === 0 ? "Slow and controlled, lower back stays in contact with the floor." : "Curl hips up off the floor; avoid swinging the legs." }} onSet={(si, p) => setLog("coreLogs", i, si, p)} onToggle={(si, d) => toggle("coreLogs", i, si, d)} />
          ))}
        </>
      )}
      {!active.core && (
        <button onClick={() => update((d) => d.active ? ({ ...d, active: { ...d.active, core: true } }) : d)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground">
          <Plus className="h-5 w-5" />Add core finisher
        </button>
      )}
      <p className="px-1 text-xs text-muted-foreground">Suggestions are simple rep-range rules, not medical or coaching advice. Stop if anything hurts.</p>
    </div>
  );
}

function ExerciseCard({ log, hint, bodyweight, onSet, onToggle }: {
  log: ExerciseLog; hint: ReturnType<typeof suggest>; bodyweight?: boolean;
  onSet: (si: number, p: Partial<ExerciseLog["sets"][number]>) => void; onToggle: (si: number, d: boolean) => void;
}) {
  const complete = log.sets.every((s) => s.done);
  return (
    <section className={cn("rounded-2xl border bg-card p-4", complete ? "border-primary/60" : "border-border")}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl font-bold uppercase leading-tight">{log.name}</h3>
        <span className="shrink-0 text-sm text-muted-foreground">{log.sets.length}×{log.min}-{log.max}</span>
      </div>
      <p className={cn("mt-1 text-sm", hint.kind === "up" ? "text-primary" : hint.kind === "hold" ? "text-warning" : "text-muted-foreground")}>{hint.text}</p>
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 px-1 text-xs uppercase tracking-wider text-muted-foreground">
          <span>Set</span><span>{bodyweight ? "Extra kg" : "kg"}</span><span>Reps</span><span />
        </div>
        {log.sets.map((s, si) => (
          <div key={si} className="grid grid-cols-[2rem_1fr_1fr_3.5rem] items-center gap-2">
            <span className="text-center font-display text-xl font-bold text-muted-foreground">{si + 1}</span>
            <input inputMode="decimal" type="number" step="0.5" value={s.w} placeholder={bodyweight ? "BW" : "kg"} onChange={(e) => onSet(si, { w: e.target.value })} className={cn("h-14 w-full rounded-xl border border-input bg-background px-3 text-center text-lg font-semibold", s.done && "opacity-70")} />
            <input inputMode="numeric" type="number" value={s.r} placeholder={`${log.min}-${log.max}`} onChange={(e) => onSet(si, { r: e.target.value })} className={cn("h-14 w-full rounded-xl border border-input bg-background px-3 text-center text-lg font-semibold", s.done && "opacity-70")} />
            <button aria-label={`Mark set ${si + 1} done`} onClick={() => onToggle(si, !s.done)} className={cn("flex h-14 w-14 items-center justify-center rounded-xl border-2 transition", s.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
              <Check className="h-7 w-7" strokeWidth={3} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- PROGRESS ---------------- */

function Chart({ points, unit }: { points: { x: string; y: number }[]; unit: string }) {
  if (points.length < 2) return <p className="py-8 text-center text-sm text-muted-foreground">Log at least two entries to see a graph.</p>;
  const W = 320, H = 140, P = 8;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const pt = (i: number, y: number) => [P + (i / (points.length - 1)) * (W - 2 * P), H - P - ((y - min) / span) * (H - 2 * P)];
  const d = points.map((p, i) => (i ? "L" : "M") + pt(i, p.y).join(",")).join(" ");
  const last = points[points.length - 1]!;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{max}{unit}</span><span className="font-semibold text-primary">Latest {last.y}{unit}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full">
        <path d={`${d} L${pt(points.length - 1, min)[0]},${H} L${P},${H} Z`} className="fill-primary/10" />
        <path d={d} className="fill-none stroke-primary" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => { const [x, y] = pt(i, p.y); return <circle key={i} cx={x} cy={y} r={3.5} className="fill-primary" />; })}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{points[0]!.x}</span><span>{min}{unit}</span><span>{last.x}</span></div>
    </div>
  );
}

const entry = (date: string, weight?: number, waist?: number): BodyEntry => {
  const e: BodyEntry = { date };
  if (weight != null) e.weight = weight;
  if (waist != null) e.waist = waist;
  return e;
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function Progress({ data, update }: { data: AppData; update: (f: (d: AppData) => AppData) => void }) {
  const [w, setW] = useState("");
  const [waist, setWaist] = useState("");
  const allEx = useMemo(() => {
    const m = new Map<string, string>();
    Object.values(PROGRAM).forEach((p) => p.exercises.forEach((e) => m.set(e.id, e.name)));
    return [...m];
  }, []);
  const [exId, setExId] = useState(allEx[0]![0]);

  const body = [...data.body].sort((a, b) => a.date.localeCompare(b.date));
  const sessions = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
  const exPoints = sessions.flatMap((s) => {
    const l = s.exercises.find((e) => e.id === exId);
    const done = l?.sets.filter((x) => x.done && Number(x.w) > 0) ?? [];
    return done.length ? [{ x: shortDate(s.date), y: Math.max(...done.map((x) => Number(x.w))) }] : [];
  });

  const addBody = () => {
    const wn = parseFloat(w), wa = parseFloat(waist);
    if (!(wn > 0) && !(wa > 0)) return;
    const date = new Date().toISOString().slice(0, 10);
    update((d) => {
      const rest = d.body.filter((b) => b.date !== date);
      const prev = d.body.find((b) => b.date === date);
      return { ...d, body: [...rest, entry(date, wn > 0 ? wn : prev?.weight, wa > 0 ? wa : prev?.waist)], profile: wn > 0 ? { ...d.profile, weightKg: wn } : d.profile };
    });
    setW(""); setWaist("");
  };

  const card = "rounded-2xl border border-border bg-card p-4";
  const input = "h-14 w-full rounded-xl border border-input bg-background px-3 text-lg font-semibold";
  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="font-display text-2xl font-bold uppercase">Log body stats</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input className={input} inputMode="decimal" type="number" placeholder="Weight kg" value={w} onChange={(e) => setW(e.target.value)} />
          <input className={input} inputMode="decimal" type="number" placeholder="Waist cm" value={waist} onChange={(e) => setWaist(e.target.value)} />
        </div>
        <button onClick={addBody} className="mt-2 min-h-14 w-full rounded-xl bg-primary font-semibold text-primary-foreground">Save today</button>
      </section>
      <section className={card}><h3 className="mb-2 font-semibold">Body weight</h3><Chart unit=" kg" points={body.filter((b) => b.weight).map((b) => ({ x: shortDate(b.date), y: b.weight! }))} /></section>
      <section className={card}><h3 className="mb-2 font-semibold">Waist</h3><Chart unit=" cm" points={body.filter((b) => b.waist).map((b) => ({ x: shortDate(b.date), y: b.waist! }))} /></section>
      <section className={card}>
        <select value={exId} onChange={(e) => setExId(e.target.value)} className="mb-3 h-12 w-full rounded-xl border border-input bg-background px-3 font-semibold">
          {allEx.map(([id, n]) => <option key={id} value={id}>{n} — top set</option>)}
        </select>
        <Chart unit=" kg" points={exPoints} />
      </section>
      <section className={card}>
        <h3 className="mb-2 font-semibold">History ({data.sessions.length})</h3>
        {!sessions.length && <p className="text-sm text-muted-foreground">No workouts saved yet.</p>}
        <ul className="divide-y divide-border">
          {sessions.slice().reverse().map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">{PROGRAM[s.day].title} · {new Date(s.date).toLocaleDateString()}</p>
                <p className="text-sm text-muted-foreground">{fmt(s.durationSec)} · {s.exercises.flatMap((e) => e.sets).filter((x) => x.done).length} sets</p>
              </div>
              <button aria-label="Delete workout" onClick={() => confirm("Delete this workout?") && update((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== s.id) }))} className="flex h-12 w-12 items-center justify-center text-muted-foreground"><Trash2 className="h-5 w-5" /></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- DATA ---------------- */

function DataTab({ data, setData }: { data: AppData; setData: (d: AppData) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const bmi = data.profile.weightKg / (data.profile.heightCm / 100) ** 2;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gym60-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Backup downloaded.");
  };
  const importJson = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      if (!isAppData(parsed)) throw new Error();
      if (!confirm("Replace all current data with this backup?")) return;
      setData({ ...defaultData(), ...parsed });
      setMsg(`Imported ${parsed.sessions.length} workouts.`);
    } catch {
      setMsg("That file is not a valid GYM 60 backup.");
    }
  };

  const card = "rounded-2xl border border-border bg-card p-4";
  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="font-display text-2xl font-bold uppercase">Your data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything is stored only in this browser on this device. There is no account and no cloud sync.
          Clearing Safari data, private browsing, uninstalling the home-screen app, or iOS storage cleanup can
          erase it. Export a backup regularly and keep it in Files or iCloud Drive yourself.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={exportJson} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground"><Download className="h-5 w-5" />Export JSON</button>
          <button onClick={() => fileRef.current?.click()} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-secondary font-semibold"><Upload className="h-5 w-5" />Import JSON</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
        {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}
      </section>
      <section className={card}>
        <h3 className="font-semibold">Profile</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["weightKg", "heightCm"] as const).map((k) => (
            <label key={k} className="text-xs uppercase tracking-wider text-muted-foreground">{k === "weightKg" ? "Weight kg" : "Height cm"}
              <input type="number" inputMode="decimal" value={data.profile[k]} onChange={(e) => setData({ ...data, profile: { ...data.profile, [k]: Number(e.target.value) || 0 } })} className="mt-1 h-14 w-full rounded-xl border border-input bg-background px-3 text-lg font-semibold text-foreground" />
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">BMI {Number.isFinite(bmi) ? bmi.toFixed(1) : "–"} (a rough guide only; it doesn't distinguish muscle from fat).</p>
      </section>
      <section className={card}>
        <h3 className="font-semibold">Install on iPhone</h3>
        <p className="mt-2 text-sm text-muted-foreground">In Safari tap Share → Add to Home Screen. Once opened online, the app keeps working offline.</p>
      </section>
      <button onClick={() => confirm("Erase ALL workouts and body logs on this device? This cannot be undone.") && setData(defaultData())} className="min-h-14 w-full rounded-xl border border-destructive/50 font-semibold text-destructive">Erase all data</button>
      <p className="px-1 text-center text-xs text-muted-foreground">Core: {CORE.map((c) => c.name).join(", ")} · GYM 60</p>
    </div>
  );
}