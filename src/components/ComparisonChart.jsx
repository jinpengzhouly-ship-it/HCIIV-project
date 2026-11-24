import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import 'd3-transition';
import {
  ICON,
  OK_PATH,
  NO_PATH,
  TIMEFRAMES,
  getTimeframe,
  eur,
  kg,
  fmtTime,
} from '../utils/computeTradeoffs';

function SvgIcon({ d, size = 20, sw = 1.9 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function D3MetricBar({ value, max, limit, over, eligible, selected, modeId }) {
  const rectRef = useRef(null);
  const lineRef = useRef(null);
  const width = 200;

  useEffect(() => {
    const xScale = d3.scaleLinear().domain([0, max]).range([0, width]);
    const targetWidth = Math.max(4, xScale(Math.min(max, value)));
    const targetFill = over
      ? `url(#stripes-${modeId})`
      : selected
      ? '#02364B'
      : eligible
      ? '#1C7C8C'
      : '#9DBFC2';

    d3.select(rectRef.current)
      .transition()
      .duration(240)
      .attr('width', targetWidth)
      .attr('fill', targetFill);

    if (limit !== null && lineRef.current) {
      const limitX = xScale(Math.min(max, limit));
      d3.select(lineRef.current)
        .transition()
        .duration(180)
        .attr('x1', limitX)
        .attr('x2', limitX);
    }
  }, [value, max, limit, over, eligible, selected, modeId]);

  return (
    <svg
      viewBox={`0 0 ${width} 26`}
      style={{ width: '100%', height: '26px', display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`stripes-${modeId}`}
          width="6"
          height="6"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="3" height="6" fill="#C9761A" />
          <rect x="3" width="3" height="6" fill="#FBE3C2" />
        </pattern>
      </defs>
      <rect x={0} y={7} width={width} height={12} rx={6} fill="#EEF5F5" />
      <rect ref={rectRef} x={0} y={7} width={4} height={12} rx={6} fill="#1C7C8C" />
      {limit !== null && (
        <line
          ref={lineRef}
          x1={0}
          x2={0}
          y1={0}
          y2={26}
          stroke="#02364B"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
      )}
    </svg>
  );
}

/* Annotated 2D Quadrant Map */
function D3TradeoffScatter({ modes, budget, time, mult, selected, hover, onPickMode, onHoverMode }) {
  const svgRef = useRef(null);
  const W = 640;
  const H = 340;
  const margin = { top: 26, right: 36, bottom: 48, left: 60 };

  const xTicks = [0, 2.5, 5, 7.5, 10];
  const yTicks = [0, 30, 60, 90];

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const xScale = d3.scaleLinear().domain([0, 10]).range([margin.left, W - margin.right]);
    const yScale = d3.scaleLinear().domain([0, 90]).range([H - margin.bottom, margin.top]);
    const rScale = d3.scaleSqrt().domain([0, 3]).range([16, 30]);

    svg
      .select('.feasible-zone')
      .transition()
      .duration(200)
      .attr('x', margin.left)
      .attr('y', yScale(time))
      .attr('width', Math.max(0, xScale(budget) - margin.left))
      .attr('height', Math.max(0, H - margin.bottom - yScale(time)));

    svg
      .select('.limit-x')
      .transition()
      .duration(200)
      .attr('x1', xScale(budget))
      .attr('x2', xScale(budget));

    svg
      .select('.limit-y')
      .transition()
      .duration(200)
      .attr('y1', yScale(time))
      .attr('y2', yScale(time));

    const paretoModes = modes
      .filter((m) => m.isPareto)
      .slice()
      .sort((a, b) => a.costEUR - b.costEUR);

    const lineGen = d3
      .line()
      .x((d) => xScale(d.costEUR))
      .y((d) => yScale(d.minutes))
      .curve(d3.curveMonotoneX);

    svg
      .select('.pareto-line')
      .datum(paretoModes)
      .transition()
      .duration(240)
      .attr('d', paretoModes.length > 1 ? lineGen : null);

    const nodes = svg.select('.nodes').selectAll('g.node').data(modes, (d) => d.id);
    const enter = nodes
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onPickMode(d.id))
      .on('mouseenter', (_, d) => onHoverMode(d.id))
      .on('mouseleave', () => onHoverMode(null));

    enter.append('circle').attr('class', 'pareto-ring').attr('fill', 'none');
    enter.append('circle').attr('class', 'main-bubble');
    enter
      .append('path')
      .attr('class', 'mode-glyph')
      .attr('fill', 'none')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('transform', 'translate(-9, -9) scale(0.75)');

    enter
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 700);

    enter
      .append('text')
      .attr('class', 'node-sub')
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 600);

    const merged = enter.merge(nodes);
    merged
      .transition()
      .duration(240)
      .attr('transform', (d) => `translate(${xScale(d.costEUR)}, ${yScale(d.minutes)})`);

    merged
      .select('circle.pareto-ring')
      .transition()
      .duration(240)
      .attr('r', (d) => rScale(d.kgCO2e) + 4)
      .attr('stroke', (d) => (d.isPareto ? '#024D60' : 'transparent'))
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 2')
      .attr('opacity', (d) => (d.isPareto ? 0.7 : 0));

    merged
      .select('circle.main-bubble')
      .transition()
      .duration(240)
      .attr('r', (d) => rScale(d.kgCO2e))
      .attr('fill', (d) =>
        selected === d.id ? '#02364B' : d.eligible ? '#1C7C8C' : '#C9761A'
      )
      .attr('fill-opacity', (d) =>
        hover === d.id || selected === d.id ? 1 : d.eligible ? 0.88 : 0.45
      )
      .attr('stroke', (d) =>
        selected === d.id || hover === d.id ? '#02364B' : '#FFFFFF'
      )
      .attr('stroke-width', (d) => (selected === d.id || hover === d.id ? 3 : 2));

    merged.select('path.mode-glyph').attr('d', (d) => ICON[d.id]);

    merged
      .select('text.node-label')
      .attr('dy', (d) => -rScale(d.kgCO2e) - 18)
      .attr('fill', '#02364B')
      .text((d) => `${d.label}${d.isPareto ? ' ★' : ''}`);

    merged
      .select('text.node-sub')
      .attr('dy', (d) => -rScale(d.kgCO2e) - 6)
      .attr('fill', '#315D6B')
      .text((d) => `${kg(d.kgCO2e, mult)} CO₂e`);
  }, [modes, budget, time, mult, selected, hover, onPickMode, onHoverMode]);

  const xScale = d3.scaleLinear().domain([0, 10]).range([margin.left, W - margin.right]);
  const yScale = d3.scaleLinear().domain([0, 90]).range([H - margin.bottom, margin.top]);
  const hoveredMode = modes.find((m) => m.id === hover);

  return (
    <div
      style={{
        background: '#FAFEFD',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '12px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--muted2)',
          marginBottom: '6px',
        }}
      >
        <span>
          <strong>2D Trade-off Map:</strong> Bubble size = CO₂e emissions. <strong>★</strong> marks best cost-time trade-offs.
        </span>
        {hoveredMode && (
          <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
            {hoveredMode.label}: {eur(hoveredMode.costEUR, mult)} · {fmtTime(hoveredMode.minutes, mult)} ·{' '}
            {kg(hoveredMode.kgCO2e, mult)} CO₂e
          </span>
        )}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <rect className="feasible-zone" fill="#E4F4EC" opacity={0.75} />

        <text x={margin.left + 10} y={H - margin.bottom - 10} fontSize={10.5} fontWeight={700} fill="#1F5E3B" opacity={0.65}>
          CHEAP &amp; FAST (IDEAL)
        </text>
        <text x={margin.left + 10} y={margin.top + 16} fontSize={10.5} fontWeight={700} fill="#547A87" opacity={0.55}>
          CHEAP &amp; SLOW
        </text>
        <text x={W - margin.right - 10} y={H - margin.bottom - 10} fontSize={10.5} fontWeight={700} fill="#547A87" opacity={0.55} textAnchor="end">
          EXPENSIVE &amp; FAST
        </text>
        <text x={W - margin.right - 10} y={margin.top + 16} fontSize={10.5} fontWeight={700} fill="#8A4B0F" opacity={0.55} textAnchor="end">
          EXPENSIVE &amp; SLOW
        </text>

        <line className="limit-x" y1={margin.top} y2={H - margin.bottom} stroke="#02364B" strokeWidth={1.8} strokeDasharray="4 3" />
        <line className="limit-y" x1={margin.left} x2={W - margin.right} stroke="#02364B" strokeWidth={1.8} strokeDasharray="4 3" />

        <path className="pareto-line" fill="none" stroke="#1C7C8C" strokeWidth={1.6} strokeDasharray="5 4" opacity={0.65} />

        <line x1={margin.left} x2={W - margin.right} y1={H - margin.bottom} y2={H - margin.bottom} stroke="#C9DEDE" />
        <line x1={margin.left} x2={margin.left} y1={margin.top} y2={H - margin.bottom} stroke="#C9DEDE" />

        {xTicks.map((v) => (
          <text key={v} x={xScale(v)} y={H - margin.bottom + 18} fontSize={11} fill="#547A87" textAnchor="middle" className="num">
            {eur(v, mult)}
          </text>
        ))}
        <text x={(margin.left + W - margin.right) / 2} y={H - 8} fontSize={12} fontWeight={600} fill="#02364B" textAnchor="middle">
          Cost ({getTimeframe(mult === 1 ? 'trip' : mult === 10 ? 'week' : mult === 150 ? 'semester' : 'year').unit})
        </text>

        {yTicks.map((v) => (
          <text key={v} x={margin.left - 8} y={yScale(v) + 4} fontSize={11} fill="#547A87" textAnchor="end" className="num">
            {fmtTime(v, mult)}
          </text>
        ))}
        <text
          transform={`translate(16, ${(margin.top + H - margin.bottom) / 2}) rotate(-90)`}
          fontSize={12}
          fontWeight={600}
          fill="#02364B"
          textAnchor="middle"
        >
          Travel time ({mult === 1 ? 'min' : 'cumulative hrs'})
        </text>

        <g className="nodes" />
      </svg>
    </div>
  );
}

