import { useEffect } from 'react';

export const GUIDE_STEPS = [
  {
    id: 'priorities',
    target: 'panel-priorities',
    stepLabel: 'Step 1 of 4 · Left Panel',
    title: 'Set your personal limits',
    description:
      'Use the sliders on the left to set your maximum budget (€) and travel time (minutes) for a one-way 15 km trip. Modes that exceed either limit are automatically flagged so you can see why they do not fit.',
    tip: 'Watch the small transport icons underneath each slider—they show where each option sits relative to your limit.',
  },
  {
    id: 'compare',
    target: 'panel-compare',
    stepLabel: 'Step 2 of 4 · Center Panel',
    title: 'Compare trade-offs across views',
    description:
      'The center workspace compares Car, Train, Bus, and Bicycle across Cost, Travel Time, and CO₂e emissions. Switch between "All metrics" bars, the "Slopegraph", "Weighted Rank", or the "2D Trade-off Map" to view the same trip from different angles.',
    tip: 'Dashed vertical lines inside the bars mark your active budget and time limits.',
  },
  {
    id: 'timeframe',
    target: 'control-timeframe',
    stepLabel: 'Step 3 of 4 · Top Right of Chart',
    title: 'Scale up to a week, semester, or year',
    description:
      'Small per-trip differences add up quickly. Toggle between 1 Trip, 1 Week, 1 Semester, and 1 Year to see how much money, travel hours, and CO₂e accumulate over time.',
    tip: 'Your per-trip filter limits stay active while all numbers scale proportionally.',
  },
  {
    id: 'decision',
    target: 'panel-decision',
    stepLabel: 'Step 4 of 4 · Right Panel & Cards',
    title: 'Inspect a mode and make your choice',
    description:
      'Click any row, chart bubble, or bottom card to inspect its exact numbers on the right. The panel shows how much money, time, and CO₂e you would gain or lose by switching to another mode.',
    tip: 'Once you find the balance that suits you, click "Choose [Mode] for this trip" to confirm.',
  },
];

export default function OnboardingGuide({ open, stepIndex, onStepChange, onClose }) {
  const step = GUIDE_STEPS[stepIndex] || GUIDE_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === GUIDE_STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.classList.add('tour-spotlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return () => {
      if (el) el.classList.remove('tour-spotlight');
    };
  }, [open, step.target]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && !isLast) onStepChange(stepIndex + 1);
      if (e.key === 'ArrowLeft' && !isFirst) onStepChange(stepIndex - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, stepIndex, isFirst, isLast, onStepChange, onClose]);

  if (!open) return null;

  return (
    <div
      className="tour-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tour-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <span className="kicker">{step.stepLabel.toUpperCase()}</span>
          <button
            className="btn"
            onClick={onClose}
            style={{ minHeight: '32px', padding: '4px 10px', fontSize: '13px' }}
          >
            Skip guide
          </button>
        </div>

        <h2 id="tour-title" style={{ fontSize: '21px', margin: '2px 0 0' }}>
          {step.title}
        </h2>

        <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.5, color: 'var(--ink)' }}>
          {step.description}
        </p>

        <div
          style={{
            background: 'var(--tint)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '13px',
            color: 'var(--muted2)',
          }}
        >
          <strong>Tip:</strong> {step.tip}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '4px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }} aria-label="Guide progress">
            {GUIDE_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => onStepChange(idx)}
                aria-label={`Go to slide ${idx + 1}: ${s.title}`}
                aria-current={idx === stepIndex ? 'step' : undefined}
                style={{
                  width: idx === stepIndex ? '22px' : '9px',
                  height: '9px',
                  borderRadius: '999px',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: idx === stepIndex ? 'var(--navy)' : '#BDD8D8',
                  transition: 'all .2s ease',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirst && (
              <button
                className="btn"
                onClick={() => onStepChange(stepIndex - 1)}
                style={{ minHeight: '38px', padding: '6px 14px' }}
              >
                Back
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => (isLast ? onClose() : onStepChange(stepIndex + 1))}
              style={{ minHeight: '38px', padding: '6px 16px' }}
            >
              {isLast ? 'Start exploring' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}