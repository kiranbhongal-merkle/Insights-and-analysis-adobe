import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, LabelList,
} from 'recharts';
import { CHART_COLORS, fmtUSD, fmtNum, fmtPct } from '../utils/helpers';

const TIP_STYLE = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, boxShadow: 'var(--shadow)', fontSize: 12,
};

const AXIS_TICK = { fontSize: 10, fill: 'var(--text2)' };
const AXIS_TICK_SM = { fontSize: 11, fill: 'var(--text2)' };

function truncateLabel(text, maxLen) {
  const s = String(text ?? '');
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

/** Break long path-style labels across lines at natural separators. */
export function wrapCategoryLabel(text, maxLen = 34) {
  const s = String(text ?? '');
  if (s.length <= maxLen) return [s];
  const lines = [];
  let rest = s;
  while (rest.length > maxLen) {
    let breakAt = -1;
    for (let i = Math.min(maxLen, rest.length - 1); i > Math.floor(maxLen * 0.45); i -= 1) {
      if ('/:-_'.includes(rest[i])) {
        breakAt = i + 1;
        break;
      }
    }
    if (breakAt <= 0) breakAt = maxLen;
    lines.push(rest.slice(0, breakAt));
    rest = rest.slice(breakAt);
  }
  if (rest) lines.push(rest);
  return lines.length ? lines : [s];
}

function wrappedLabelLineCounts(data, yKey, maxLen) {
  return (data || []).map(row => wrapCategoryLabel(row[yKey], maxLen).length);
}

/** Y-axis tick that truncates long labels but keeps the full value in SVG title tooltip. */
function CategoryYAxisTick({ x, y, payload, maxChars = 42 }) {
  const full = String(payload?.value ?? '');
  const shown = truncateLabel(full, maxChars);
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="var(--text2)"
        fontSize={11}
      >
        {shown}
      </text>
    </g>
  );
}

