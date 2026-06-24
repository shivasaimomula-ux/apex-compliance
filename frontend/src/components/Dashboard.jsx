import React from 'react';

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20 border-l-red-500',
  HIGH: 'bg-amber-500/10 text-amber-500 border-amber-500/20 border-l-amber-500',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 border-l-yellow-500',
  LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20 border-l-blue-500',
};

const SEVERITY_BADGES = {
  CRITICAL: 'bg-red-500/10 text-red-500 border border-red-500/20',
  HIGH: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  LOW: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
};

export default function Dashboard({
  scoreReport,
  violations,
  productName,
  onNavigateToUpload,
  onNavigateToClassification,
}) {
  const { score, band, pillarScores } = scoreReport;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getPillarColor = (val) => {
    if (val >= 80) return 'text-emerald-500';
    if (val >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      {/* 3-Column Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FDA Readiness Score Ring Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col justify-center text-center gap-4 shadow-lg backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-300">FDA Readiness Score</h3>
          <div className="relative flex justify-center items-center w-36 h-36 mx-auto">
            <svg viewBox="0 0 140 140" className="w-full aspect-square">
              <circle cx="70" cy="70" r={radius} className="fill-none stroke-slate-800/50 stroke-[10]" />
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="fill-none stroke-[10] stroke-brand-teal-50 transition-all duration-[1.5s] ease-in-out"
                style={{
                  stroke: band.color,
                  strokeLinecap: 'round',
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-white">{score}</span>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">FRS Index</span>
            </div>
          </div>
          <div>
            <h4
              className="text-sm font-black uppercase tracking-wider mb-1"
              style={{ color: band.color }}
            >
              {band.label}
            </h4>
            <p className="text-xs text-slate-400">{band.desc}</p>
          </div>
        </div>

        {/* Pillars Breakdown Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col gap-4 shadow-lg backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-300">Readiness Pillars Breakdown</h3>
          <div className="flex flex-col gap-3.5 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">⚖️ Product Classification (15%)</span>
              <strong className={getPillarColor(pillarScores.product_classification)}>
                {pillarScores.product_classification}/100
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">🏷️ Labeling Compliance (25%)</span>
              <strong className={getPillarColor(pillarScores.labeling_compliance)}>
                {pillarScores.labeling_compliance}/100
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">🧪 Ingredient Safety (25%)</span>
              <strong className={getPillarColor(pillarScores.ingredient_safety)}>
                {pillarScores.ingredient_safety}/100
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <span className="text-slate-400">🏭 Manufacturing cGMP (20%)</span>
              <strong className={getPillarColor(pillarScores.manufacturing_compliance)}>
                {pillarScores.manufacturing_compliance}/100
              </strong>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-slate-400">🚢 Import Admissibility (15%)</span>
              <strong className={getPillarColor(pillarScores.import_admissibility)}>
                {pillarScores.import_admissibility}/100
              </strong>
            </div>
          </div>
        </div>

        {/* Audit Details & Actions Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between gap-4 shadow-lg backdrop-blur-md">
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-2">Audit Information</h3>
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Currently Auditing:</span>
            <strong className="text-sm text-brand-teal-50 block truncate mb-4" title={productName}>
              {productName || 'No Product Loaded'}
            </strong>
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Audited Gaps:</span>
            <strong className="text-xl text-red-500 font-extrabold">{violations.length}</strong>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onNavigateToUpload}
              className="w-full bg-brand-teal-50 hover:bg-teal-600 text-white font-bold py-2.5 rounded-lg text-xs transition duration-200 cursor-pointer shadow-md shadow-teal-500/10"
            >
              📂 Audit New Document
            </button>
            <button
              onClick={onNavigateToClassification}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-lg text-xs border border-slate-700 transition duration-200 cursor-pointer"
            >
              ⚖️ Run Classification
            </button>
          </div>
        </div>
      </div>

      {/* Action Plan Remediation Checklist */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md">
        <h2 className="text-base font-bold text-slate-100 mb-6 flex items-center gap-2">
          <span>🚨</span> Priority Action Plan &amp; Remediation Tasks
        </h2>

        <div className="flex flex-col gap-4">
          {violations.length === 0 ? (
            <div className="text-slate-400 text-sm py-4 text-center">
              No compliance gaps detected. Your product is in excellent standing!
            </div>
          ) : (
            violations.map((v, i) => {
              const sev = v.severity || 'LOW';
              const colClass = SEVERITY_COLORS[sev] || 'border-l-slate-500 bg-slate-500/5 text-slate-400';
              const badgeClass = SEVERITY_BADGES[sev] || 'bg-slate-500/10 text-slate-400 border border-slate-500/20';

              return (
                <div
                  key={i}
                  className={`flex gap-4 border-l-4 p-5 rounded-r-xl transition duration-200 hover:translate-x-1 ${colClass}`}
                >
                  <div className="text-xl shrink-0 mt-0.5">⚠️</div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider shrink-0 ${badgeClass}`}>
                        {sev}
                      </span>
                      <h4 className="text-sm font-bold text-slate-200 truncate">{v.finding}</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{v.remediation}</p>
                    <div className="flex items-center gap-3 text-[10px] font-semibold flex-wrap mt-1">
                      <span className="text-brand-teal-50 uppercase tracking-wider">{v.citation}</span>
                      {v.calculation && (
                        <span className="bg-slate-800 border border-slate-700/60 py-0.5 px-2 rounded font-mono text-slate-400">
                          {v.calculation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
