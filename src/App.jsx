import { useState, useMemo, useEffect } from 'react';
import scenarioData from './data/demo-15km.json';
import {
  ICON,
  OK_PATH,
  NO_PATH,
  getTimeframe,
  clampB,
  clampT,
  eur,
  kg,
  fmtTime,
  ceil5,
  joinList,
  minBy,
  computeTradeoffs,
} from './utils/computeTradeoffs';
import ComparisonChart from './components/ComparisonChart';

function Icon({ d, size = 20, sw = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function App() {
  const q = new URLSearchParams(window.location.search);
  const [budget, setBudget] = useState(() => clampB(parseFloat(q.get('budget') ?? scenarioData.defaultPreferences.maxBudgetEUR)));
  const [time, setTime] = useState(() => clampT(parseFloat(q.get('time') ?? scenarioData.defaultPreferences.maxTimeMinutes)));
  const [timeframe, setTimeframe] = useState(() => q.get('tf') || 'trip');
  const [baselineMode, setBaselineMode] = useState('car');
  const [selected, setSelected] = useState(() => q.get('select') || null);
  const [chosen, setChosen] = useState(null);
  const [view, setView] = useState(() => q.get('view') || 'all');
  const [sort, setSort] = useState('fixed');
  const [hover, setHover] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setAboutOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const computed = useMemo(() => computeTradeoffs(scenarioData.modes, budget, time), [budget, time]);
  const { modes, elig, n, lowCo2, lowCost, fastest } = computed;
  const tf = getTimeframe(timeframe);
  const mult = tf.mult;

  const handlePickMode = (id) => {
    setSelected((prev) => (prev === id ? null : id));
    setChosen(null);
  };

  const handleReset = () => {
    setBudget(scenarioData.defaultPreferences.maxBudgetEUR);
    setTime(scenarioData.defaultPreferences.maxTimeMinutes);
    setTimeframe('trip');
    setSelected(null);
    setChosen(null);
    setSort('fixed');
  };

  const limText = `a ${eur(budget)} budget and ${time}-minute limit`;
  let insightA = '', insightB = '', insightC = '';
  if (n === 0) {
    insightA = 'No option fits both limits. Increase your budget or travel time to see more choices.';
    const best = modes.reduce((acc, m) => {
      const score = Math.max(0, m.costEUR - budget) / 10 + Math.max(0, m.minutes - time) / 75;
      return !acc || score < acc.score ? { m, score } : acc;
    }, null);
    const parts = [];
    if (!best.m.inBudget) parts.push(`a budget of ${eur(best.m.costEUR)}`);
    if (!best.m.inTime) parts.push(`a ${ceil5(best.m.minutes)}-minute limit`);
    insightB = `Closest option: ${best.m.label} would fit with ${joinList(parts)}.`;
  } else {
    insightA =
      n === 4
        ? `With ${limText}, every sample mode fits. Tighten a limit to see how the options change.`
        : n === 1
        ? `With ${limText}, ${elig[0].label} is the only sample mode that meets both limits.`
        : `With ${limText}, ${joinList(elig.map((m) => m.label))} meet both limits.`;
    if (n < 4) {
      const single = modes.filter((m) => !m.eligible && (m.inBudget || m.inTime));
      if (single.length) {
        const p = single.reduce((acc, m) => {
          const s = m.inBudget ? (m.minutes - time) / 75 : (m.costEUR - budget) / 10;
          return !acc || s < acc.s ? { m, s } : acc;
        }, null).m;
        insightB = p.inBudget
          ? `Raise your travel-time limit to ${ceil5(p.minutes)} min to also consider ${p.label}.`
          : `Raise your budget to ${eur(p.costEUR)} to also consider ${p.label}.`;
      } else {
        insightB = 'The remaining modes would need both a higher budget and more time.';
      }
    }
    if (n >= 2) {
      insightC =
        lowCo2.id === fastest.id
          ? `Among these, ${lowCo2.label} is both the fastest and has the lowest estimated CO₂e.`
          : `Among these, ${lowCo2.label} has the lowest estimated CO₂e (${kg(lowCo2.kgCO2e, mult)} ${tf.unit}) and ${fastest.label} is the fastest (${fastest.minutes} min/trip).`;
    }
  }

  const selMode = modes.find((m) => m.id === selected);
  const countText = `${n} of 4 modes ${n === 1 ? 'fits' : 'fit'} your limits`;

  return (
    <div className="wrap">
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
            <rect width="44" height="44" rx="12" fill="#02364B" />
            <path d="M10 31 C 16 31, 16 22, 22 22 S 28 13, 34 13" fill="none" stroke="#7FD1C7" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="10" cy="31" r="3.2" fill="#EEFBF9" />
            <circle cx="22" cy="22" r="3.2" fill="#EEFBF9" />
            <circle cx="34" cy="13" r="3.2" fill="#EEFBF9" />
          </svg>
          <div>
            <h1 style={{ fontSize: '24px', lineHeight: 1.15, letterSpacing: '-.01em' }}>Interactive Transit Trade-offs</h1>
            <p className="sub" style={{ marginTop: '2px' }}>Find the balance between time, cost and carbon.</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <span className="pill" style={{ color: '#7A4A0C', background: 'var(--warn-bg)', border: '1px solid var(--warn-border)' }}>
            {scenarioData.scenario.isSynthetic ? 'Illustrative data' : 'Sourced Dutch data'}
          </span>
          <button className="btn" onClick={() => setAboutOpen(true)}>About these estimates</button>
        </div>
      </header>

      <section aria-label="Scenario" style={{ background: 'var(--navy)', color: '#fff', borderRadius: '20px', padding: '22px 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.12em', color: '#9FE0D6' }}>YOUR COMMUTE</div>
          <h2 style={{ color: '#fff', margin: '4px 0 6px', fontSize: '30px', lineHeight: 1.15 }}>15 km to campus</h2>
          <p style={{ margin: 0, color: '#D3ECEA', maxWidth: '640px' }}>
            You&apos;re choosing how to travel to university. Adjust how much money and time you can spend, compare the options, and decide what suits you.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span className="pill" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.22)' }}>15 km benchmark</span>
          <span className="pill" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.22)' }}>
            Viewing: {tf.label} ({tf.unit})
          </span>
        </div>
      </section>

      <div className="main-row">
        <section className="panel col-side" aria-labelledby="h-prio" style={{ gap: '22px' }}>
          <div>
            <h2 id="h-prio" style={{ fontSize: '19px' }}>Your priorities</h2>
            <p className="sub">Set your per-trip limits to see which options still work.</p>
          </div>

          <div className="ctrl">
            <div className="ctrl-head">
              <label htmlFor="budget">Maximum budget (per trip)</label>
              <span className="ctrl-val num">{eur(budget)}</span>
            </div>
            <div className="ctrl-row">
              <button className="btn icon-btn" disabled={budget <= 0} onClick={() => setBudget(clampB(budget - 0.5))} aria-label="Decrease budget by €0.50">−</button>
              <input id="budget" type="range" min="0" max="10" step="0.5" value={budget} onChange={(e) => setBudget(clampB(parseFloat(e.target.value)))} />
              <button className="btn icon-btn" disabled={budget >= 10} onClick={() => setBudget(clampB(budget + 0.5))} aria-label="Increase budget by €0.50">+</button>
            </div>
            <div className="markers" aria-hidden="true">
              {modes.map((m) => (
                <div key={m.id} className={`marker ${m.inBudget ? 'in' : 'out'}`} style={{ left: `${(m.costEUR / 10) * 100}%` }} title={`${m.label} ${eur(m.costEUR)}`}>
                  <Icon d={ICON[m.id]} size={14} sw={2} />
                </div>
              ))}
            </div>
            <div className="scale num"><span>€0</span><span>€5</span><span>€10</span></div>
          </div>

          <div className="ctrl">
            <div className="ctrl-head">
              <label htmlFor="time">Maximum travel time (per trip)</label>
              <span className="ctrl-val num">{time} min</span>
            </div>
            <div className="ctrl-row">
              <button className="btn icon-btn" disabled={time <= 15} onClick={() => setTime(clampT(time - 5))} aria-label="Decrease travel time by 5 minutes">−</button>
              <input id="time" type="range" min="15" max="90" step="5" value={time} onChange={(e) => setTime(clampT(parseFloat(e.target.value)))} />
              <button className="btn icon-btn" disabled={time >= 90} onClick={() => setTime(clampT(time + 5))} aria-label="Increase travel time by 5 minutes">+</button>
            </div>
            <div className="markers" aria-hidden="true">
              {modes.map((m) => (
                <div key={m.id} className={`marker ${m.inTime ? 'in' : 'out'}`} style={{ left: `${((m.minutes - 15) / 75) * 100}%` }} title={`${m.label} ${m.minutes} min`}>
                  <Icon d={ICON[m.id]} size={14} sw={2} />
                </div>
              ))}
            </div>
            <div className="scale num"><span>15 min</span><span>50</span><span>90 min</span></div>
          </div>

          <div className="insight" aria-live="polite">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span className="kicker">WHAT YOUR LIMITS MEAN</span>
              <span className="count num">{countText}</span>
            </div>
            <p>{insightA}</p>
            {insightB && <p style={{ fontSize: '14px', color: 'var(--muted2)' }}>{insightB}</p>}
            {insightC && <p style={{ fontSize: '14px', color: 'var(--muted2)' }}>{insightC}</p>}
          </div>

          <button className="btn" onClick={handleReset} style={{ alignSelf: 'flex-start' }}>Reset filters</button>
        </section>

        <ComparisonChart
          computed={computed}
          budget={budget}
          time={time}
          timeframe={timeframe}
          baselineMode={baselineMode}
          view={view}
          sort={sort}
          selected={selected}
          hover={hover}
          onTimeframeChange={setTimeframe}
          onBaselineChange={setBaselineMode}
          onViewChange={setView}
          onSortChange={setSort}
          onPickMode={handlePickMode}
          onHoverMode={setHover}
          onReset={handleReset}
        />

        <section className="panel col-side" aria-labelledby="h-sel" aria-live="polite" style={{ gap: '16px' }}>
          <h2 id="h-sel" style={{ fontSize: '19px' }}>Your selected option</h2>
          {!selMode ? (
            <div className="empty-sel">
              <p style={{ margin: 0, fontWeight: 600 }}>Select a transport mode to explore its trade-offs.</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Click a row in the chart, a bubble on the map, or a card below.
              </p>
            </div>
          ) : (
            <SelectedDetailsPanel
              selMode={selMode}
              modes={modes}
              tf={tf}
              isChosen={chosen === selMode.id}
              onChoose={() => setChosen(selMode.id)}
              onClear={() => { setSelected(null); setChosen(null); }}
            />
          )}
        </section>
      </div>

      <section aria-labelledby="h-modes" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <h2 id="h-modes" style={{ fontSize: '19px' }}>Transport modes ({tf.label})</h2>
          <span className="num" style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {countText} · Showing figures {tf.unit}
          </span>
        </div>
        <div className="cards">
          {modes.map((m) => {
            const isSel = selected === m.id;
            const badges = [];
            if (n > 1 && lowCo2?.id === m.id) badges.push('Lowest CO₂e that fits');
            if (n > 1 && lowCost?.id === m.id) badges.push('Cheapest that fits');
            if (n > 1 && fastest?.id === m.id) badges.push('Fastest that fits');
            return (
              <button
                key={m.id}
                className={`card ${isSel ? 'is-sel' : ''} ${m.eligible ? '' : 'out'} ${hover === m.id ? 'is-hover' : ''}`}
                aria-pressed={isSel}
                onClick={() => handlePickMode(m.id)}
                onMouseEnter={() => setHover(m.id)}
                onMouseLeave={() => setHover(null)}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`mode-ic ${isSel ? 'ic-sel' : m.eligible ? 'ic-in' : 'ic-out'}`} style={{ width: '40px', height: '40px' }}>
                      <Icon d={ICON[m.id]} size={22} />
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy)' }}>{m.label}</span>
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isSel ? 'var(--navy)' : 'var(--muted)' }}>
                    {isSel ? 'Selected' : 'Select'}
                  </span>
                </span>
                <span className={`chip ${m.eligible ? 'ok' : 'no'}`} style={{ alignSelf: 'flex-start' }}>
                  <Icon d={m.eligible ? OK_PATH : NO_PATH} size={12} sw={3} />
                  {m.eligible ? 'Within your limits' : `Outside your limits · ${m.reason}`}
                </span>
                <span className="facts num">
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Cost</span>
                    <span className="fv" style={{ color: m.inBudget ? 'var(--ink)' : 'var(--warn)' }}>{eur(m.costEUR, mult)}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Time</span>
                    <span className="fv" style={{ color: m.inTime ? 'var(--ink)' : 'var(--warn)' }}>{fmtTime(m.minutes, mult)}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>CO₂e</span>
                    <span className="fv">{kg(m.kgCO2e, mult)}{m.id === 'bicycle' ? '*' : ''}</span>
                  </span>
                </span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '24px' }}>
                  {badges.map((b) => <span key={b} className="badge">{b}</span>)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className={`overlay ${aboutOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setAboutOpen(false)}>
        <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="h-about">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <h2 id="h-about" style={{ fontSize: '22px' }}>About these estimates</h2>
            <button className="btn icon-btn" onClick={() => setAboutOpen(false)} aria-label="Close" style={{ width: '44px', height: '44px' }}>✕</button>
          </div>
          <p>{scenarioData.scenario.dataWarning}</p>
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Timeframe assumptions</h3>
            <ul>
              <li>1 Week = 5 round trips (10 one-way commutes)</li>
              <li>1 Semester = 15 teaching weeks (150 one-way commutes)</li>
              <li>1 Year = 30 academic weeks (300 one-way commutes)</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Reference sources</h3>
            <ul>
              <li>NS and 9292: train and public-transport fares and durations</li>
              <li>Nibud: household and car running costs</li>
              <li>Milieu Centraal &amp; CBS: emission factors per mode</li>
            </ul>
          </div>
          <button className="btn btn-primary" onClick={() => setAboutOpen(false)} style={{ marginTop: 'auto' }}>
            Back to the comparison
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectedDetailsPanel({ selMode, modes, tf, isChosen, onChoose, onClear }) {
  const mult = tf.mult;
  const sign = (d, fmt, same) => (Math.abs(d) < 1e-9 ? same : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d), mult)}`);
  const lowestAll = minBy(modes, 'kgCO2e');
  const fastestAll = minBy(modes, 'minutes');
  const tp = (d) =>
    d > 0 ? `takes ${fmtTime(d, mult)} longer` : d < 0 ? `is ${fmtTime(-d, mult)} faster` : 'takes the same time';
  const cp = (d) =>
    d > 1e-9 ? `costs ${eur(d, mult)} more` : d < -1e-9 ? `costs ${eur(-d, mult)} less` : 'costs the same';

  let trade;
  if (selMode.id === lowestAll.id) {
    trade = `${selMode.label} has the lowest estimated emissions in this sample.`;
    if (fastestAll.id !== selMode.id) {
      trade += ` Compared with ${fastestAll.label}, the fastest option, it ${tp(selMode.minutes - fastestAll.minutes)} and ${cp(selMode.costEUR - fastestAll.costEUR)} (${tf.unit}).`;
    }
  } else {
    const lower = modes.filter((m) => m.kgCO2e < selMode.kgCO2e - 1e-9);
    const lf = lower.filter((m) => m.eligible);
    const alt = minBy(lf.length ? lf : lower, 'kgCO2e');
    trade = `Switching to ${alt.label} would lower estimated emissions by ${kg(selMode.kgCO2e - alt.kgCO2e, mult)} CO₂e ${tf.unit}; it ${tp(alt.minutes - selMode.minutes)} and ${cp(alt.costEUR - selMode.costEUR)}.`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="mode-ic ic-sel" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
          <Icon d={ICON[selMode.id]} size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.1 }}>{selMode.label}</div>
          <span className={`chip ${selMode.eligible ? 'ok' : 'no'}`} style={{ marginTop: '4px' }}>
            <Icon d={selMode.eligible ? OK_PATH : NO_PATH} size={12} sw={3} />
            {selMode.eligible ? 'Within your limits' : `Outside your limits · ${selMode.reason}`}
          </span>
        </div>
        <button className="btn icon-btn" onClick={onClear} aria-label="Clear selection">✕</button>
      </div>

      <div className="tiles num">
        <div className="tile"><div className="a">Cost</div><div className="b">{eur(selMode.costEUR, mult)}</div><div className="c">{tf.unit}</div></div>
        <div className="tile"><div className="a">Time</div><div className="b">{fmtTime(selMode.minutes, mult)}</div><div className="c">{tf.unit}</div></div>
        <div className="tile"><div className="a">CO₂e</div><div className="b">{kg(selMode.kgCO2e, mult).replace(' kg', '')}{selMode.id === 'bicycle' ? '*' : ''}</div><div className="c">kg {tf.unit}</div></div>
      </div>

      <div style={{ background: 'var(--tint)', borderRadius: '14px', padding: '14px' }}>
        <div className="kicker" style={{ marginBottom: '6px' }}>THE TRADE-OFF ({tf.label.toUpperCase()})</div>
        <p style={{ margin: 0, fontSize: '14px' }}>{trade}</p>
      </div>

      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>If you switched to ({tf.unit})…</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {modes.filter((m) => m.id !== selMode.id).map((m) => (
            <div key={m.id} className="cmp">
              <span style={{ color: 'var(--teal)', marginTop: '2px' }}><Icon d={ICON[m.id]} size={20} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--navy)' }}>
                  {m.label}
                  <span style={{ fontSize: '11px', color: m.eligible ? 'var(--ok)' : 'var(--warn)' }}>{m.eligible ? 'FITS' : m.reason.toUpperCase()}</span>
                </div>
                <div className="num" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: '13px', color: 'var(--muted2)' }}>
                  <span>{sign(m.costEUR - selMode.costEUR, eur, 'same cost')}</span>
                  <span>{sign(m.minutes - selMode.minutes, fmtTime, 'same time')}</span>
                  <span>{sign(m.kgCO2e - selMode.kgCO2e, (v, mlt) => `${kg(v, mlt)} CO₂e`, 'same CO₂e')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isChosen ? (
        <div role="status" style={{ background: 'var(--ok-bg)', borderRadius: '12px', padding: '12px 14px', color: 'var(--ok)', fontSize: '14px' }}>
          <strong>You chose {selMode.label}.</strong> Try different limits or timeframes to see how the impact scales.
        </div>
      ) : (
        <button className="btn btn-primary" onClick={onChoose}>Choose {selMode.label} for this trip</button>
      )}
    </div>
  );
}