/** Multi-line Y-axis tick — labels left-aligned in the category column, full text wrapped. */
function WrappedCategoryYAxisTick({ x, y, payload, charsPerLine = 34, labelWidth = 280 }) {
  const full = String(payload?.value ?? '');
  const lines = wrapCategoryLabel(full, charsPerLine);
  const lineHeight = 14;
  const blockTop = -((lines.length - 1) * lineHeight) / 2;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      {lines.map((line, i) => (
        <text
          key={`${i}-${line.slice(0, 8)}`}
          x={-(labelWidth - 4)}
          y={blockTop + i * lineHeight}
          dy={4}
          textAnchor="start"
          fill="var(--text2)"
          fontSize={11}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function categoryAxisWidth(data, key, { min = 120, max = 220 } = {}) {
  const longest = (data || []).reduce(
    (m, row) => Math.max(m, String(row[key] ?? row.dim ?? row.label ?? '').length),
    0,
  );
  return Math.min(max, Math.max(min, longest * 6.5 + 24));
}

function numericAxisWidth(data, key, formatter = fmtNum) {
  const maxVal = (data || []).reduce((m, row) => Math.max(m, Number(row[key]) || 0), 0);
  const sample = formatter(maxVal);
  return Math.min(80, Math.max(48, String(sample).length * 8 + 16));
}

function valueLabelMargin(data, key, formatter = fmtNum) {
  const maxVal = (data || []).reduce((m, row) => Math.max(m, Number(row[key]) || 0), 0);
  const sample = formatter(maxVal);
  return Math.min(88, Math.max(56, String(sample).length * 7 + 24));
}

function vBarBottomMargin(data, xKey) {
  const longest = (data || []).reduce(
    (m, row) => Math.max(m, String(row[xKey] ?? row.dim ?? '').length),
    0,
  );
  if (longest <= 5) return 32;
  return Math.min(88, Math.max(32, longest * 3.2));
}

export function sharedNumericAxisWidth(entries) {
  return entries.reduce(
    (max, { data, key, formatter }) => Math.max(max, numericAxisWidth(data, key, formatter)),
    48,
  );
}

export function sharedCategoryAxisWidth(entries, { max = 220 } = {}) {
  return entries.reduce(
    (widest, { data, key }) => Math.max(widest, categoryAxisWidth(data, key, { max })),
    120,
  );
}

function spreadPercentDomain(data, key) {
  const vals = (data || []).map(r => Number(r[key])).filter(v => Number.isFinite(v));
  if (!vals.length) return [0, 100];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const spread = max - min;
  if (spread < 1.5) {
    return [Math.max(0, Math.floor(min - 2)), Math.min(100, Math.ceil(max + 0.5))];
  }
  const pad = spread * 0.12;
  return [Math.max(0, min - pad), Math.min(100, max + pad)];
}

export { spreadPercentDomain };

export function KPITrendChart({ data, height = 260 }) {
  const yLeft = numericAxisWidth(data, 'visits', fmtNum);
  const yRight = 48;
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: yRight, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis yAxisId="left" width={yLeft} tickFormatter={v => fmtNum(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={4} />
          <YAxis yAxisId="right" orientation="right" width={yRight} tickFormatter={v => `${v}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={4} />
          <Tooltip contentStyle={TIP_STYLE} formatter={(v, n) => (n === 'Conv Rate %' ? fmtPct(v) : fmtNum(v))} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
          <Bar yAxisId="left" dataKey="visits" name="Visits" fill="#3266ad" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" dataKey="conv_rate" name="Conv Rate %" stroke="#e8913a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data, height = 200 }) {
  const yWidth = numericAxisWidth(data, 'revenue', fmtUSD);
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3266ad" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3266ad" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={yWidth} tickFormatter={v => fmtUSD(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={4} />
          <Tooltip contentStyle={TIP_STYLE} formatter={v => [fmtUSD(v), 'Revenue']} />
          <Area dataKey="revenue" stroke="#3266ad" strokeWidth={2} fill="url(#revGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({
  data, xKey, yKey, colorFn, height = 300, formatX = fmtNum,
  onBarClick, yAxisWidth: yAxisWidthOverride, categoryMax = 220,
  labelMaxChars, wrapYLabels = false, categoryWidth = 280, charsPerLine = 34,
}) {
  const lineCounts = wrapYLabels ? wrappedLabelLineCounts(data, yKey, charsPerLine) : null;
  const maxLines = lineCounts ? Math.max(1, ...lineCounts) : 1;
  const rowPitch = wrapYLabels ? 22 + maxLines * 14 : 38;
  const h = Math.max(height, data.length * rowPitch + 60);
  const yWidth = wrapYLabels
    ? categoryWidth
    : (yAxisWidthOverride ?? categoryAxisWidth(data, yKey, { min: 48, max: categoryMax }));
  const maxChars = labelMaxChars ?? Math.max(18, Math.floor((yWidth - 16) / 6.5));
  const rightMargin = valueLabelMargin(data, xKey, formatX);
  const handleBarClick = onBarClick
    ? (_, index) => {
        const row = data[index];
        if (row) onBarClick(row[yKey] ?? row.dim ?? row.label, row);
      }
    : undefined;

  const tick = wrapYLabels
    ? <WrappedCategoryYAxisTick charsPerLine={charsPerLine} labelWidth={yWidth} />
    : <CategoryYAxisTick maxChars={maxChars} />;

  return (
    <div
      className={`chart-wrap${onBarClick ? ' chart-wrap--clickable' : ''}${wrapYLabels ? ' chart-wrap--hbar-left' : ''}`}
      style={{ height: h }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, left: wrapYLabels ? 0 : 8, right: rightMargin, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickFormatter={formatX}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            domain={[0, (dataMax) => (dataMax > 0 ? dataMax * 1.12 : 1)]}
          />
          <YAxis
            type="category"
            dataKey={yKey}
            width={yWidth}
            tickLine={false}
            axisLine={false}
            tickMargin={wrapYLabels ? 4 : 10}
            interval={0}
            tick={tick}
          />
          <Tooltip contentStyle={TIP_STYLE} formatter={v => formatX(v)} />
          <Bar
            dataKey={xKey}
            radius={[0, 3, 3, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={handleBarClick}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={colorFn ? colorFn(d) : CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.8} />
            ))}
            <LabelList
              dataKey={xKey}
              position="right"
              offset={10}
              formatter={formatX}
              style={{ fontSize: 10, fontWeight: 600, fill: 'var(--text2)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VBarChart({
  data, bars, height = 260, xKey = 'dim', onBarClick, yTickFormatter,
  yAxisWidth: yAxisWidthOverride, hideLegend, yDomain,
}) {
  const tickFmt = yTickFormatter ?? fmtNum;
  const primaryKey = bars[0]?.key;
  const yWidth = yAxisWidthOverride ?? numericAxisWidth(data, primaryKey, tickFmt);
  const bottom = vBarBottomMargin(data, xKey);
  const longestLabel = (data || []).reduce(
    (m, row) => Math.max(m, String(row[xKey] ?? row.dim ?? '').length),
    0,
  );
  const xAngle = longestLabel <= 5 ? 0 : -28;
  const xAnchor = longestLabel <= 5 ? 'middle' : 'end';
  const showLegend = hideLegend != null ? !hideLegend : bars.length > 1;
  const computedYDomain = yDomain ?? [0, (dataMax) => (dataMax > 0 ? dataMax * 1.12 : 1)];
  const handleBarClick = onBarClick
    ? (_, index) => {
        const row = data[index];
        if (row) onBarClick(row[xKey] ?? row.dim, row);
      }
    : undefined;

  return (
    <div className={`chart-wrap${onBarClick ? ' chart-wrap--clickable' : ''}`} style={{ height: height + bottom - 20 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: showLegend ? 20 : 12, left: 8, right: 12, bottom }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            angle={xAngle}
            textAnchor={xAnchor}
            height={bottom}
            interval={0}
            tickMargin={8}
          />
          <YAxis
            width={yWidth}
            tickFormatter={tickFmt}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            domain={computedYDomain}
          />
          <Tooltip contentStyle={TIP_STYLE} formatter={tickFmt} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} verticalAlign="top" />}
          {bars.map(b => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={b.color}
              radius={[3, 3, 0, 0]}
              fillOpacity={0.8}
              cursor={onBarClick ? 'pointer' : undefined}
              onClick={handleBarClick}
            >
              <LabelList
                dataKey={b.key}
                position="top"
                offset={8}
                formatter={tickFmt}
                style={{ fontSize: 9, fontWeight: 600, fill: 'var(--text2)' }}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, nameKey, valueKey, height = 300, formatValue = fmtNum }) {
  const total = (data || []).reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  const sliceCount = data?.length || 0;
  const useSideLegend = sliceCount > 3;
  const chartHeight = useSideLegend ? Math.max(height, 120 + sliceCount * 24) : Math.max(height, 260);

  return (
    <div className="chart-wrap chart-wrap--donut" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: useSideLegend ? 8 : 12, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx={useSideLegend ? '36%' : '50%'}
            cy="50%"
            innerRadius={useSideLegend ? '42%' : '48%'}
            outerRadius={useSideLegend ? '62%' : '68%'}
            paddingAngle={2}
            label={useSideLegend ? false : ({ percent }) => (percent >= 0.04 ? `${(percent * 100).toFixed(1)}%` : '')}
            labelLine={!useSideLegend}
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={TIP_STYLE}
            formatter={(v, name) => {
              const pct = total > 0 ? ((Number(v) / total) * 100).toFixed(1) : '0.0';
              return [`${formatValue(v)} (${pct}%)`, name];
            }}
          />
          <Legend
            layout={useSideLegend ? 'vertical' : 'horizontal'}
            verticalAlign={useSideLegend ? 'middle' : 'bottom'}
            align={useSideLegend ? 'right' : 'center'}
            wrapperStyle={{
              fontSize: 11,
              lineHeight: '1.45',
              paddingTop: useSideLegend ? 0 : 10,
              maxWidth: useSideLegend ? '52%' : '100%',
            }}
            formatter={(value, entry) => {
              const val = entry?.payload?.[valueKey] ?? 0;
              const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0.0';
              return `${value} · ${formatValue(val)} (${pct}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiLineChart({ data, lines, xKey = 'date', height = 240 }) {
  const yWidth = numericAxisWidth(data, lines[0]?.key, fmtNum);
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={yWidth} tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={4} />
          <Tooltip contentStyle={TIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
          {lines.map(l => (
            <Line key={l.key} dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