/* 3-Axis Slopegraph (Equalizing Cost, Time & CO2e) */
function D3SlopegraphView({ modes, budget, time, mult, selected, hover, onPickMode, onHoverMode }) {
  const svgRef = useRef(null);
  const W = 660;
  const H = 360;
  const margin = { top: 54, right: 112, bottom: 32, left: 112 };

  const xCost = margin.left + 12;
  const xTime = W / 2;
  const xCo2 = W - margin.right - 12;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const yCost = d3.scaleLinear().domain([0, 10]).range([margin.top, H - margin.bottom]);
    const yTime = d3.scaleLinear().domain([0, 90]).range([margin.top, H - margin.bottom]);
    const yCo2 = d3.scaleLinear().domain([0, 3]).range([margin.top, H - margin.bottom]);

    svg
      .select('.cost-limit-tick')
      .transition()
      .duration(200)
      .attr('transform', `translate(${xCost}, ${yCost(budget)})`);

    svg
      .select('.time-limit-tick')
      .transition()
      .duration(200)
      .attr('transform', `translate(${xTime}, ${yTime(time)})`);

    const lineGen = (d) =>
      `M ${xCost} ${yCost(d.costEUR)} L ${xTime} ${yTime(d.minutes)} L ${xCo2} ${yCo2(d.kgCO2e)}`;

    const groups = svg.select('.slope-lines').selectAll('g.slope-mode').data(modes, (d) => d.id);
    const enter = groups
      .enter()
      .append('g')
      .attr('class', 'slope-mode')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onPickMode(d.id))
      .on('mouseenter', (_, d) => onHoverMode(d.id))
      .on('mouseleave', () => onHoverMode(null));

    enter
      .append('path')
      .attr('class', 'hit-line')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 16);

    enter
      .append('path')
      .attr('class', 'visible-line')
      .attr('fill', 'none')
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    enter.append('circle').attr('class', 'dot-cost').attr('r', 5.5).attr('stroke', '#FFFFFF').attr('stroke-width', 2);
    enter.append('circle').attr('class', 'dot-time').attr('r', 5.5).attr('stroke', '#FFFFFF').attr('stroke-width', 2);
    enter.append('circle').attr('class', 'dot-co2').attr('r', 5.5).attr('stroke', '#FFFFFF').attr('stroke-width', 2);

    enter.append('text').attr('class', 'lbl-left').attr('text-anchor', 'end').attr('font-size', 12).attr('font-weight', 700);
    enter.append('text').attr('class', 'lbl-mid').attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 700).attr('dy', -9);
    enter.append('text').attr('class', 'lbl-right').attr('text-anchor', 'start').attr('font-size', 12).attr('font-weight', 700);

    const merged = enter.merge(groups);

    merged.each(function (d) {
      if (d.id === hover || d.id === selected) {
        d3.select(this).raise();
      }
    });

    const getColor = (d) =>
      selected === d.id ? '#02364B' : d.eligible ? '#1C7C8C' : '#C9761A';

    const getOpacity = (d) => {
      if (hover) return hover === d.id ? 1 : 0.2;
      if (selected) return selected === d.id ? 1 : 0.45;
      return d.eligible ? 0.92 : 0.55;
    };

    merged.select('path.hit-line').attr('d', lineGen);

    merged
      .select('path.visible-line')
      .transition()
      .duration(240)
      .attr('d', lineGen)
      .attr('stroke', getColor)
      .attr('stroke-width', (d) => (hover === d.id || selected === d.id ? 4 : 2.6))
      .attr('stroke-dasharray', (d) => (d.eligible ? 'none' : '5 4'))
      .attr('opacity', getOpacity);

    merged
      .select('circle.dot-cost')
      .transition()
      .duration(240)
      .attr('cx', xCost)
      .attr('cy', (d) => yCost(d.costEUR))
      .attr('fill', getColor)
      .attr('opacity', getOpacity);

    merged
      .select('circle.dot-time')
      .transition()
      .duration(240)
      .attr('cx', xTime)
      .attr('cy', (d) => yTime(d.minutes))
      .attr('fill', getColor)
      .attr('opacity', getOpacity);

    merged
      .select('circle.dot-co2')
      .transition()
      .duration(240)
      .attr('cx', xCo2)
      .attr('cy', (d) => yCo2(d.kgCO2e))
      .attr('fill', getColor)
      .attr('opacity', getOpacity);

    merged
      .select('text.lbl-left')
      .transition()
      .duration(240)
      .attr('x', xCost - 11)
      .attr('y', (d) => yCost(d.costEUR) + 4)
      .attr('fill', getColor)
      .attr('opacity', getOpacity)
      .text((d) => `${d.label} · ${eur(d.costEUR, mult)}`);

    merged
      .select('text.lbl-mid')
      .transition()
      .duration(240)
      .attr('x', xTime)
      .attr('y', (d) => yTime(d.minutes))
      .attr('fill', '#02364B')
      .attr('opacity', getOpacity)
      .text((d) => fmtTime(d.minutes, mult));

    merged
      .select('text.lbl-right')
      .transition()
      .duration(240)
      .attr('x', xCo2 + 11)
      .attr('y', (d) => yCo2(d.kgCO2e) + 4)
      .attr('fill', getColor)
      .attr('opacity', getOpacity)
      .text((d) => `${kg(d.kgCO2e, mult)} · ${d.label}`);
  }, [modes, budget, time, mult, selected, hover, xCost, xTime, xCo2, onPickMode, onHoverMode]);

  return (
    <div style={{ background: '#FAFEFD', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px' }}>
      <div style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '6px' }}>
        <strong>3-Axis Slopegraph:</strong> All three metrics share equal vertical axes oriented with the{' '}
        <strong>lowest (best) value at the top</strong>. Crossing lines reveal direct trade-offs.
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <text x={12} y={margin.top + 4} fontSize={10} fontWeight={700} fill="#1F5E3B" opacity={0.75}>
          ▲ BEST / LOWEST
        </text>
        <text x={12} y={H - margin.bottom} fontSize={10} fontWeight={700} fill="#8A4B0F" opacity={0.7}>
          ▼ HIGHEST
        </text>

        {[
          { x: xCost, title: 'COST', topVal: eur(0, mult), botVal: eur(10, mult) },
          { x: xTime, title: 'TRAVEL TIME', topVal: fmtTime(0, mult), botVal: fmtTime(90, mult) },
          { x: xCo2, title: 'ESTIMATED CO₂e', topVal: kg(0, mult), botVal: kg(3, mult) },
        ].map((ax) => (
          <g key={ax.title}>
            <text x={ax.x} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill="#02364B" letterSpacing=".06em">
              {ax.title}
            </text>
            <text x={ax.x} y={38} textAnchor="middle" fontSize={10.5} fill="#547A87" className="num">
              {ax.topVal}
            </text>
            <line
              x1={ax.x}
              x2={ax.x}
              y1={margin.top}
              y2={H - margin.bottom}
              stroke="#C9DEDE"
              strokeWidth={2}
            />
            <text x={ax.x} y={H - 12} textAnchor="middle" fontSize={10.5} fill="#547A87" className="num">
              {ax.botVal}
            </text>
          </g>
        ))}

        <g className="cost-limit-tick">
          <line x1={-12} x2={12} y1={0} y2={0} stroke="#02364B" strokeWidth={2} strokeDasharray="3 2" />
          <text x={15} y={3} fontSize={10} fontWeight={700} fill="#02364B">
            Budget limit
          </text>
        </g>
        <g className="time-limit-tick">
          <line x1={-12} x2={12} y1={0} y2={0} stroke="#02364B" strokeWidth={2} strokeDasharray="3 2" />
          <text x={15} y={3} fontSize={10} fontWeight={700} fill="#02364B">
            Time limit
          </text>
        </g>

        <g className="slope-lines" />
      </svg>
    </div>
  );
}

