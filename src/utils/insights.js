// ============================================================
// Data-driven insight generators.
//
// Every function takes the *currently active* (date-filtered)
// dataset and derives a small set of plain-language findings.
// Because pages read these from SAMPLE_DATA / the overview
// summary at render time, the insights automatically refilter
// whenever the top-bar date range changes.
//
// Each insight: { tone: 'green'|'red'|'amber'|'blue', tag, title, body }
// ============================================================

import { fmtNum, fmtUSD, fmtPct } from './helpers';

const round = (v) => Math.round(v * 100) / 100;
const pctShare = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');

/**
 * Generic insights for "conversion row" datasets that share the
 * shape { dim, visits, conv, rate, rev }. Used by country, browser,
 * last-touch and user-type pages.
 */
export function buildSegmentInsights(rows, opts = {}) {
  const { dimKey = 'dim', noun = 'segment', nounPlural = 'segments', hasRevenue = true } = opts;

  const items = (rows || [])
    .filter((r) => r && r[dimKey] != null)
    .map((r) => {
      const visits = Number(r.visits) || 0;
      const conv = Number(r.conv ?? r.conversions ?? r.purch) || 0;
      return {
        name: String(r[dimKey]),
        visits,
        conv,
        rev: Number(r.rev ?? r.revenue) || 0,
        rate: r.rate != null ? Number(r.rate) : visits > 0 ? (conv / visits) * 100 : 0,
      };
    });
  if (!items.length) return [];

  const totVisits = items.reduce((s, x) => s + x.visits, 0);
  const totRev = items.reduce((s, x) => s + x.rev, 0);
  const totConv = items.reduce((s, x) => s + x.conv, 0);
  const avgRate = totVisits ? (totConv / totVisits) * 100 : 0;
  const minVisits = totVisits * 0.03;

  const used = new Set();
  const pick = (arr) => arr.find((x) => !used.has(x.name)) || arr[0];
  const insights = [];

  if (hasRevenue && totRev > 0) {
    const top = pick([...items].sort((a, b) => b.rev - a.rev));
    used.add(top.name);
    insights.push({
      tone: 'green',
      tag: 'top revenue',
      title: `${top.name} leads revenue`,
      body: `${fmtUSD(top.rev)} — ${pctShare(top.rev, totRev)} of all ${noun} revenue.`,
    });
  }

  const eligible = items.filter((x) => x.visits >= minVisits && x.conv > 0);
  if (eligible.length) {
    const best = pick([...eligible].sort((a, b) => b.rate - a.rate));
    used.add(best.name);
    const mult = avgRate > 0 ? best.rate / avgRate : null;
    insights.push({
      tone: 'green',
      tag: 'best converter',
      title: `${best.name} converts best`,
      body: `${fmtPct(best.rate)} on ${fmtNum(best.visits)} visits${
        mult ? ` — ${mult.toFixed(1)}× the ${fmtPct(round(avgRate))} ${noun} average` : ''
      }.`,
    });
  }

  const laggards = items.filter((x) => x.visits >= minVisits && x.rate < avgRate);
  if (laggards.length) {
    const worst = pick(
      [...laggards].sort(
        (a, b) => b.visits * (avgRate - b.rate) - a.visits * (avgRate - a.rate)
      )
    );
    used.add(worst.name);
    const lost = Math.round((worst.visits * (avgRate - worst.rate)) / 100);
    insights.push({
      tone: 'red',
      tag: 'opportunity',
      title: `${worst.name} underperforms`,
      body: `${fmtNum(worst.visits)} visits at ${fmtPct(worst.rate)} — below the ${fmtPct(
        round(avgRate)
      )} average. Reaching it ≈ ${fmtNum(lost)} more conversions.`,
    });
  }

  const topVisit = [...items].sort((a, b) => b.visits - a.visits)[0];
  const vShare = totVisits ? (topVisit.visits / totVisits) * 100 : 0;
  insights.push({
    tone: vShare >= 50 ? 'amber' : 'blue',
    tag: 'traffic mix',
    title: `${topVisit.name} = ${vShare.toFixed(0)}% of visits`,
    body:
      vShare >= 50
        ? `Traffic concentrates in ${topVisit.name} (${fmtNum(topVisit.visits)} visits) across ${items.length} ${nounPlural} — diversify to reduce risk.`
        : `Largest ${noun} by volume with ${fmtNum(topVisit.visits)} visits across ${items.length} ${nounPlural}.`,
  });

  return insights.slice(0, 4);
}

