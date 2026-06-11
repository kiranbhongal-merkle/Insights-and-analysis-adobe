// ============================================================
// PowerPoint export.
//
// Builds a polished .pptx deck from the live report model:
//   • Cover + contents + executive summary
//   • A section divider for each themed group
//   • Per analysis: a "Performance" slide (KPIs, key takeaway, chart, table)
//     and an "Insights" slide (insight cards beside a supporting chart)
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
const SH = 7.5;   // slide height
const MX = 0.5;   // x margin
const CW = SW - MX * 2; // content width

// Shared content-area grid — keeps charts, tables and insight panels aligned.
const LAYOUT = {
  contentTop: 1.24,
  contentBottom: 6.88,
  colGap: 0.28,
  perfChartW: 6.45,
  perfTableW: CW - 6.45 - 0.28,
  insightChartW: 6.2,
  insightPanelW: CW - 6.2 - 0.28,
  cardTitleH: 0.48,
  cardPad: 0.22,
  cardInnerTop: 0.58,
  padAfterKpi: 0.24,
  padAfterTakeaway: 0.36,
  panelHeaderH: 0.24,
  panelHeaderGap: 0.14,
};

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

const toneFill = (tone) => {
  switch (tone) {
    case 'green': return 'E8F8EF';
    case 'red': return 'FCECEA';
    case 'amber': return 'FDF3E7';
    default: return C.primaryLt;
  }
};

function slideFooter(slide, pptx, pageNo) {
  slide.addShape(pptx.ShapeType.rect, { x: MX, y: LAYOUT.contentBottom + 0.08, w: CW, h: 0.01, fill: { color: C.border } });
  slide.addText('Samsung Analytics Insights', {
    x: MX, y: 7.02, w: 6, h: 0.28, fontSize: 9, color: C.ink3, fontFace: FONT,
  });
  if (pageNo) {
    slide.addText(String(pageNo).padStart(2, '0'), {
      x: SW - 1.05, y: 7.02, w: 0.65, h: 0.28, fontSize: 9, color: C.ink3, align: 'right', fontFace: FONT,
    });
  }
}

function panelHeader(slide, pptx, { label, x, y, w }) {
  slide.addText(label.toUpperCase(), {
    x, y, w, h: 0.22, fontSize: 9, bold: true, charSpacing: 1.5, color: C.ink3, fontFace: FONT,
  });
}

// ── Shared chrome ─────────────────────────────────────────────
function contentBg(slide, pptx) {
  slide.background = { color: C.page };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 1.06, fill: { color: C.navy } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.06, w: SW, h: 0.06, fill: { color: C.accent } });
}

function header(slide, pptx, { groupTitle, eyebrow, title, subtitle, meta, pageNo }) {
  slide.addShape(pptx.ShapeType.roundRect, { x: MX, y: 0.26, w: 0.14, h: 0.5, rectRadius: 0.05, fill: { color: C.accent } });
  const eyebrowText = groupTitle || eyebrow;
  if (eyebrowText) {
    slide.addText(eyebrowText.toUpperCase(), {
      x: MX + 0.26, y: 0.18, w: 8, h: 0.24, fontSize: 9, bold: true, charSpacing: 2,
      color: 'A9B7D6', fontFace: FONT,
    });
  }
  slide.addText(title, {
    x: MX + 0.26, y: 0.38, w: 9.2, h: 0.46, fontSize: 20, bold: true, color: C.white, fontFace: FONT, valign: 'middle',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MX + 0.26, y: 0.82, w: 8.5, h: 0.22, fontSize: 10, color: 'B8C5DC', fontFace: FONT,
    });
  }
  if (meta) {
    slide.addText(meta.periodLabel, {
      x: SW - 4.3, y: 0.22, w: 3.8, h: 0.55, fontSize: 11, color: 'C7D2E8',
      align: 'right', valign: 'middle', fontFace: FONT,
    });
  }
  if (pageNo) slideFooter(slide, pptx, pageNo);
}

