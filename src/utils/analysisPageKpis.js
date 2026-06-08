import { fmtNum, fmtUSD } from './helpers';

export const SUMMARY_KPIS = [
  { label: 'Total Visits', key: 'visits', fmt: fmtNum, color: '#3266ad', sub: 'All segments' },
  { label: 'Conversions', key: 'conv', fmt: v => (v == null ? '—' : Number(v).toLocaleString()), color: '#27ae60', sub: 'Completed purchases' },
  { label: 'Conv Rate', key: 'rate', fmt: v => `${v}%`, color: '#e8913a', sub: 'Weighted average' },
  { label: 'Revenue (USD)', key: 'rev', fmt: fmtUSD, color: '#8e44ad', sub: 'USD normalised' },
];