/** Device page: best converter, worst abandonment, dominant device. */
export function buildDeviceInsights(rows) {
  const items = (rows || []).filter((r) => r && r.dim != null);
  if (!items.length) return [];
  const totV = items.reduce((s, r) => s + (Number(r.visits) || 0), 0);
  const insights = [];

  const best = [...items].sort((a, b) => b.rate - a.rate)[0];
  insights.push({
    tone: 'green',
    tag: 'best converter',
    title: `${best.dim} converts best`,
    body: `${fmtPct(best.rate)} conversion — the strongest purchase environment of all devices.`,
  });

  const worst = [...items]
    .filter((r) => r.visits >= totV * 0.05)
    .sort((a, b) => (b.abandon ?? 0) - (a.abandon ?? 0))[0];
  if (worst && worst.abandon != null) {
    insights.push({
      tone: worst.abandon >= 99.5 ? 'red' : 'amber',
      tag: 'high abandonment',
      title: `${worst.dim} abandons ${fmtPct(worst.abandon)}`,
      body: `${fmtNum(worst.visits)} visits but ${fmtPct(
        worst.abandon
      )} leave without buying — likely checkout UX friction.`,
    });
  }

  const topV = [...items].sort((a, b) => b.visits - a.visits)[0];
  insights.push({
    tone: 'blue',
    tag: 'traffic mix',
    title: `${topV.dim} = ${totV ? Math.round((topV.visits / totV) * 100) : 0}% of visits`,
    body: `Most sessions come from ${topV.dim} (${fmtNum(topV.visits)}). Prioritise its experience.`,
  });

  return insights.slice(0, 4);
}

/** Funnel page: end-to-end completion + worst / best transitions. */
export function buildFunnelInsights(funnel) {
  const steps = funnel || [];
  if (!steps.length) return [];
  const insights = [];
  const start = steps[0]?.visitors || 0;
  const end = steps[steps.length - 1]?.visitors || 0;
  const drops = steps.filter((s) => s.dropoff != null);

  if (start > 0) {
    const comp = (end / start) * 100;
    insights.push({
      tone: comp < 2 ? 'red' : 'amber',
      tag: 'completion',
      title: `${comp.toFixed(2)}% reach purchase`,
      body: `${fmtNum(end)} of ${fmtNum(start)} sessions complete the journey end to end.`,
    });
  }

  if (drops.length) {
    const worst = [...drops].sort((a, b) => b.dropoff - a.dropoff)[0];
    insights.push({
      tone: worst.dropoff > 70 ? 'red' : 'amber',
      tag: worst.dropoff > 70 ? 'urgent' : 'watch',
      title: `Biggest leak: ${worst.step}`,
      body: `${worst.dropoff}% of sessions drop here vs the previous step — the single biggest optimisation opportunity.`,
    });

    const best = [...drops].sort((a, b) => a.dropoff - b.dropoff)[0];
    if (best.step !== worst.step) {
      insights.push({
        tone: 'green',
        tag: 'healthy',
        title: `${best.step} holds well`,
        body: `Only ${best.dropoff}% drop at this step — the smoothest transition in the funnel.`,
      });
    }
  }

  return insights.slice(0, 4);
}