/* Interactive Weighted Ranking Bar ("LineUp"-Style Score) */
function D3WeightedRankingView({ modes, mult, selected, hover, onPickMode, onHoverMode }) {
  const [weights, setWeights] = useState({ cost: 34, time: 33, co2: 33 });
  const svgRef = useRef(null);

  const totalW = weights.cost + weights.time + weights.co2 || 1;
  const normW = {
    cost: weights.cost / totalW,
    time: weights.time / totalW,
    co2: weights.co2 / totalW,
  };

  const ranked = modes
    .map((m) => {
      const cPart = normW.cost * Math.min(1, m.costEUR / 10);
      const tPart = normW.time * Math.min(1, m.minutes / 90);
      const ePart = normW.co2 * Math.min(1, m.kgCO2e / 3);
      const totalBurden = cPart + tPart + ePart;
      const matchScore = Math.max(0, Math.round((1 - totalBurden) * 100));
      return { ...m, cPart, tPart, ePart, totalBurden, matchScore };
    })
    .sort((a, b) => a.totalBurden - b.totalBurden)
    .map((m, idx) => ({ ...m, rank: idx + 1 }));

  const W = 640;
  const rowH = 56;
  const H = ranked.length * rowH + 8;
  const barX = 185;
  const maxBarW = 355;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, maxBarW]);

    const rows = svg.select('.rank-rows').selectAll('g.rank-row').data(ranked, (d) => d.id);
    const enter = rows
      .enter()
      .append('g')
      .attr('class', 'rank-row')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onPickMode(d.id))
      .on('mouseenter', (_, d) => onHoverMode(d.id))
      .on('mouseleave', () => onHoverMode(null));

    enter
      .append('rect')
      .attr('class', 'row-bg')
      .attr('x', 0)
      .attr('y', 2)
      .attr('width', W)
      .attr('height', rowH - 6)
      .attr('rx', 12);

    enter.append('circle').attr('class', 'rank-badge').attr('cx', 24).attr('cy', rowH / 2 - 1).attr('r', 13);
    enter
      .append('text')
      .attr('class', 'rank-num')
      .attr('x', 24)
      .attr('y', rowH / 2 + 3)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 700);

    enter
      .append('text')
      .attr('class', 'mode-lbl')
      .attr('x', 46)
      .attr('y', 23)
      .attr('font-size', 15)
      .attr('font-weight', 700)
      .attr('fill', '#02364B');

    enter
      .append('text')
      .attr('class', 'mode-meta')
      .attr('x', 46)
      .attr('y', 40)
      .attr('font-size', 11.5)
      .attr('font-weight', 600);

    enter
      .append('rect')
      .attr('x', barX)
      .attr('y', 16)
      .attr('width', maxBarW)
      .attr('height', 22)
      .attr('rx', 6)
      .attr('fill', '#EEF5F5');

    enter.append('rect').attr('class', 'seg-cost').attr('y', 16).attr('height', 22).attr('rx', 4).attr('fill', '#02364B');
    enter.append('rect').attr('class', 'seg-time').attr('y', 16).attr('height', 22).attr('fill', '#1C7C8C');
    enter.append('rect').attr('class', 'seg-co2').attr('y', 16).attr('height', 22).attr('rx', 4).attr('fill', '#3D9A6B');

    enter
      .append('text')
      .attr('class', 'score-lbl num')
      .attr('x', W - 12)
      .attr('y', rowH / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 13)
      .attr('font-weight', 700)
      .attr('fill', '#02364B');

    const merged = enter.merge(rows);

    merged
      .transition()
      .duration(280)
      .attr('transform', (d) => `translate(0, ${(d.rank - 1) * rowH})`);

    merged
      .select('rect.row-bg')
      .attr('fill', (d) => (selected === d.id ? '#E8F5F3' : hover === d.id ? '#F4FBFA' : '#FFFFFF'))
      .attr('stroke', (d) => (selected === d.id ? '#02364B' : hover === d.id ? '#9DBFC2' : '#E0EFEE'))
      .attr('stroke-width', (d) => (selected === d.id ? 2 : 1));

    merged
      .select('circle.rank-badge')
      .attr('fill', (d) => (d.rank === 1 ? '#02364B' : '#E0EFEE'));

    merged
      .select('text.rank-num')
      .attr('fill', (d) => (d.rank === 1 ? '#FFFFFF' : '#02364B'))
      .text((d) => `#${d.rank}`);

    merged.select('text.mode-lbl').text((d) => d.label);

    merged
      .select('text.mode-meta')
      .attr('fill', (d) => (d.eligible ? '#1F5E3B' : '#8A4B0F'))
      .text((d) => (d.eligible ? 'Fits both limits' : d.reason));

    merged
      .select('rect.seg-cost')
      .transition()
      .duration(240)
      .attr('x', barX)
      .attr('width', (d) => xScale(d.cPart));

    merged
      .select('rect.seg-time')
      .transition()
      .duration(240)
      .attr('x', (d) => barX + xScale(d.cPart))
      .attr('width', (d) => xScale(d.tPart));

    merged
      .select('rect.seg-co2')
      .transition()
      .duration(240)
      .attr('x', (d) => barX + xScale(d.cPart + d.tPart))
      .attr('width', (d) => xScale(d.ePart));

    merged
      .select('text.score-lbl')
      .text((d) => `${d.matchScore}/100 pts`);
  }, [ranked, selected, hover, onPickMode, onHoverMode]);

  const presets = [
    { label: 'Balanced', vals: { cost: 34, time: 33, co2: 33 } },
    { label: 'Budget-first', vals: { cost: 65, time: 20, co2: 15 } },
    { label: 'Time-first', vals: { cost: 15, time: 70, co2: 15 } },
    { label: 'Low-carbon', vals: { cost: 15, time: 15, co2: 70 } },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          background: 'var(--tint)',
          borderRadius: '14px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div className="kicker">PERSONAL PRIORITY WEIGHTS</div>
            <div style={{ fontSize: '13px', color: 'var(--muted2)' }}>
              Adjust how much each factor matters to you. Shorter colored bars mean lower burden and a higher rank.
            </div>
          </div>
          <div className="sortbar">
            {presets.map((p) => (
              <button key={p.label} onClick={() => setWeights(p.vals)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '12px' }}>
          {[
            { key: 'cost', label: 'Cost importance', color: '#02364B', pct: Math.round(normW.cost * 100) },
            { key: 'time', label: 'Time importance', color: '#1C7C8C', pct: Math.round(normW.time * 100) },
            { key: 'co2', label: 'CO₂e importance', color: '#3D9A6B', pct: Math.round(normW.co2 * 100) },
          ].map((item) => (
            <div
              key={item.key}
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                padding: '8px 12px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: item.color }}>
                <span>{item.label}</span>
                <span className="num">{item.pct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[item.key]}
                aria-label={item.label}
                onChange={(e) => setWeights((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))}
                style={{ width: '100%', height: '24px', accentColor: item.color }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
        <span>RANK &amp; MODE</span>
        <span>WEIGHTED BURDEN BREAKDOWN (SHORTER = BETTER)</span>
        <span>MATCH SCORE</span>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <g className="rank-rows" />
      </svg>

      {ranked[0] && (
        <div style={{ fontSize: '13px', color: 'var(--muted2)', background: '#F4FBFA', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <strong>Current #1 match: {ranked[0].label}</strong> ({eur(ranked[0].costEUR, mult)} ·{' '}
          {fmtTime(ranked[0].minutes, mult)} · {kg(ranked[0].kgCO2e, mult)} CO₂e).
        </div>
      )}
    </div>
  );
}

export default function ComparisonChart({
  computed,
  budget,
  time,
  timeframe,
  view,
  sort,
  selected,
  hover,
  onTimeframeChange,
  onViewChange,
  onSortChange,
  onPickMode,
  onHoverMode,
  onReset,
}) {
  const tf = getTimeframe(timeframe);
  const mult = tf.mult;

  const METRICS = [
    {
      id: 'cost',
      label: 'Cost',
      unit: `€ ${tf.unit}`,
      max: 10,
      get: (m) => m.costEUR,
      fmt: (v) => eur(v, mult),
      limit: budget,
      limitLabel: `Your budget: ${eur(budget, mult)}`,
      ticks: [0, 2.5, 5, 7.5, 10].map((v) => [v, eur(v, mult)]),
    },
    {
      id: 'time',
      label: 'Travel time',
      unit: mult === 1 ? 'minutes / trip' : `hours ${tf.unit}`,
      max: 90,
      get: (m) => m.minutes,
      fmt: (v) => fmtTime(v, mult),
      limit: time,
      limitLabel: `Your limit: ${fmtTime(time, mult)}`,
      ticks: [0, 30, 60, 90].map((v) => [v, fmtTime(v, mult)]),
    },
    {
      id: 'co2',
      label: 'Estimated CO₂e',
      unit: `kg CO₂e ${tf.unit}`,
      max: 3,
      get: (m) => m.kgCO2e,
      fmt: (v) => kg(v, mult),
      limit: null,
      limitLabel: 'No limit, for comparison',
      ticks: [0, 1, 2, 3].map((v) => [v, kg(v, mult)]),
    },
  ];

  const shown = view === 'all' ? METRICS : METRICS.filter((m) => m.id === view);
  const cols =
    view === 'all'
      ? 'minmax(118px,170px) repeat(3,minmax(0,1fr))'
      : 'minmax(118px,170px) minmax(0,1fr)';

  const rows = [...computed.modes];
  if (sort === 'co2') rows.sort((a, b) => a.kgCO2e - b.kgCO2e);
  if (sort === 'cost') rows.sort((a, b) => a.costEUR - b.costEUR);
  if (sort === 'time') rows.sort((a, b) => a.minutes - b.minutes);

  const isCustomChart = view === 'map' || view === 'slope' || view === 'weighted';

  return (
    <section className="panel col-main" aria-labelledby="h-cmp">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h2 id="h-cmp" style={{ fontSize: '19px' }}>Compare your options</h2>
          <p className="sub">All modes share the same 15 km example trip. Switch views or timeframe to explore trade-offs.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted2)' }}>Timeframe:</span>
          <div className="seg" role="group" aria-label="Time horizon">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                aria-pressed={timeframe === t.id}
                onClick={() => onTimeframeChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div className="seg" role="group" aria-label="Visualization mode">
          {[
            ['all', 'All metrics'],
            ['slope', 'Slopegraph'],
            ['weighted', 'Weighted Rank'],
            ['map', '2D Trade-off Map'],
            ['cost', 'Cost'],
            ['time', 'Time'],
            ['co2', 'CO₂e'],
          ].map(([id, label]) => (
            <button key={id} aria-pressed={view === id} onClick={() => onViewChange(id)}>
              {label}
            </button>
          ))}
        </div>

        {!isCustomChart && (
          <div className="sortbar">
            <span style={{ fontWeight: 600, color: 'var(--muted2)' }}>Order:</span>
            {[
              ['fixed', 'Fixed'],
              ['co2', 'Lowest CO₂e'],
              ['cost', 'Lowest cost'],
              ['time', 'Fastest'],
            ].map(([id, label]) => (
              <button key={id} aria-pressed={sort === id} onClick={() => onSortChange(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {computed.n === 0 && (
        <div className="banner" role="status">
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ fontWeight: 700 }}>No option fits both limits.</div>
            <div style={{ fontSize: '14px' }}>
              Increase your budget or travel time to see more choices. All four modes stay listed below so you can see why.
            </div>
          </div>
          <button className="btn btn-primary" onClick={onReset} style={{ minHeight: '40px' }}>
            Reset filters
          </button>
        </div>
      )}

      {view === 'slope' ? (
        <D3SlopegraphView
          modes={computed.modes}
          budget={budget}
          time={time}
          mult={mult}
          selected={selected}
          hover={hover}
          onPickMode={onPickMode}
          onHoverMode={onHoverMode}
        />
      ) : view === 'weighted' ? (
        <D3WeightedRankingView
          modes={computed.modes}
          mult={mult}
          selected={selected}
          hover={hover}
          onPickMode={onPickMode}
          onHoverMode={onHoverMode}
        />
      ) : view === 'map' ? (
        <D3TradeoffScatter
          modes={computed.modes}
          budget={budget}
          time={time}
          mult={mult}
          selected={selected}
          hover={hover}
          onPickMode={onPickMode}
          onHoverMode={onHoverMode}
        />
      ) : (
        <>
          <div className="grid colhead" style={{ gridTemplateColumns: cols, alignItems: 'end', padding: '0 12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', color: 'var(--muted)' }}>MODE</div>
            {shown.map((mt) => (
              <div key={mt.id} style={{ minWidth: 0 }}>
                <div className="t">{mt.label}</div>
                <div className="u">{mt.unit}</div>
                <div className="l num" style={{ color: mt.limit !== null ? 'var(--navy)' : 'var(--muted)' }}>
                  {mt.limit !== null && <span className="dash" />}
                  {mt.limitLabel}
                </div>
              </div>
            ))}
          </div>

          <div className="rows">
            {rows.map((m, i) => {
              const isSel = selected === m.id;
              const isHover = hover === m.id;
              const tipPos = i >= 2 ? { bottom: 'calc(100% - 6px)' } : { top: 'calc(100% - 6px)' };

              return (
                <button
                  key={m.id}
                  className={`row grid ${isSel ? 'is-sel' : ''} ${isHover ? 'is-hover' : ''}`}
                  style={{ gridTemplateColumns: cols }}
                  aria-pressed={isSel}
                  onClick={() => onPickMode(m.id)}
                  onMouseEnter={() => onHoverMode(m.id)}
                  onMouseLeave={() => onHoverMode(null)}
                >
                  <div className="mode">
                    <span className={`mode-ic ${isSel ? 'ic-sel' : m.eligible ? 'ic-in' : 'ic-out'}`}>
                      <SvgIcon d={ICON[m.id]} size={22} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="mode-name">{m.label}</span>
                      <span className="mode-st" style={{ color: m.eligible ? 'var(--ok)' : 'var(--warn)' }}>
                        <SvgIcon d={m.eligible ? OK_PATH : NO_PATH} size={12} sw={3} />
                        {m.eligible ? 'Fits both limits' : m.reason}
                      </span>
                    </span>
                  </div>

                  {shown.map((mt) => {
                    const v = mt.get(m);
                    const over = mt.limit !== null && v > mt.limit + 1e-9;
                    return (
                      <div key={mt.id} className="cell">
                        <div className="cell-v">
                          <span className="v num" style={{ color: over ? 'var(--warn)' : 'var(--ink)' }}>
                            {mt.fmt(v)}
                          </span>
                          {over && <span className="over-tag">OVER LIMIT</span>}
                          {mt.id === 'co2' && m.id === 'bicycle' && (
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>direct*</span>
                          )}
                        </div>
                        <D3MetricBar
                          value={v}
                          max={mt.max}
                          limit={mt.limit}
                          over={over}
                          eligible={m.eligible}
                          selected={isSel}
                          modeId={`${m.id}-${mt.id}`}
                        />
                      </div>
                    );
                  })}

                  <div className="tip num" role="tooltip" style={tipPos}>
                    <div className="k">{m.label.toUpperCase()} ({tf.label.toUpperCase()})</div>
                    <div className="g">
                      <span>Cost</span><span>{eur(m.costEUR, mult)} {tf.unit}</span>
                      <span>Travel time</span><span>{fmtTime(m.minutes, mult)} {tf.unit}</span>
                      <span>Estimated emissions</span><span>{kg(m.kgCO2e, mult)} CO₂e</span>
                      <span>Status</span>
                      <span>{m.eligible ? 'Within your limits' : `${m.reason} (${eur(budget)}/trip, ${time} min/trip)`}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: cols, padding: '0 14px' }} aria-hidden="true">
            <div />
            {shown.map((mt) => (
              <div key={mt.id} className="axis num">
                {mt.ticks.map(([val, label], j) => (
                  <span
                    key={val}
                    style={{
                      left: `${(val / mt.max) * 100}%`,
                      transform: `translateX(${j === 0 ? '0' : j === mt.ticks.length - 1 ? '-100%' : '-50%'})`,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="legend">
        {view === 'weighted' ? (
          <>
            <span><span className="sw" style={{ background: '#02364B' }} />Cost burden</span>
            <span><span className="sw" style={{ background: '#1C7C8C' }} />Travel time burden</span>
            <span><span className="sw" style={{ background: '#3D9A6B' }} />CO₂e burden</span>
          </>
        ) : (
          <>
            <span><span className="sw" style={{ background: '#1C7C8C' }} />Fits both limits</span>
            <span><span className="sw" style={{ background: '#9DBFC2' }} />Outside limits (another metric)</span>
            <span><span className="sw stripes" />Over this limit</span>
            <span><span className="sw" style={{ background: '#02364B' }} />Selected</span>
            <span><span className="dash" />Your limit</span>
          </>
        )}
      </div>
    </section>
  );
}