// ── KPI strip ─────────────────────────────────────────────────
function kpiStrip(slide, pptx, kpis, y) {
  if (!kpis || !kpis.length) return y;
  const perRow = kpis.length > 4 ? Math.ceil(kpis.length / 2) : kpis.length;
  const rows = kpis.length > 4
    ? [kpis.slice(0, perRow), kpis.slice(perRow)]
    : [kpis];
  const cardH = 0.92;
  const rowGap = 0.14;
  let cy = y;

  rows.forEach((row) => {
    const gap = 0.16;
    const w = (CW - gap * (row.length - 1)) / row.length;
    row.forEach((k, i) => {
      const x = MX + i * (w + gap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y: cy, w, h: cardH, rectRadius: 0.07, fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: CARD_SHADOW,
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x + 0.12, y: cy + 0.16, w: 0.08, h: cardH - 0.32, rectRadius: 0.04, fill: { color: PALETTE[i % PALETTE.length] },
      });
      slide.addText(k.label.toUpperCase(), {
        x: x + 0.28, y: cy + 0.14, w: w - 0.38, h: 0.22, fontSize: 7.5, bold: true, charSpacing: 0.8, color: C.ink3, fontFace: FONT,
      });
      slide.addText(String(k.value), {
        x: x + 0.28, y: cy + 0.36, w: w - 0.38, h: 0.46, fontSize: row.length > 3 ? 15 : 17, bold: true, color: C.navy, fontFace: FONT,
      });
    });
    cy += cardH + rowGap;
  });
  return cy + 0.06;
}

function truncateText(text, maxLen) {
  const s = String(text ?? '');
  return s.length <= maxLen ? s : `${s.slice(0, maxLen - 1)}…`;
}

function takeawayHeight(insight) {
  const bodyLen = (insight?.body || '').length;
  const titleLen = (insight?.title || '').length;
  if (bodyLen > 130 || titleLen > 72) return 1.28;
  if (bodyLen > 80 || titleLen > 48) return 1.12;
  return 1.08;
}

// ── Key takeaway banner ───────────────────────────────────────
function keyTakeawayBanner(slide, pptx, insight, y) {
  if (!insight) return y;

  const topPad = LAYOUT.padAfterKpi;
  const bottomPad = LAYOUT.padAfterTakeaway;
  const boxY = y + topPad;
  const { color, label } = toneMeta(insight);
  const h = takeawayHeight(insight);
  const tag = (insight.tag || label).toUpperCase();
  const title = truncateText(insight.title, 90);
  const body = truncateText(insight.body, 160);
  const textX = MX + 0.34;
  const textW = CW - 0.56;

  slide.addShape(pptx.ShapeType.roundRect, {
    x: MX, y: boxY, w: CW, h,
    rectRadius: 0.08,
    fill: { color: C.white },
    line: { color: C.border, width: 1 },
    shadow: CARD_SHADOW,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: MX + 0.02, y: boxY + 0.02, w: 0.12, h: h - 0.04, rectRadius: 0.06, fill: { color },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: textX, y: boxY + 0.16, w: 1.45, h: 0.24, rectRadius: 0.12, fill: { color: toneFill(insight.tone) },
  });
  slide.addText('KEY TAKEAWAY', {
    x: textX, y: boxY + 0.16, w: 1.45, h: 0.24,
    fontSize: 7, bold: true, charSpacing: 1.2, color, align: 'center', valign: 'middle', fontFace: FONT,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: textX + 1.55, y: boxY + 0.16, w: Math.min(1.6, 0.22 + tag.length * 0.055), h: 0.24, rectRadius: 0.12,
    fill: { color }, line: { color, width: 0 },
  });
  slide.addText(tag, {
    x: textX + 1.55, y: boxY + 0.16, w: 1.6, h: 0.24,
    fontSize: 7, bold: true, charSpacing: 0.8, color: C.white, align: 'center', valign: 'middle', fontFace: FONT,
  });
  slide.addText(title, {
    x: textX, y: boxY + 0.46, w: textW, h: 0.3,
    fontSize: 12, bold: true, color: C.navy, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.05,
  });
  slide.addText(body, {
    x: textX, y: boxY + 0.76, w: textW, h: h - 0.88,
    fontSize: 9.5, color: C.ink2, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.12,
  });

  return boxY + h + bottomPad;
}