/** Exits page: biggest exit page, highest-rate leakage, count of critical pages. */
export function buildExitsInsights(rows) {
  const items = (rows || []).filter((r) => r && r.label != null);
  if (!items.length) return [];
  const totExits = items.reduce((s, r) => s + (Number(r.exits) || 0), 0);
  const maxPv = Math.max(...items.map((r) => Number(r.pv) || 0));
  const insights = [];

  const top = [...items].sort((a, b) => b.exits - a.exits)[0];
  insights.push({
    tone: 'amber',
    tag: 'top exit',
    title: `${top.label} tops exits`,
    body: `${fmtNum(top.exits)} exits — ${pctShare(top.exits, totExits)} of all tracked exits.`,
  });

  const crit = [...items]
    .filter((r) => r.pv >= maxPv * 0.05)
    .sort((a, b) => b.rate - a.rate)[0];
  if (crit) {
    insights.push({
      tone: crit.rate >= 60 ? 'red' : 'amber',
      tag: crit.rate >= 60 ? 'critical' : 'high rate',
      title: `${crit.label} exits at ${crit.rate}%`,
      body: `${fmtNum(crit.exits)} exits on ${fmtNum(crit.pv)} pageviews — a strong leakage signal.`,
    });
  }

  const criticalCount = items.filter((r) => r.rate >= 60).length;
  if (criticalCount > 0) {
    insights.push({
      tone: 'red',
      tag: 'leakage',
      title: `${criticalCount} page${criticalCount > 1 ? 's' : ''} ≥60% exit rate`,
      body: `These pages lose most of their traffic — fix them first to recover sessions.`,
    });
  }

  return insights.slice(0, 4);
}

/** Overview: cross-dataset headline findings. */
export function buildOverviewInsights(summary, data) {
  const insights = [];
  const d = data || {};

  const drops = (d.funnel || []).filter((f) => f.dropoff != null);
  if (drops.length) {
    const worst = [...drops].sort((a, b) => b.dropoff - a.dropoff)[0];
    insights.push({
      tone: worst.dropoff > 70 ? 'red' : 'amber',
      tag: worst.dropoff > 70 ? 'urgent' : 'watch',
      title: `${worst.step} drop-off: ${worst.dropoff}%`,
      body: `The largest single leak in the funnel — your biggest conversion opportunity.`,
    });
  }

  const ut = d.usertype || [];
  if (ut.length >= 2) {
    const totRev = ut.reduce((s, r) => s + (Number(r.rev) || 0), 0);
    const ret = ut.find((r) => /return/i.test(r.dim));
    const nw = ut.find((r) => /new/i.test(r.dim));
    if (ret && totRev > 0) {
      const share = (ret.rev / totRev) * 100;
      const gap = nw && nw.rate ? ret.rate / nw.rate : null;
      insights.push({
        tone: 'green',
        tag: 'key finding',
        title: `Returning users drive ${share.toFixed(0)}% of revenue`,
        body: gap
          ? `They convert ${gap.toFixed(1)}× better than new users — invest in first-purchase nurture.`
          : `Loyal buyers are your revenue engine — protect and grow them.`,
      });
    }
  }

  const lt = d.lasttouch || [];
  if (lt.length) {
    const totV = lt.reduce((s, r) => s + (Number(r.visits) || 0), 0);
    const totC = lt.reduce((s, r) => s + (Number(r.conv) || 0), 0);
    const avg = totV ? (totC / totV) * 100 : 0;
    const worst = [...lt]
      .filter((r) => r.visits >= totV * 0.05)
      .sort((a, b) => a.rate - b.rate)[0];
    if (worst && worst.rate < avg) {
      insights.push({
        tone: 'red',
        tag: 'investigate',
        title: `${worst.dim} converts at ${fmtPct(worst.rate)}`,
        body: `${fmtNum(worst.visits)} visits but well below the ${fmtPct(
          round(avg)
        )} average — check that journey for friction.`,
      });
    }
  }

  const country = d.country || [];
  if (country.length) {
    const totR = country.reduce((s, r) => s + (Number(r.rev) || 0), 0);
    const top = [...country].sort((a, b) => b.rev - a.rev)[0];
    if (top && totR > 0) {
      insights.push({
        tone: 'blue',
        tag: 'top market',
        title: `${top.dim} leads revenue`,
        body: `${fmtUSD(top.rev)} — ${pctShare(top.rev, totR)} of global revenue.`,
      });
    }
  }

  return insights.slice(0, 4);
}
