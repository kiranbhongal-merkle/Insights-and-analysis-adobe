// ============================================================
// PowerPoint export.
//
// Builds a polished .pptx deck from the live report model:
//   • Cover + contents
//   • A section divider for each themed group
//   • Per analysis: a "Performance" slide (KPIs, chart, table)
//     and an "Insights" slide (readable insight cards beside a
//     supporting chart)
//   • Closing slide
// Mirrors what the user sees on the web app (same date-filtered
// data + auto-generated insights).
// ============================================================

import { getReportSections, getReportMeta } from './reportModel';

// pptxgenjs ships a Node `node:fs` import that webpack (CRA) cannot bundle,
// so we load the self-contained browser bundle from /public at runtime
// instead of importing it through the build.
const PPTX_BUNDLE_URL = `${process.env.PUBLIC_URL || ''}/vendor/pptxgen.bundle.js`;
let pptxLoaderPromise = null;

function loadPptxGen() {
  if (typeof window !== 'undefined' && window.PptxGenJS) {
    return Promise.resolve(window.PptxGenJS);
  }
  if (pptxLoaderPromise) return pptxLoaderPromise;

  pptxLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PPTX_BUNDLE_URL;
    script.async = true;
    script.onload = () => {
      const lib = window.PptxGenJS || window.pptxgen;
      if (lib) resolve(lib);
      else reject(new Error('PptxGenJS failed to initialise.'));
    };
    script.onerror = () => reject(new Error('Could not load the PowerPoint engine.'));
    document.body.appendChild(script);
  });
  return pptxLoaderPromise;
}

// ── Theme ─────────────────────────────────────────────────────
const C = {
  navy: '152455',
  navy2: '23316B',
  primary: '3266AD',
  primaryLt: 'E7EEF8',
  accent: 'E8913A',
  accentLt: 'FBEAD6',
  green: '1F9D57',
  red: 'C0392B',
  amber: 'D17F12',
  ink: '1B2433',
  ink2: '5A6573',
  ink3: '8A94A6',
  page: 'F5F7FB',
  white: 'FFFFFF',
  border: 'DCE3EE',
};

// Multi-colour palette for chart bars / slices.
const PALETTE = ['3266AD', 'E8913A', '1F9D57', 'C0392B', '8E44AD', '16A085', 'D35400', '2980B9', 'F39C12', '7F8C8D'];

const CARD_SHADOW = { type: 'outer', color: '9AA7BD', blur: 6, offset: 2, angle: 90, opacity: 0.35 };

const SW = 13.33; // slide width
const MX = 0.5;   // x margin
const CW = SW - MX * 2; // content width

const toneMeta = (ins) => {
  const t = ins.tone || ins.severity || 'blue';
  switch (t) {
    case 'green': return { color: C.green, label: 'STRENGTH' };
    case 'red': return { color: C.red, label: 'ACTION' };
    case 'amber': return { color: C.amber, label: 'WATCH' };
    default: return { color: C.primary, label: 'INSIGHT' };
  }
};

const FONT = 'Segoe UI';

// ── Shared chrome ─────────────────────────────────────────────
function contentBg(slide, pptx) {
  slide.background = { color: C.page };
  // top header band
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 1.0, fill: { color: C.navy } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.0, w: SW, h: 0.06, fill: { color: C.accent } });
}

function header(slide, pptx, { eyebrow, title, meta, pageNo }) {
  slide.addShape(pptx.ShapeType.roundRect, { x: MX, y: 0.26, w: 0.14, h: 0.5, rectRadius: 0.05, fill: { color: C.accent } });
  if (eyebrow) {
    slide.addText(eyebrow.toUpperCase(), {
      x: MX + 0.26, y: 0.18, w: 8, h: 0.24, fontSize: 9, bold: true, charSpacing: 2,
      color: 'A9B7D6', fontFace: FONT,
    });
  }
  slide.addText(title, {
    x: MX + 0.26, y: 0.4, w: 9.5, h: 0.5, fontSize: 22, bold: true, color: C.white, fontFace: FONT, valign: 'middle',
  });
  if (meta) {
    slide.addText(meta.periodLabel, {
      x: SW - 4.3, y: 0.2, w: 3.8, h: 0.6, fontSize: 11, color: 'C7D2E8',
      align: 'right', valign: 'middle', fontFace: FONT,
    });
  }
  if (pageNo) {
    slide.addText(String(pageNo).padStart(2, '0'), {
      x: SW - 1.1, y: 7.0, w: 0.7, h: 0.3, fontSize: 9, color: C.ink3, align: 'right', fontFace: FONT,
    });
    slide.addText('Samsung Analytics Insights', {
      x: MX, y: 7.0, w: 6, h: 0.3, fontSize: 9, color: C.ink3, fontFace: FONT,
    });
  }
}