// ── Charts ────────────────────────────────────────────────────
function chartCard(slide, pptx, title, x, y, w, h) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.07, fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: CARD_SHADOW,
  });
  if (title) {
    slide.addText(title, {
      x: x + LAYOUT.cardPad, y: y + 0.12, w: w - LAYOUT.cardPad * 2, h: LAYOUT.cardTitleH,
      fontSize: 11.5, bold: true, color: C.navy, fontFace: FONT, valign: 'middle',
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + LAYOUT.cardPad, y: y + LAYOUT.cardInnerTop - 0.04, w: w - LAYOUT.cardPad * 2, h: 0.01, fill: { color: C.border },
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
  const max = chart.maxItems ?? (isDoughnut ? 8 : isHorizontal ? 10 : 12);
  const labels = chart.labels.slice(0, max);
  const values = chart.values.slice(0, max);
  const colors = chart.barColors?.slice(0, max)
    ?? (chart.chartColor ? Array(labels.length).fill(chart.chartColor) : PALETTE);

  const px = x + LAYOUT.cardPad;
  const py = y + LAYOUT.cardInnerTop + 0.08;
  const pw = w - LAYOUT.cardPad * 2;
  const ph = h - (LAYOUT.cardInnerTop + 0.16);
  const labelSize = isHorizontal && labels.some(l => String(l).length > 24) ? 7.5 : 8.5;
  const showValues = labels.length <= (isHorizontal ? 10 : 14);

  if (isDoughnut) {
    slide.addChart(pptx.ChartType.doughnut, [{ name: chart.title, labels, values }], {
      x: px, y: py, w: pw, h: ph,
      chartColors: colors,
      holeSize: 55,
      showLegend: true, legendPos: 'r', legendFontSize: 8.5, legendColor: C.ink2, legendFontFace: FONT,
      showTitle: false,
      showValue: false, showPercent: true,
      dataLabelColor: C.white, dataLabelFontSize: 8.5, dataLabelFontBold: true, dataLabelFontFace: FONT,
    });
    return;
  }

  if (isArea) {
    slide.addChart(pptx.ChartType.area, [{ name: chart.title, labels, values }], {
      x: px, y: py, w: pw, h: ph,
      chartColors: [chart.chartColor || C.primary], chartColorsOpacity: 40,
      lineSmooth: true, lineSize: 2.5,
      showLegend: false, showTitle: false, showValue: false,
      catAxisLabelColor: C.ink2, catAxisLabelFontSize: 8.5, catAxisLabelFontFace: FONT, catAxisLineShow: false,
      valAxisLabelColor: C.ink3, valAxisLabelFontSize: 8, valAxisLineShow: false,
      valGridLine: { color: C.border, style: 'dash', size: 0.5 }, catGridLine: { style: 'none' },
      valAxisMinVal: 0,
    });
    return;
  }

  slide.addChart(pptx.ChartType.bar, [{ name: chart.title, labels, values }], {
    x: px, y: py, w: pw, h: ph,
    barDir: isHorizontal ? 'bar' : 'col',
    chartColors: colors,
    barGapWidthPct: isHorizontal ? 28 : 38,
    barGrouping: 'clustered',
    showLegend: false, showTitle: false,
    showValue: showValues,
    dataLabelFormatCode: chart.fmtCode,
    dataLabelPosition: isHorizontal ? 'outEnd' : 'inEnd',
    dataLabelColor: isHorizontal ? C.ink : C.white,
    dataLabelFontSize: 8, dataLabelFontBold: true, dataLabelFontFace: FONT,
    catAxisLabelColor: C.ink2, catAxisLabelFontSize: labelSize, catAxisLabelFontFace: FONT, catAxisLineShow: false,
    catAxisLabelRotate: !isHorizontal && labels.length > 8 ? 35 : 0,
    valAxisHidden: isHorizontal, valGridLine: { style: 'none' }, valAxisLineShow: false,
    valAxisMinVal: 0,
    catGridLine: { style: 'none' },
  });
}

// ── Data table ────────────────────────────────────────────────
function dataTable(slide, pptx, table, x, y, w, h) {
  if (!table || !table.rows || !table.rows.length) return;
  chartCard(slide, pptx, table.title, x, y, w, h);

  const headerRow = table.columns.map((c, ci) => ({
    text: c,
    options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 8, align: ci === 0 ? 'left' : 'right' },
  }));

  const rowH = 0.26;
  const maxRows = Math.max(4, Math.min(14, Math.floor((h - LAYOUT.cardInnerTop - 0.12) / rowH)));
  const bodyRows = table.rows.slice(0, maxRows).map((row, ri) =>
    row.map((cell, ci) => ({
      text: String(cell),
      options: {
        fontSize: 7.5, color: C.ink, align: ci === 0 ? 'left' : 'right',
        fill: { color: ri % 2 === 0 ? C.white : C.primaryLt },
      },
    })),
  );

  slide.addTable([headerRow, ...bodyRows], {
    x: x + LAYOUT.cardPad, y: y + LAYOUT.cardInnerTop + 0.04, w: w - LAYOUT.cardPad * 2, h: h - LAYOUT.cardInnerTop - 0.1,
    border: { type: 'solid', color: C.border, pt: 0.5 },
    fontFace: FONT, valign: 'middle', autoPage: false,
  });
}

// ── Insight cards (readable, stacked) ─────────────────────────
function insightCards(slide, pptx, insights, x, y, w, h, { showHeader = true } = {}) {
  let top = y;
  if (showHeader) {
    panelHeader(slide, pptx, { label: 'Key insights & recommendations', x, y: top, w });
    top += 0.28;
  }

  const avail = h - (top - y);
  const items = (insights || []).slice(0, 4);
  if (!items.length) {
    slide.addText('No notable insights for the selected period.', {
      x, y: top + 0.2, w, h: 0.4, fontSize: 11, italic: true, color: C.ink2, fontFace: FONT,
    });
    return;
  }
  const gap = 0.14;
  const ch = (avail - gap * (items.length - 1)) / items.length;
  items.forEach((ins, i) => {
    const cy = top + i * (ch + gap);
    const { color, label } = toneMeta(ins);
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: cy, w, h: ch, rectRadius: 0.06, fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: CARD_SHADOW,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.02, y: cy + 0.02, w: 0.1, h: ch - 0.04, rectRadius: 0.05, fill: { color } });
    slide.addText(
      [
        { text: `${(ins.tag || label).toUpperCase()}\n`, options: { color, bold: true, fontSize: 7.5, charSpacing: 1 } },
        { text: `${ins.title}\n`, options: { color: C.navy, bold: true, fontSize: 11 } },
        { text: ins.body, options: { color: C.ink2, fontSize: 9 } },
      ],
      { x: x + 0.28, y: cy + 0.1, w: w - 0.42, h: ch - 0.2, valign: 'top', fontFace: FONT, lineSpacingMultiple: 1.04 },
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

function executiveSummarySlide(pptx, overview, highlights, meta, pageNo) {
  const slide = pptx.addSlide();
  contentBg(slide, pptx);
  header(slide, pptx, {
    groupTitle: 'Executive summary',
    title: 'Key metrics & headline findings',
    subtitle: 'Top-level performance snapshot for the reporting period',
    meta,
    pageNo,
  });

  let y = LAYOUT.contentTop;
  y = kpiStrip(slide, pptx, overview.kpis.slice(0, 6), y);
  y += 0.12;

  panelHeader(slide, pptx, { label: 'Headline insights across all analyses', x: MX, y, w: CW });
  y += 0.3;

  const items = highlights.slice(0, 6);
  const cols = 2;
  const gapX = 0.24;
  const gapY = 0.16;
  const cardW = (CW - gapX) / cols;
  const cardH = 1.05;

  items.forEach((ins, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = MX + col * (cardW + gapX);
    const cy = y + row * (cardH + gapY);
    const { color, label } = toneMeta(ins);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: cy, w: cardW, h: cardH, rectRadius: 0.06,
      fill: { color: toneFill(ins.tone) }, line: { color: C.border, width: 1 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.02, y: cy + 0.02, w: 0.08, h: cardH - 0.04, rectRadius: 0.04, fill: { color },
    });
    slide.addText(
      [
        { text: `${(ins.section || ins.tag || label).toUpperCase()} · ${(ins.tag || label).toUpperCase()}\n`, options: { color, bold: true, fontSize: 7, charSpacing: 0.8 } },
        { text: `${ins.title}\n`, options: { color: C.navy, bold: true, fontSize: 10.5 } },
        { text: ins.body, options: { color: C.ink2, fontSize: 8.5 } },
      ],
      { x: cx + 0.22, y: cy + 0.1, w: cardW - 0.34, h: cardH - 0.2, valign: 'top', fontFace: FONT, lineSpacingMultiple: 1.03 },
    );
  });
}

function performanceSlide(pptx, section, meta, pageNo, groupTitle) {
  const slide = pptx.addSlide();
  contentBg(slide, pptx);
  header(slide, pptx, {
    groupTitle,
    eyebrow: section.title,
    title: `${section.title} — Performance`,
    subtitle: section.subtitle,
    meta,
    pageNo,
  });

  let y = LAYOUT.contentTop;
  const kpis = (section.kpis || []).slice(0, 4);
  if (kpis.length) {
    y = kpiStrip(slide, pptx, kpis, y);
  }
  if (section.insights?.[0]) {
    y = keyTakeawayBanner(slide, pptx, section.insights[0], y);
  } else if (kpis.length) {
    y += LAYOUT.padAfterKpi;
  }

  const panelLabelY = y;
  y += LAYOUT.panelHeaderH + LAYOUT.panelHeaderGap;

  const chartTop = y;
  const h = Math.max(2.0, LAYOUT.contentBottom - chartTop);
  const tableX = MX + LAYOUT.perfChartW + LAYOUT.colGap;

  panelHeader(slide, pptx, { label: 'Primary chart', x: MX, y: panelLabelY, w: LAYOUT.perfChartW });
  panelHeader(slide, pptx, { label: 'Supporting data', x: tableX, y: panelLabelY, w: LAYOUT.perfTableW });

  drawChart(slide, pptx, section.chart, { x: MX, y: chartTop, w: LAYOUT.perfChartW, h });
  dataTable(slide, pptx, section.table, tableX, chartTop, LAYOUT.perfTableW, h);
}

function insightsSlide(pptx, section, meta, pageNo, groupTitle) {
  const slide = pptx.addSlide();
  contentBg(slide, pptx);
  header(slide, pptx, {
    groupTitle,
    eyebrow: section.title,
    title: `${section.title} — Key insights`,
    subtitle: 'Data-driven findings and recommended focus areas',
    meta,
    pageNo,
  });

  const top = LAYOUT.contentTop + 0.1;
  const panelLabelY = top;
  const chartTop = panelLabelY + LAYOUT.panelHeaderH + LAYOUT.panelHeaderGap;
  const h = LAYOUT.contentBottom - chartTop;
  const panelX = MX + LAYOUT.insightChartW + LAYOUT.colGap;
  const supporting = section.chart2 || section.chart;

  panelHeader(slide, pptx, { label: 'Supporting chart', x: MX, y: panelLabelY, w: LAYOUT.insightChartW });
  drawChart(slide, pptx, supporting, { x: MX, y: chartTop, w: LAYOUT.insightChartW, h });
  insightCards(slide, pptx, section.insights, panelX, panelLabelY, LAYOUT.insightPanelW, LAYOUT.contentBottom - panelLabelY);
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

function collectExecutiveHighlights(sections) {
  const toneRank = { red: 0, amber: 1, green: 2, blue: 3 };
  return sections
    .flatMap(s => (s.insights || []).slice(0, 1).map(ins => ({ ...ins, section: s.title })))
    .sort((a, b) => (toneRank[a.tone] ?? 9) - (toneRank[b.tone] ?? 9))
    .slice(0, 6);
}

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

  const overview = byId.overview;
  if (overview) {
    executiveSummarySlide(pptx, overview, collectExecutiveHighlights(sections), meta, 1);
  }

  let pageNo = overview ? 2 : 1;
  for (const group of groups) {
    dividerSlide(pptx, group);
    for (const section of group.sections) {
      performanceSlide(pptx, section, meta, pageNo++, group.title);
      insightsSlide(pptx, section, meta, pageNo++, group.title);
    }
  }

  closingSlide(pptx, meta);

  const stamp = meta.generatedAt.toISOString().slice(0, 10);
  await pptx.writeFile({ fileName: `Samsung-Analytics-Insights-${stamp}.pptx` });
}
