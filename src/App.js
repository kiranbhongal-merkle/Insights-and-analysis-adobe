import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingDown, DoorOpen, Monitor,
  Globe, Users, Chrome, Target, FileSearch,
  BookOpen, ChevronLeft, ChevronRight, Moon, Sun,
  Wifi, WifiOff, FileDown, Loader2
} from 'lucide-react';

import OverviewPage      from './pages/OverviewPage';
import FunnelPage        from './pages/FunnelPage';
import DevicePage        from './pages/DevicePage';
import ExitsPage         from './pages/ExitsPage';
import CountryPage       from './pages/CountryPage';
import UserTypePage      from './pages/UserTypePage';
import BrowserPage       from './pages/BrowserPage';
import LastTouchPage     from './pages/LastTouchPage';
import CustomReportPage  from './pages/CustomReportPage';
import GlossaryPage      from './pages/GlossaryPage';
import { loadLiveData } from './utils/loadLiveData';
import { exportPptx } from './utils/exportPptx';

import './App.css';

export const AppContext = createContext({});
export const useApp = () => useContext(AppContext);

const NAV_ITEMS = [
  { path: '/',            icon: LayoutDashboard, label: 'Overview'         },
  { path: '/funnel',      icon: TrendingDown,    label: 'Funnel'           },
  { path: '/device',      icon: Monitor,         label: 'Device'           },
  { path: '/exits',       icon: DoorOpen,        label: 'Page Exits'       },
  { path: '/country',     icon: Globe,           label: 'Country'          },
  { path: '/usertype',    icon: Users,           label: 'User Type'        },
  { path: '/browser',     icon: Chrome,          label: 'Competitor Device' },
  { path: '/lasttouch',   icon: Target,          label: 'Last Touch'       },
  { path: '/custom',      icon: FileSearch,      label: 'Custom Report'    },
  { path: '/glossary',    icon: BookOpen,        label: 'Glossary'         },
];

function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">S</div>
          {!collapsed && <div className="logo-text"><span>Samsung</span><span>Analytics</span></div>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            {!collapsed && <span>{label}</span>}
            {collapsed && <div className="nav-tooltip">{label}</div>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <div className="sidebar-version">v3.0 · BigQuery</div>}
      </div>
    </aside>
  );
}

function Topbar({ dateRange, setDateRange, connected, dataLoading, dark, setDark }) {
  const location = useLocation();
  const current = NAV_ITEMS.find(n => n.path === location.pathname);
  const [exporting, setExporting] = useState(false);

  const handleExportPptx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportPptx(dateRange);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PowerPoint export failed', err);
      window.alert('Sorry, the PowerPoint export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{current?.label || 'Analytics'}</h1>
        <div className={`conn-badge ${dataLoading ? 'loading' : connected ? 'live' : 'error'}`}>
          {dataLoading ? <Loader2 size={11} className="spin" /> : connected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {dataLoading ? 'Loading…' : connected ? 'BigQuery live' : 'Not connected'}
        </div>
      </div>
      <div className="topbar-right">
        <div className="date-picker">
          <label>From</label>
          <input type="date" value={dateRange.from}
            onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))} />
          <label>To</label>
          <input type="date" value={dateRange.to}
            onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))} />
        </div>
        <button
          className="btn btn-primary btn-sm topbar-export-btn"
          onClick={handleExportPptx}
          disabled={exporting}
          title="Download a PowerPoint deck of every page, chart and insight"
        >
          {exporting ? <Loader2 size={14} className="spin" /> : <FileDown size={14} />}
          <span>{exporting ? 'Building…' : 'PowerPoint'}</span>
        </button>
        <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle theme">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark]           = useState(false);
  const [token, setToken]         = useState(null);
  const [connected, setConnected] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [dataError, setDataError] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: '2026-01-01',
    to:   '2026-03-31',
  });

  // Load dashboard data exclusively from BigQuery (no demo CSV fallback).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setDataLoading(true);
      setDataError(null);

      try {
        const live = await loadLiveData({ from: dateRange.from, to: dateRange.to });
        if (cancelled) return;

        if (live.loaded) {
          setConnected(true);
          if (live.empty) {
            setDataError('No data in BigQuery for the selected date range.');
          }
          setDataVersion(v => v + 1);
          return;
        }

        setConnected(false);
        setDataError(
          live.message
            ? `BigQuery error: ${live.message}`
            : 'Could not load data from BigQuery. Check the service connection and table permissions.'
        );
        setDataVersion(v => v + 1);
      } catch {
        if (cancelled) return;
        setConnected(false);
        setDataError('Could not load data from BigQuery. Check the service connection and table permissions.');
        setDataVersion(v => v + 1);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dateRange.from, dateRange.to]);

  return (
    <AppContext.Provider value={{ token, setToken, dateRange, setDateRange, connected, dataVersion, dataError }}>
      <BrowserRouter>
        <div className={`app-shell ${dark ? 'dark' : 'light'}`}>
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          <div className="main-area">
            <Topbar
              dateRange={dateRange}
              setDateRange={setDateRange}
              connected={connected}
              dataLoading={dataLoading}
              dark={dark}
              setDark={setDark}
            />
            {dataError && (
              <div className={`data-error-banner ${connected ? 'notice' : ''}`} role="alert">
                {dataError}
              </div>
            )}
            <main className="page-content">
              {dataLoading ? (
                <div className="data-loading-state">
                  <Loader2 size={28} className="spin" />
                  <p>Loading data from BigQuery…</p>
                </div>
              ) : (
              <Routes key={dataVersion}>
                <Route path="/"           element={<OverviewPage />} />
                <Route path="/funnel"     element={<FunnelPage />} />
                <Route path="/device"     element={<DevicePage />} />
                <Route path="/exits"      element={<ExitsPage />} />
                <Route path="/country"    element={<CountryPage />} />
                <Route path="/usertype"   element={<UserTypePage />} />
                <Route path="/browser"    element={<BrowserPage />} />
                <Route path="/lasttouch"  element={<LastTouchPage />} />
                <Route path="/custom"     element={<CustomReportPage />} />
                <Route path="/glossary"   element={<GlossaryPage />} />
              </Routes>
              )}
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