// ── KPI strip ─────────────────────────────────────────────────
function kpiStrip(slide, pptx, kpis, y) {
  if (!kpis || !kpis.length) return y;
  const gap = 0.18;
  const w = (CW - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach((k, i) => {
    const x = MX + i * (w + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w, h: 1.0, rectRadius: 0.07, fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: CARD_SHADOW,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.14, y: y + 0.18, w: 0.1, h: 0.64, rectRadius: 0.04, fill: { color: PALETTE[i % PALETTE.length] },
    });
    slide.addText(k.label.toUpperCase(), {
      x: x + 0.34, y: y + 0.16, w: w - 0.45, h: 0.26, fontSize: 8, bold: true, charSpacing: 1, color: C.ink3, fontFace: FONT,
    });
    slide.addText(String(k.value), {
      x: x + 0.34, y: y + 0.42, w: w - 0.45, h: 0.46, fontSize: 18, bold: true, color: C.navy, fontFace: FONT,
    });
  });
  return y + 1.0;
}

// ── Charts ────────────────────────────────────────────────────
function chartCard(slide, pptx, title, x, y, w, h) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.07, fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: CARD_SHADOW,
  });
  if (title) {
    slide.addText(title, {
      x: x + 0.22, y: y + 0.14, w: w - 0.44, h: 0.32, fontSize: 12, bold: true, color: C.navy, fontFace: FONT,
    });
  }
}

function drawChart(slide, pptx, chart, box) {
  if (!chart || !chart.labels || !chart.labels.length) return;
  const { x, y, w, h } = box;
  chartCard(slide, pptx, chart.title, x, y, w, h);

  const isDoughnut = chart.type === 'doughnut';
  const isArea = chart.type === 'area';
  const isHorizontal = chart.barDir === 'bar';
  const max = isDoughnut ? 8 : isHorizontal ? 8 : 12;
  const labels = chart.labels.slice(0, max);
  const values = chart.values.slice(0, max);

  const px = x + 0.22;
  const py = y + 0.6;
  const pw = w - 0.44;
  const ph = h - 0.8;

  if (isDoughnut) {
    slide.addChart(pptx.ChartType.doughnut, [{ name: chart.title, labels, values }], {
      x: px, y: py, w: pw, h: ph,
      chartColors: PALETTE,
      holeSize: 58,
      showLegend: true, legendPos: 'r', legendFontSize: 9, legendColor: C.ink2, legendFontFace: FONT,
      showTitle: false,
      showValue: false, showPercent: true,
      dataLabelColor: C.white, dataLabelFontSize: 9, dataLabelFontBold: true, dataLabelFontFace: FONT,
    });
    return;
  }

  if (isArea) {
    slide.addChart(pptx.ChartType.area, [{ name: chart.title, labels, values }], {
      x: px, y: py, w: pw, h: ph,
      chartColors: [C.primary], chartColorsOpacity: 35,
      lineSmooth: true, lineSize: 2,
      showLegend: false, showTitle: false, showValue: false,
      catAxisLabelColor: C.ink2, catAxisLabelFontSize: 8, catAxisLabelFontFace: FONT, catAxisLineShow: false,
      valAxisLabelColor: C.ink3, valAxisLabelFontSize: 8, valAxisLineShow: false,
      valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    });
    return;
  }

  slide.addChart(pptx.ChartType.bar, [{ name: chart.title, labels, values }], {
    x: px, y: py, w: pw, h: ph,
    barDir: isHorizontal ? 'bar' : 'col',
    chartColors: PALETTE,
    barGapWidthPct: 45,
    showLegend: false, showTitle: false,
    showValue: true,
    dataLabelFormatCode: chart.fmtCode,
    dataLabelPosition: 'outEnd',
    dataLabelColor: C.ink, dataLabelFontSize: 8.5, dataLabelFontBold: true, dataLabelFontFace: FONT,
    catAxisLabelColor: C.ink2, catAxisLabelFontSize: 8.5, catAxisLabelFontFace: FONT, catAxisLineShow: false,
    valAxisHidden: true, valGridLine: { style: 'none' }, valAxisLineShow: false,
    catGridLine: { style: 'none' },
  });
}

