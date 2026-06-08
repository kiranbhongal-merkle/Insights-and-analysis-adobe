import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, LabelList,
} from 'recharts';
import { CHART_COLORS, fmtUSD, fmtNum, fmtPct } from '../utils/helpers';

// ── Tooltip styles ───────────────────────────────────────────
const TIP_STYLE = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, boxShadow: 'var(--shadow)', fontSize: 12,
};

export function KPITrendChart({ data, height = 260 }) {
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tickFormatter={v => fmtNum(v)} tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={v => v + '%'} tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TIP_STYLE} formatter={(v, n) => n === 'Conv Rate %' ? fmtPct(v) : fmtNum(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="visits" name="Visits" fill="#3266ad" fillOpacity={0.7} radius={[3,3,0,0]} />
          <Line yAxisId="right" dataKey="conv_rate" name="Conv Rate %" stroke="#e8913a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data, height = 200 }) {
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3266ad" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3266ad" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={v => fmtUSD(v)} tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TIP_STYLE} formatter={v => [fmtUSD(v), 'Revenue']} />
          <Area dataKey="revenue" stroke="#3266ad" strokeWidth={2} fill="url(#revGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, xKey, yKey, colorFn, height = 300, formatX = fmtNum, onBarClick }) {
  const h = Math.max(height, data.length * 38 + 60);
  const handleBarClick = onBarClick
    ? (_, index) => {
        const row = data[index];
        if (row) onBarClick(row[yKey] ?? row.dim ?? row.label, row);
      }
    : undefined;

  return (
    <div className={`chart-wrap${onBarClick ? ' chart-wrap--clickable' : ''}`} style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 56 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tickFormatter={formatX} tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} domain={[0, (dataMax) => (dataMax > 0 ? dataMax * 1.18 : 1)]} />
          <YAxis type="category" dataKey={yKey} width={160} tick={{ fontSize: 11, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
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
              formatter={formatX}
              style={{ fontSize: 10, fontWeight: 600, fill: 'var(--text2)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VBarChart({ data, bars, height = 260, xKey = 'dim', onBarClick, yTickFormatter }) {
  const tickFmt = yTickFormatter ?? fmtNum;
  const handleBarClick = onBarClick
    ? (_, index) => {
        const row = data[index];
        if (row) onBarClick(row[xKey] ?? row.dim, row);
      }
    : undefined;

  return (
    <div className={`chart-wrap${onBarClick ? ' chart-wrap--clickable' : ''}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" />
          <YAxis tickFormatter={tickFmt} tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} domain={[0, (dataMax) => (dataMax > 0 ? dataMax * 1.15 : 1)]} />
          <Tooltip contentStyle={TIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
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

export function DonutChart({ data, nameKey, valueKey, height = 220 }) {
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%"
            innerRadius="55%" outerRadius="80%" paddingAngle={3}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TIP_STYLE} formatter={v => fmtNum(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiLineChart({ data, lines, xKey = 'date', height = 240 }) {
  return (
    <div className="chart-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text2)' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {lines.map(l => (
            <Line key={l.key} dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
