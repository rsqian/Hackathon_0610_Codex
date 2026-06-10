import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "snacktrack-demo-state-v4";

const snackCatalog = [
  { name: "Pizza slice", calories: 285, protein: 12, carbs: 34, fat: 11 },
  { name: "Soft drink (12 oz)", calories: 140, protein: 0, carbs: 39, fat: 0 },
  { name: "Diet soda", calories: 5, protein: 0, carbs: 0, fat: 0 },
  { name: "Chips handful", calories: 160, protein: 2, carbs: 15, fat: 10 },
  { name: "Cookie", calories: 90, protein: 1, carbs: 12, fat: 4 },
  { name: "Slider", calories: 210, protein: 11, carbs: 18, fat: 10 },
  { name: "Protein bar", calories: 200, protein: 20, carbs: 22, fat: 7 },
  { name: "Beer", calories: 155, protein: 1, carbs: 13, fat: 0 },
];

const eventCatalog = [
  { name: "Conference", vibe: "Snacks around every corner", defaultSnack: "Chips handful" },
  { name: "Game Night", vibe: "Drinks, chips, and finger food", defaultSnack: "Soft drink (12 oz)" },
];

const demoState = {
  goals: { calories: 2200, protein: 140, carbs: 250, fat: 70 },
  activeEvent: "Conference",
  entries: [],
};

function normalizeState(source) {
  const base = structuredClone(demoState);
  if (!source || typeof source !== "object") return base;

  return {
    ...base,
    ...source,
    goals: {
      ...base.goals,
      ...(source.goals ?? {}),
    },
    entries: Array.isArray(source.entries) ? source.entries : base.entries,
    activeEvent: source.activeEvent ?? base.activeEvent,
  };
}

function loadState() {
  if (typeof window === "undefined") return demoState;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(demoState);
  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    return structuredClone(demoState);
  }
}

function snackByName(name) {
  return snackCatalog.find((item) => item.name === name);
}