// ── Data table ────────────────────────────────────────────────
function dataTable(slide, pptx, table, x, y, w, h) {
  if (!table || !table.rows || !table.rows.length) return;
  chartCard(slide, pptx, table.title, x, y, w, h);

  const headerRow = table.columns.map((c, ci) => ({
    text: c,
    options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 8.5, align: ci === 0 ? 'left' : 'right' },
  }));

  const maxRows = Math.max(4, Math.min(12, Math.floor((h - 0.85) / 0.27)));
  const bodyRows = table.rows.slice(0, maxRows).map((row, ri) =>
    row.map((cell, ci) => ({
      text: String(cell),
      options: {
        fontSize: 8, color: C.ink, align: ci === 0 ? 'left' : 'right',
        fill: { color: ri % 2 === 0 ? C.white : C.primaryLt },
      },
    })),
  );

  slide.addTable([headerRow, ...bodyRows], {
    x: x + 0.18, y: y + 0.6, w: w - 0.36, h: h - 0.78,
    border: { type: 'solid', color: C.border, pt: 0.5 },
    fontFace: FONT, valign: 'middle', autoPage: false,
  });
}

// ── Insight cards (readable, stacked) ─────────────────────────
function insightCards(slide, pptx, insights, x, y, w, h) {
  const top = (insights || []).slice(0, 4);
  if (!top.length) {
    slide.addText('No notable insights for the selected period.', {
      x, y: y + 0.2, w, h: 0.4, fontSize: 11, italic: true, color: C.ink2, fontFace: FONT,
    });
    return;
  }
  const gap = 0.18;
  const ch = (h - gap * (top.length - 1)) / top.length;
  top.forEach((ins, i) => {
    const cy = y + i * (ch + gap);
    const { color, label } = toneMeta(ins);
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: cy, w, h: ch, rectRadius: 0.06, fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: CARD_SHADOW,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.02, y: cy + 0.02, w: 0.12, h: ch - 0.04, rectRadius: 0.05, fill: { color } });
    slide.addText(
      [
        { text: `${(ins.tag || label).toUpperCase()}\n`, options: { color, bold: true, fontSize: 8, charSpacing: 1 } },
        { text: `${ins.title}\n`, options: { color: C.navy, bold: true, fontSize: 11.5 } },
        { text: ins.body, options: { color: C.ink2, fontSize: 9.5 } },
      ],
      { x: x + 0.32, y: cy + 0.12, w: w - 0.5, h: ch - 0.24, valign: 'top', fontFace: FONT, lineSpacingMultiple: 1.02 },
    );
  });
}

