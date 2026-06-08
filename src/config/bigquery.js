// ============================================================
// BigQuery Configuration
// ============================================================

export const BQ_CONFIG = {
  projectId: 'vdc200007-samsung-rhq-prod',
  dataset: '3_adobe',
  table: 'adobe_analytics_*',
};

export const FX_RATES = {
  MAD: { op: 'divide',   rate: 9.11,    label: 'Moroccan Dirham' },
  SAR: { op: 'divide',   rate: 3.75,    label: 'Saudi Riyal' },
  LBP: { op: 'divide',   rate: 89900,   label: 'Lebanese Pound' },
  JOD: { op: 'multiply', rate: 1.41,    label: 'Jordanian Dinar' },
  TRY: { op: 'divide',   rate: 43.0291, label: 'Turkish Lira' },
  TRL: { op: 'divide',   rate: 43.0291, label: 'Turkish Lira (legacy)' },
  TR:  { op: 'divide',   rate: 43.0291, label: 'Turkish Lira (code)' },
  AED: { op: 'divide',   rate: 3.6725,  label: 'UAE Dirham' },
  IQD: { op: 'divide',   rate: 1300,    label: 'Iraqi Dinar' },
  PKR: { op: 'divide',   rate: 278.62,  label: 'Pakistani Rupee' },
  EGP: { op: 'divide',   rate: 52.92,   label: 'Egyptian Pound' },
  ILS: { op: 'divide',   rate: 2.91,    label: 'Israeli Shekel' },
  USD: { op: 'passthrough', rate: 1,    label: 'US Dollar' },
};

export const ANALYSES = {
  A1_FUNNEL_DROPOFF:     { label: 'Funnel Drop-off',      color: '#3266ad' },
  A2_CHANNEL_CONVERSION: { label: 'Channel Conversion',   color: '#e8913a' },
  A3_PAGE_EXIT:          { label: 'Page Exits',           color: '#27ae60' },
  A4_DEVICE_ABANDONMENT: { label: 'Device Abandonment',   color: '#8e44ad' },
  A5_KPI_SUMMARY:        { label: 'KPI Summary',          color: '#16a085' },
  A6_COUNTRY:            { label: 'Country',              color: '#2980b9' },
  A7_USER_TYPE:          { label: 'New vs Returning',     color: '#d35400' },
  A8_BROWSER:            { label: 'Browser',              color: '#c0392b' },
  A9_LAST_TOUCH_CHANNEL: { label: 'Last-Touch Channel',   color: '#1abc9c' },
};

export const METRIC_LABELS = {
  metric_1: 'Primary Metric',
  metric_2: 'Secondary Metric',
  metric_3: 'Rate (%)',
  metric_4: 'Revenue (USD)',
  metric_5: 'AOV / Sub-Rate',
  metric_6: 'Avg Session (min)',
};

export const ANALYSIS_METRIC_LABELS = {
  A1_FUNNEL_DROPOFF:     { metric_1:'Visitors', metric_2:'Prev Step', metric_3:'Drop-off %', metric_4:null, metric_5:null, metric_6:null },
  A2_CHANNEL_CONVERSION: { metric_1:'Visits', metric_2:'Conversions', metric_3:'Conv Rate %', metric_4:'Revenue USD', metric_5:'Rev/Conv USD', metric_6:'Avg Session' },
  A3_PAGE_EXIT:          { metric_1:'Total Exits', metric_2:'Pageviews', metric_3:'Exit Rate %', metric_4:null, metric_5:null, metric_6:null },
  A4_DEVICE_ABANDONMENT: { metric_1:'Visits', metric_2:'Purchases', metric_3:'Conv Rate %', metric_4:'Abandon Rate %', metric_5:'Cart Abandon %', metric_6:null },
  A5_KPI_SUMMARY:        { metric_1:'Visits', metric_2:'Conversions', metric_3:'Conv Rate %', metric_4:'Revenue USD', metric_5:'AOV USD', metric_6:'Avg Session' },
  A6_COUNTRY:            { metric_1:'Visits', metric_2:'Conversions', metric_3:'Conv Rate %', metric_4:'Revenue USD', metric_5:'Avg Session', metric_6:null },
  A7_USER_TYPE:          { metric_1:'Visits', metric_2:'Conversions', metric_3:'Conv Rate %', metric_4:'Revenue USD', metric_5:'AOV USD', metric_6:'Avg Session' },
  A8_BROWSER:            { metric_1:'Visits', metric_2:'Conversions', metric_3:'Conv Rate %', metric_4:'Revenue USD', metric_5:'Avg Session', metric_6:null },
  A9_LAST_TOUCH_CHANNEL: { metric_1:'Visits', metric_2:'Conversions', metric_3:'Conv Rate %', metric_4:'Revenue USD', metric_5:'Rev/Conv USD', metric_6:'Avg Session' },
};