function aggregate(entries) {
  return entries.reduce(
    (totals, entry) => {
      const snack = snackByName(entry.snack);
      totals.calories += snack.calories * entry.quantity;
      totals.protein += snack.protein * entry.quantity;
      totals.carbs += snack.carbs * entry.quantity;
      totals.fat += snack.fat * entry.quantity;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function pct(current, goal) {
  return Math.min(100, Math.round((current / goal) * 100));
}

function formatGrams(value) {
  return `${value}g`;
}

function formatShareSummary(state, totals, topEntry) {
  return [
    `SnackTrack summary for ${state.activeEvent}`,
    `Calories: ${totals.calories}/${state.goals.calories}`,
    `Protein: ${totals.protein}g/${state.goals.protein}g`,
    `Carbs: ${totals.carbs}g/${state.goals.carbs}g`,
    `Fat: ${totals.fat}g/${state.goals.fat}g`,
    `Top snack: ${topEntry?.snack ?? "none yet"}`,
  ].join("\n");
}

function makeGoalDraft(goals) {
  return {
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
  };
}

function parseGoalValue(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const initialState = loadState();

function App() {
  const [state, setState] = useState(() => initialState);
  const [snackName, setSnackName] = useState(snackCatalog[0].name);
  const [quantity, setQuantity] = useState(1);
  const [eventName, setEventName] = useState(demoState.activeEvent);
  const [goalDraft, setGoalDraft] = useState(() => makeGoalDraft(initialState.goals));
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    setGoalDraft(makeGoalDraft(state.goals));
  }, [state.goals.calories, state.goals.protein, state.goals.carbs, state.goals.fat]);

  const totals = useMemo(() => aggregate(state.entries), [state.entries]);
  const topEntry = useMemo(
    () =>
      [...state.entries]
        .map((entry) => ({ ...entry, calories: snackByName(entry.snack).calories * entry.quantity }))
        .sort((a, b) => b.calories - a.calories)[0],
    [state.entries],
  );
  const topSnackName = topEntry?.snack ?? "recent snacks";
  const macroTotal = totals.protein + totals.carbs + totals.fat;
  const proteinShare = macroTotal > 0 ? (totals.protein / macroTotal) * 100 : 100;
  const carbsShare = macroTotal > 0 ? (totals.carbs / macroTotal) * 100 : 0;
  const fatShare = macroTotal > 0 ? (totals.fat / macroTotal) * 100 : 0;
  const macroChartStyle =
    macroTotal > 0
      ? {
          background: `conic-gradient(#78d7ff 0 ${proteinShare}%, #ffb84d ${proteinShare}% ${
            proteinShare + carbsShare
          }%, #63e6a3 ${proteinShare + carbsShare}% 100%)`,
        }
      : {
          background: "conic-gradient(rgba(255,255,255,0.08) 0 100%)",
        };

  const overCalories = totals.calories - state.goals.calories;
  const proteinGap = state.goals.protein - totals.protein;
  const carbsGap = state.goals.carbs - totals.carbs;
  const insight =
    overCalories > 0
      ? `${topSnackName} was your biggest calorie driver. You are ${overCalories} calories over target, but the app helped you see the drift early.`
      : totals.protein >= state.goals.protein * 0.8
        ? `Strong protein day. You stayed near target with ${topSnackName} leading the snack log.`
        : `You are still under calorie target. Add a protein-forward snack if you want more balance.`;
  const suggestion =
    overCalories > 0
      ? `Switch the next event drink to water or diet soda and you will pull the day back by about 140 calories.`
      : proteinGap > 25
        ? `You still have room for one protein-forward snack. A protein bar would add 20g protein without blowing the target.`
        : carbsGap < 20
          ? `Carbs are nearly capped. If you log again, choose protein or a zero-calorie drink.`
          : `You are in a healthy range for ${state.activeEvent}. A small snack is fine if the event keeps going.`;

  function resetDemo() {
    setState(structuredClone(demoState));
    setSnackName(snackCatalog[0].name);
    setQuantity(1);
    setEventName(demoState.activeEvent);
    setGoalDraft(makeGoalDraft(demoState.goals));
  }

  function handleGoalSave(e) {
    e.preventDefault();
    const nextGoals = {
      calories: parseGoalValue(goalDraft.calories, state.goals.calories),
      protein: parseGoalValue(goalDraft.protein, state.goals.protein),
      carbs: parseGoalValue(goalDraft.carbs, state.goals.carbs),
      fat: parseGoalValue(goalDraft.fat, state.goals.fat),
    };

    setState((current) => ({
      ...current,
      goals: nextGoals,
    }));
  }

  function handlePreset(event) {
    const preset = eventCatalog.find((item) => item.name === event);
    setEventName(event);
    if (preset) setSnackName(preset.defaultSnack);
    setState((current) => ({ ...current, activeEvent: event }));
  }

  async function handleShareSummary() {
    const text = formatShareSummary(state, totals, topEntry);
    let copied = false;

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch {
      copied = false;
    }

    if (!copied && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }

    setShareMessage(
      copied ? "Summary copied to clipboard." : "Summary ready to copy. Clipboard access was limited here.",
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    const safeQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
    setState((current) => ({
      ...current,
      activeEvent: eventName,
      entries: [
        ...current.entries,
        {
          id: crypto.randomUUID(),
          snack: snackName,
          quantity: safeQuantity,
          event: eventName,
          time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ],
    }));
    setQuantity(1);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Hackathon MVP</p>
          <h1>SnackTrack</h1>
          <p className="lede">
            Fast calorie-aware logging for event snacks, pizza slices, soft drinks, and the foods
            that are hardest to count. Built for people who want to enjoy the room without losing
            track of the numbers.
          </p>
          <div className="hero-pills" aria-label="Product highlights">
            <span className="hero-pill">Snack-first logging</span>
            <span className="hero-pill">Event-aware presets</span>
            <span className="hero-pill">Judge-ready demo data</span>
          </div>
        </div>
        <div className="hero-card">
          <p className="hero-card-label">Today’s focus</p>
          <strong>Event-first snack tracking</strong>
          <span>
            Built for people who want to stay aware without logging every bite. All values are
            estimates.
          </span>
          <div className="hero-card-stats">
            <div>
              <b>1 tap</b>
              <span>to log a snack</span>
            </div>
            <div>
              <b>4 presets</b>
              <span>for demo-ready events</span>
            </div>
          </div>
        </div>
      </header>

      <section className="judge-strip" aria-label="Demo script">
        <div className="judge-copy">
          <p className="panel-subheading">Judge mode</p>
          <h2>60-second demo flow</h2>
          <p>
            Start with the problem, show a snack-heavy event, then copy the summary as the final
            proof that the app is useful in the real world.
          </p>
        </div>
          <div className="judge-steps">
            <div className="judge-step">
              <span>1</span>
              <strong>Pick an event</strong>
              <p>Conference or game night only, so the story stays focused.</p>
            </div>
          <div className="judge-step">
            <span>2</span>
            <strong>Add a snack</strong>
            <p>Pizza, soda, chips, or a protein bar in one quick log.</p>
          </div>
          <div className="judge-step">
            <span>3</span>
            <strong>Copy the summary</strong>
            <p>Show the total calories and macros instantly.</p>
          </div>
        </div>
      </section>

      <section className="story-band">
        <article className="story-card">
          <p className="story-label">The problem</p>
          <h2>Conference food is hard to count in the moment.</h2>
          <p>
            People at conferences usually do not have a scale, a recipe, or time to
            build a perfect log. SnackTrack embraces rough estimates and gets them into the
            dashboard instantly.
          </p>
        </article>
        <article className="story-card highlight">
          <p className="story-label">The solution</p>
          <h2>Quickly log conference snacks and see the calorie impact right away.</h2>
          <p>
            The app is optimized for the real world: conference snacks, drinks, chips, cookies,
            sliders, and the kind of grazing that happens between sessions.
          </p>
        </article>
      </section>

      <main className="grid">
        <section className="panel summary-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Daily Summary</p>
              <h2>Calories and macros</h2>
            </div>
            <div className="heading-actions">
              <button className="ghost-button" type="button" onClick={handleShareSummary}>
                Copy summary
              </button>
              <button id="resetDemo" className="ghost-button" type="button" onClick={resetDemo}>
                Reset demo data
              </button>
            </div>
          </div>

          <div className="summary-grid">
            <article className="summary-card">
              <span>Calories</span>
              <strong>{totals.calories}</strong>
              <small>of {state.goals.calories} goal</small>
            </article>
            <article className="summary-card">
              <span>Protein</span>
              <strong>{formatGrams(totals.protein)}</strong>
              <small>of {state.goals.protein}g goal</small>
            </article>
            <article className="summary-card">
              <span>Carbs</span>
              <strong>{formatGrams(totals.carbs)}</strong>
              <small>of {state.goals.carbs}g goal</small>
            </article>
            <article className="summary-card">
              <span>Fat</span>
              <strong>{formatGrams(totals.fat)}</strong>
              <small>of {state.goals.fat}g goal</small>
            </article>
          </div>

          <div className="insight">{insight}</div>

          <div className="smart-panel">
            <div className="panel-subheading">Smart suggestion</div>
            <p>{suggestion}</p>
          </div>

          <div className="goal-editor">
            <div className="panel-subheading">Goal tuner</div>
            <form className="goal-form" onSubmit={handleGoalSave}>
              <label>
                Calories
                <input
                  type="number"
                  min="1"
                  value={goalDraft.calories}
                  onChange={(e) => setGoalDraft((current) => ({ ...current, calories: e.target.value }))}
                />
              </label>
              <label>
                Protein
                <input
                  type="number"
                  min="1"
                  value={goalDraft.protein}
                  onChange={(e) => setGoalDraft((current) => ({ ...current, protein: e.target.value }))}
                />
              </label>
              <label>
                Carbs
                <input
                  type="number"
                  min="1"
                  value={goalDraft.carbs}
                  onChange={(e) => setGoalDraft((current) => ({ ...current, carbs: e.target.value }))}
                />
              </label>
              <label>
                Fat
                <input
                  type="number"
                  min="1"
                  value={goalDraft.fat}
                  onChange={(e) => setGoalDraft((current) => ({ ...current, fat: e.target.value }))}
                />
              </label>
              <button className="secondary-button" type="submit">
                Save goals
              </button>
            </form>
          </div>

          <div className="chart-card">
            <div className="panel-subheading">Macro pie</div>
            <div className="pie-wrap">
              <div className="macro-pie" style={macroChartStyle}>
                <div className="macro-pie-hole">
                  <strong>{macroTotal === 0 ? "No data yet" : `${macroTotal}g`}</strong>
                  <span>macro mix</span>
                </div>
              </div>
              <div className="pie-legend">
                <div><span className="legend-swatch protein"></span>Protein {totals.protein}g</div>
                <div><span className="legend-swatch carbs"></span>Carbs {totals.carbs}g</div>
                <div><span className="legend-swatch fat"></span>Fat {totals.fat}g</div>
              </div>
            </div>
          </div>

          {shareMessage ? <div className="share-toast">{shareMessage}</div> : null}
        </section>

        <aside className="panel add-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Quick Add</p>
              <h2>Log a snack</h2>
            </div>
          </div>

          <form className="snack-form" onSubmit={handleSubmit}>
            <label>
              Snack
              <select value={snackName} onChange={(e) => setSnackName(e.target.value)}>
                {snackCatalog.map((snack) => (
                  <option key={snack.name} value={snack.name}>
                    {snack.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label>
              Event
              <select value={eventName} onChange={(e) => setEventName(e.target.value)}>
                {eventCatalog.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Add snack
            </button>
          </form>

          <div className="preset-list">
            <p className="section-label">Popular event presets</p>
            <div className="chip-row">
              {eventCatalog.map((event) => (
                <button key={event.name} className="chip" type="button" onClick={() => handlePreset(event.name)}>
                  {event.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="panel log-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Today’s Log</p>
              <h2>Recent snack entries</h2>
            </div>
          </div>
          <div className="log-list">
            {state.entries.length === 0 ? (
              <div className="empty-log">No food log yet. Start with a conference snack when you’re ready.</div>
            ) : (
              [...state.entries].reverse().map((entry) => {
                const snack = snackByName(entry.snack);
                const totalCalories = snack.calories * entry.quantity;
                return (
                  <article className="log-item" key={entry.id}>
                    <div>
                      <strong>
                        {entry.snack} x{entry.quantity}
                      </strong>
                      <div className="log-meta">
                        {entry.event} • {entry.time}
                      </div>
                    </div>
                    <div className="log-kpi">
                      {totalCalories} kcal
                      <br />
                      P {snack.protein * entry.quantity}g | C {snack.carbs * entry.quantity}g | F{" "}
                      {snack.fat * entry.quantity}g
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="panel focus-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Event Mode</p>
              <h2>Built for snack-heavy situations</h2>
            </div>
          </div>
          <div className="event-grid">
            {eventCatalog.map((event) => {
              const isActive = state.activeEvent === event.name;
              return (
                <article
                  className="event-card"
                  key={event.name}
                  style={{ outline: isActive ? "2px solid rgba(255,184,77,0.55)" : "none" }}
                >
                  <h3>{event.name}</h3>
                  <p>{event.vibe}</p>
                  <strong>Default snack: {event.defaultSnack}</strong>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
