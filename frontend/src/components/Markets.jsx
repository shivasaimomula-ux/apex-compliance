import React from 'react';
import COMPLIANCE_DATABASE from '../mock_data.js';

const RISK_BADGE_CLASSES = {
  CRITICAL: 'bg-red-500/10 text-red-500 border border-red-500/20',
  HIGH: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  MODERATE: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  LOW: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
};

export default function Markets() {
  const { eu = [], gulf = [] } = COMPLIANCE_DATABASE.euGulfRegulations || {};

  const renderCards = (items) => {
    return items.map((item, idx) => {
      const risk = item.riskLevel;
      const badgeClass = RISK_BADGE_CLASSES[risk] || 'bg-slate-850 text-slate-300';
      const applicableList = Array.isArray(item.applicableTo)
        ? item.applicableTo.join(', ')
        : item.applicableTo;

      return (
        <div
          key={idx}
          className="bg-slate-950/20 border border-slate-800/80 rounded-xl p-5 shadow-sm flex flex-col gap-3.5"
        >
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-slate-200 leading-tight mb-0.5 truncate max-w-[280px]">
                {item.framework}
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold">{item.regulation}</span>
            </div>
            <span className={`text-[8px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider shrink-0 ${badgeClass}`}>
              {risk} Risk
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            <strong className="text-slate-300">Applies to:</strong> {applicableList}
          </p>

          <p className="text-xs text-slate-300 leading-normal">{item.summary}</p>

          <div className="bg-brand-teal-50/5 border border-dashed border-brand-teal-50/20 rounded-lg p-3 text-xs leading-normal">
            <strong className="text-brand-teal-50 font-bold block mb-1">Required Action:</strong>
            <span className="text-slate-300">{item.actionRequired}</span>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold">
            <strong className="text-slate-300">Key Authority:</strong> {item.keyAuthority}
          </p>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md">
        <h2 className="text-base font-bold text-slate-100 mb-1">🌏 EU &amp; Gulf Export Regulatory Guide</h2>
        <p className="text-xs text-slate-400 leading-normal">
          Key regulatory frameworks for Indian Ayurvedic &amp; nutraceutical exporters targeting the European Union and Gulf Cooperation Council (GCC) markets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EU Frameworks */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-2 px-1">
            <span>🇪🇺</span> European Union Frameworks
          </h3>
          <div className="flex flex-col gap-4">{renderCards(eu)}</div>
        </div>

        {/* Gulf Frameworks */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-2 px-1">
            <span>🕌</span> Gulf &amp; GCC Frameworks
          </h3>
          <div className="flex flex-col gap-4">{renderCards(gulf)}</div>
        </div>
      </div>
    </div>
  );
}
