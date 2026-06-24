import React, { useState } from 'react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', title: 'Compliance Dashboard & Executive Summary' },
  { id: 'parsing', label: 'Document Audit', icon: '📂', title: 'Intelligent Document Analysis & OCR Pipeline' },
  { id: 'classification', label: 'Product Classification', icon: '⚖️', title: 'Algorithmic Product Classification Gate' },
  { id: 'translation', label: 'Claim Translator', icon: '🔄', title: 'Ayush Claim Translator & RDA Recalculator' },
  { id: 'crosswalk', label: 'Terminology Crosswalk', icon: '🗂️', title: 'FSSAI / AYUSH → US FDA Terminology Crosswalk' },
  { id: 'markets', label: 'EU & Gulf Markets', icon: '🌏', title: 'EU & Gulf Market Regulatory Guide' },
  { id: 'rag', label: 'RAG Explorer', icon: '🔍', title: 'Regulatory Knowledge Base Explorer' },
];

export default function AppShell({
  activeView,
  onViewChange,
  theme,
  onThemeToggle,
  aiEnabled,
  aiStatusText,
  userName,
  onUserNameChange,
  onExportReport,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Compute avatar initials from username
  const getInitials = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return 'SM';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return trimmed.substring(0, 2).toUpperCase();
  };

  const currentTitle = navItems.find((item) => item.id === activeView)?.title || 'APEX Compliance Platform';

  const handleNavClick = (viewId) => {
    onViewChange(viewId);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex text-slate-100 bg-[#070b13] dark:bg-[#070b13] transition-colors duration-300 font-sans">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[199] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`w-[280px] bg-slate-900 border-r border-slate-800/80 p-6 flex flex-col justify-between fixed lg:sticky top-0 h-screen overflow-y-auto z-[200] transition-transform duration-300 lg:transform-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl text-brand-teal-50">🕉️</span>
            <div className="font-extrabold text-lg leading-tight tracking-tight">
              APEX<br />
              <span className="text-brand-teal-50 text-xs font-semibold uppercase tracking-wider">Compliance</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-brand-teal-50 text-white shadow-lg shadow-teal-500/20'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="flex items-center gap-3 border-t border-slate-800/80 pt-4 mt-6">
          <div className="w-10 h-10 rounded-full bg-brand-teal-50 flex items-center justify-center font-bold text-white text-sm shrink-0">
            {getInitials(userName)}
          </div>
          <div className="flex flex-col overflow-hidden min-w-0">
            <input
              type="text"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              className="text-sm font-bold text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-brand-teal-50 rounded px-1 min-w-0 truncate"
              title="Click to edit name"
            />
            <span className="text-xs text-slate-400 truncate">Global Trade Director</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Action Bar */}
        <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/60 px-6 py-4 flex justify-between items-center gap-4 sticky top-0 z-[100]">
          {/* Hamburger button on mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col justify-between w-6 h-4 lg:hidden text-slate-100 cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <span className={`h-0.5 w-full bg-current rounded transition duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
            <span className={`h-0.5 w-full bg-current rounded transition duration-200 ${mobileOpen ? 'opacity-0' : ''}`}></span>
            <span className={`h-0.5 w-full bg-current rounded transition duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
          </button>

          {/* Page Title */}
          <h1 className="text-lg font-extrabold text-slate-100 truncate flex-1 min-w-0 select-none">
            {currentTitle}
          </h1>

          {/* Toolbar Controls */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Export Report Button */}
            <button
              onClick={onExportReport}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 px-4 border border-slate-700 rounded-lg transition duration-200 cursor-pointer"
            >
              ⬇️ Export Report
            </button>

            {/* Dark/Light toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="theme-toggle"
                checked={theme === 'light'}
                onChange={onThemeToggle}
                className="hidden"
              />
              <label
                htmlFor="theme-toggle"
                className="w-14 h-7 bg-slate-800 checked:bg-brand-teal-50 rounded-full p-1 cursor-pointer flex items-center justify-between relative transition duration-300"
                title="Switch Theme"
              >
                <span className="text-xs">🌙</span>
                <span className="text-xs">☀️</span>
                <span
                  className={`w-5 h-5 bg-white rounded-full absolute shadow-md transition duration-300 transform ${
                    theme === 'light' ? 'translate-x-[28px]' : 'translate-x-0'
                  }`}
                ></span>
              </label>
            </div>
          </div>
        </header>

        {/* Dynamic Panel Panel views */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1300px] w-full mx-auto flex flex-col gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
