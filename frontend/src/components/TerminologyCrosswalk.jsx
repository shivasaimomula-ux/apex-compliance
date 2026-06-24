import React, { useState } from 'react';
import COMPLIANCE_DATABASE from '../mock_data.js';

const RISK_BADGE_CLASSES = {
  CRITICAL: 'bg-red-500/10 text-red-500 border border-red-500/20',
  HIGH: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  MODERATE: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  'LOW-MODERATE': 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
};

const RISK_BAR_CLASSES = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-amber-500',
  MODERATE: 'bg-yellow-500',
  'LOW-MODERATE': 'bg-blue-500',
  LOW: 'bg-emerald-500',
};

export default function TerminologyCrosswalk() {
  const [filter, setFilter] = useState('all');

  const filteredItems = COMPLIANCE_DATABASE.terminologyCrosswalk.filter((item) => {
    if (filter === 'all') return true;
    return item.riskLevel.toUpperCase().includes(filter.toUpperCase());
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md flex flex-col gap-6 animate-slide-in">
      <div>
        <h2 className="text-base font-bold text-slate-100 mb-1">FSSAI / AYUSH → US FDA Terminology Crosswalk</h2>
        <p className="text-xs text-slate-400 leading-normal">
          Maps Indian regulatory product categories and ingredient types to their nearest US FDA equivalents, highlighting classification risk and required actions before export.
        </p>
      </div>

      {/* Filters buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
            filter === 'all'
              ? 'bg-brand-teal-50 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
          }`}
        >
          All Entries
        </button>
        <button
          onClick={() => setFilter('CRITICAL')}
          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
            filter === 'CRITICAL'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
          }`}
        >
          🔴 Critical
        </button>
        <button
          onClick={() => setFilter('HIGH')}
          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
            filter === 'HIGH'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
          }`}
        >
          🟠 High
        </button>
        <button
          onClick={() => setFilter('MODERATE')}
          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
            filter === 'MODERATE'
              ? 'bg-yellow-500 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
          }`}
        >
          🟡 Moderate
        </button>
        <button
          onClick={() => setFilter('LOW')}
          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
            filter === 'LOW'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
          }`}
        >
          🟢 Low / Low-Moderate
        </button>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400 text-sm">
            No entries match this filter.
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const risk = item.riskLevel;
            const barClass = RISK_BAR_CLASSES[risk] || 'bg-slate-500';
            const badgeClass = RISK_BADGE_CLASSES[risk] || 'bg-slate-800 text-slate-400';

            return (
              <div
                key={idx}
                className="bg-slate-950/20 border border-slate-800/80 rounded-xl p-5 hover:translate-y-[-2px] transition duration-200 shadow-md flex flex-col justify-between"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-2.5">
                    <h4 className="text-sm font-extrabold text-slate-200 truncate leading-tight mr-1" title={item.indianTerm}>
                      {item.indianTerm}
                    </h4>
                    <span className={`text-[8px] font-bold py-0.5 px-1.5 rounded-full uppercase tracking-wider shrink-0 ${badgeClass}`}>
                      {risk}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <p className="leading-tight">
                      <strong className="text-slate-300">Indian Context:</strong> {item.indianContext}
                    </p>
                    <p className="leading-tight">
                      <strong className="text-brand-teal-50">US FDA Equivalent:</strong> {item.fdaEquivalent}
                    </p>
                    <p className="leading-tight">
                      <strong className="text-slate-300">Governing Law:</strong> {item.governingLaw}
                    </p>
                    <p className="text-slate-400 leading-normal pt-1.5 border-t border-slate-800/50">
                      {item.notes}
                    </p>
                  </div>
                </div>
                {/* Color strip bar */}
                <div className={`h-1 w-full rounded mt-4 shrink-0 ${barClass}`} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