// ── Slides ────────────────────────────────────────────────────
function coverSlide(pptx, meta) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  // decorative shapes
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.7, y: -1.6, w: 5.2, h: 5.2, fill: { color: C.navy2 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 11.2, y: 3.4, w: 3.6, h: 3.6, fill: { color: C.primary } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 10.4, y: 5.6, w: 1.6, h: 1.6, fill: { color: C.accent } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent } });

  slide.addShape(pptx.ShapeType.roundRect, { x: MX + 0.2, y: 1.5, w: 0.95, h: 0.95, rectRadius: 0.12, fill: { color: C.primary } });
  slide.addText('S', { x: MX + 0.2, y: 1.5, w: 0.95, h: 0.95, fontSize: 44, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT });

  slide.addText('ANALYTICS INSIGHTS REPORT', {
    x: MX + 0.2, y: 2.95, w: 9, h: 0.35, fontSize: 13, bold: true, charSpacing: 3, color: C.accent, fontFace: FONT,
  });
  slide.addText(meta.title, {
    x: MX + 0.18, y: 3.35, w: 9.2, h: 1.6, fontSize: 46, bold: true, color: C.white, fontFace: FONT, lineSpacingMultiple: 0.95,
  });

  // period pill
  slide.addShape(pptx.ShapeType.roundRect, { x: MX + 0.22, y: 5.2, w: 4.4, h: 0.55, rectRadius: 0.27, fill: { color: C.navy2 }, line: { color: C.primary, width: 1 } });
  slide.addText(`Reporting period:  ${meta.periodLabel}`, {
    x: MX + 0.22, y: 5.2, w: 4.4, h: 0.55, fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FONT,
  });

  slide.addText(
    `Generated ${meta.generatedAt.toLocaleDateString()} · ${meta.generatedAt.toLocaleTimeString()}`,
    { x: MX + 0.2, y: 6.85, w: 9, h: 0.35, fontSize: 10, color: '8FA0C0', fontFace: FONT },
  );
}

function contentsSlide(pptx, groups, meta) {
  const slide = pptx.addSlide();
  contentBg(slide, pptx);
  header(slide, pptx, { eyebrow: 'Overview', title: 'Contents', meta });

  const gap = 0.3;
  const w = (CW - gap * (groups.length - 1)) / groups.length;
  groups.forEach((g, i) => {
    const x = MX + i * (w + gap);
    const y = 1.7;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w, h: 4.9, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: CARD_SHADOW,
    });
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.12, rectRadius: 0.05, fill: { color: PALETTE[i] } });
    slide.addText(g.num, { x: x + 0.25, y: y + 0.35, w: w - 0.5, h: 1.0, fontSize: 48, bold: true, color: C.primaryLt, fontFace: FONT });
    slide.addText(g.title, { x: x + 0.28, y: y + 1.35, w: w - 0.55, h: 0.5, fontSize: 17, bold: true, color: C.navy, fontFace: FONT });
    slide.addText(g.desc, { x: x + 0.28, y: y + 1.85, w: w - 0.55, h: 0.6, fontSize: 10, color: C.ink2, fontFace: FONT });
    const items = g.sections.map(s => ({ text: s.title, options: { fontSize: 11, color: C.ink, bullet: { code: '2022', indent: 14 }, paraSpaceAfter: 6 } }));
    slide.addText(items, { x: x + 0.28, y: y + 2.6, w: w - 0.55, h: 2.0, valign: 'top', fontFace: FONT });
  });
}

function dividerSlide(pptx, group) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.ellipse, { x: 10.2, y: -1.4, w: 5.4, h: 5.4, fill: { color: C.navy2 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 11.6, y: 4.2, w: 2.6, h: 2.6, fill: { color: C.accent } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: C.accent } });

  slide.addText(group.num, { x: MX + 0.2, y: 1.7, w: 4, h: 1.7, fontSize: 96, bold: true, color: C.primary, fontFace: FONT });
  slide.addText(group.title, { x: MX + 0.22, y: 3.5, w: 11, h: 0.9, fontSize: 40, bold: true, color: C.white, fontFace: FONT });
  slide.addShape(pptx.ShapeType.rect, { x: MX + 0.25, y: 4.5, w: 1.8, h: 0.06, fill: { color: C.accent } });
  slide.addText(group.desc, { x: MX + 0.25, y: 4.7, w: 10, h: 0.6, fontSize: 15, color: 'C7D2E8', fontFace: FONT });
  slide.addText(
    group.sections.map(s => ({ text: s.title, options: { fontSize: 12, color: 'A9B7D6', bullet: { code: '2022', indent: 14 }, paraSpaceAfter: 4 } })),
    { x: MX + 0.25, y: 5.5, w: 9, h: 1.5, valign: 'top', fontFace: FONT },
  );
}

