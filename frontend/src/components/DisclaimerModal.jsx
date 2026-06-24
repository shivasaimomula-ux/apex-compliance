import React from 'react';

export default function DisclaimerModal({ isOpen, onAccept }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-slide-in">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">⚖️</span>
          <h2 className="text-xl font-bold text-slate-100">Legal Disclaimer</h2>
        </div>
        <div className="mb-6 space-y-4">
          <p className="text-sm text-slate-400">
            APEX Compliance is an <strong>informational research tool only</strong>. It is not a substitute for licensed regulatory, legal, or scientific counsel.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-400 space-y-2">
            <li>Regulatory determinations shown are based on mock data and publicly available FDA guidance documents.</li>
            <li>Always consult a qualified FDA regulatory attorney or DSHEA-registered consultant before exporting products to the United States.</li>
            <li>Compliance scores are illustrative and do not constitute a legal opinion or FDA clearance.</li>
            <li>California Prop 65 calculations are estimates; engage a certified industrial hygienist for binding assessments.</li>
          </ul>
        </div>
        <div>
          <button
            onClick={onAccept}
            className="w-full bg-brand-teal-50 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg cursor-pointer"
          >
            I Understand — Enter Platform
          </button>
        </div>
      </div>
    </div>
  );
}