function performanceSlide(pptx, section, meta, pageNo) {
  const slide = pptx.addSlide();
  contentBg(slide, pptx);
  header(slide, pptx, { eyebrow: section.title, title: `${section.title} — Performance`, meta, pageNo });

  let y = kpiStrip(slide, pptx, section.kpis, 1.3);
  const top = y + 0.35;
  const h = 7.0 - top - 0.15;
  drawChart(slide, pptx, section.chart, { x: MX, y: top, w: 6.7, h });
  dataTable(slide, pptx, section.table, MX + 6.95, top, CW - 6.95, h);
}

function insightsSlide(pptx, section, meta, pageNo) {
  const slide = pptx.addSlide();
  contentBg(slide, pptx);
  header(slide, pptx, { eyebrow: section.title, title: `${section.title} — Key insights`, meta, pageNo });

  const top = 1.4;
  const h = 7.0 - top - 0.15;
  const supporting = section.chart2 || section.chart;
  drawChart(slide, pptx, supporting, { x: MX, y: top, w: 5.9, h });
  insightCards(slide, pptx, section.insights, MX + 6.15, top, CW - 6.15, h);
}

function closingSlide(pptx, meta) {
  const slide = pptx.addSlide();
  slide.background = { color: C.navy };
  slide.addShape(pptx.ShapeType.ellipse, { x: -1.6, y: 4.4, w: 5, h: 5, fill: { color: C.navy2 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 11.0, y: -1.4, w: 4, h: 4, fill: { color: C.primary } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 3.55, w: SW, h: 0.06, fill: { color: C.accent } });
  slide.addText('Thank you', { x: 0, y: 2.5, w: SW, h: 1, fontSize: 46, bold: true, color: C.white, align: 'center', fontFace: FONT });
  slide.addText('Samsung Analytics Insights  ·  Auto-generated report', {
    x: 0, y: 3.7, w: SW, h: 0.5, fontSize: 14, color: 'C7D2E8', align: 'center', fontFace: FONT,
  });
  slide.addText(`Reporting period: ${meta.periodLabel}`, {
    x: 0, y: 4.2, w: SW, h: 0.4, fontSize: 11, color: '8FA0C0', align: 'center', fontFace: FONT,
  });
}

// ── Orchestration ─────────────────────────────────────────────
const GROUP_DEFS = [
  { num: '01', title: 'Performance', desc: 'Traffic, conversion and funnel health at a glance.', ids: ['overview', 'funnel'] },
  { num: '02', title: 'Audience', desc: 'Who is visiting and how different segments convert.', ids: ['device', 'country', 'usertype', 'browser'] },
  { num: '03', title: 'Channels & Leakage', desc: 'Where revenue closes and where sessions are lost.', ids: ['lasttouch', 'exits'] },
];

/**
 * Build and download the PowerPoint deck.
 * @param {{from:string,to:string}} dateRange
 */
export async function exportPptx(dateRange) {
  const PptxGenJS = await loadPptxGen();
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.author = 'Samsung Analytics';
  pptx.company = 'Samsung';

  const meta = getReportMeta(dateRange);
  pptx.title = meta.title;

  const sections = getReportSections();
  const byId = Object.fromEntries(sections.map(s => [s.id, s]));
  const groups = GROUP_DEFS
    .map(g => ({ ...g, sections: g.ids.map(id => byId[id]).filter(Boolean) }))
    .filter(g => g.sections.length);

  coverSlide(pptx, meta);
  contentsSlide(pptx, groups, meta);

  let pageNo = 1;
  for (const group of groups) {
    dividerSlide(pptx, group);
    for (const section of group.sections) {
      performanceSlide(pptx, section, meta, pageNo++);
      insightsSlide(pptx, section, meta, pageNo++);
    }
  }

  closingSlide(pptx, meta);

  const stamp = meta.generatedAt.toISOString().slice(0, 10);
  await pptx.writeFile({ fileName: `Samsung-Analytics-Insights-${stamp}.pptx` });
}
