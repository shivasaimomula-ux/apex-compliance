import React, { useState } from 'react';
import COMPLIANCE_DATABASE from '../mock_data.js';

const US_DAILY_VALUES = {
  vitamin_c: { name: 'Vitamin C', dv: 90, unit: 'mg', note: '21 CFR §101.9(c)(8)(iv)' },
  vitamin_d: { name: 'Vitamin D', dv: 20, unit: 'mcg', note: '21 CFR §101.9(c)(8)(iv) — 20mcg = 800 IU' },
  calcium: { name: 'Calcium', dv: 1300, unit: 'mg', note: '21 CFR §101.9(c)(8)(iv)' },
  zinc: { name: 'Zinc', dv: 11, unit: 'mg', note: '21 CFR §101.9(c)(8)(iv)' },
  iron: { name: 'Iron', dv: 18, unit: 'mg', note: '21 CFR §101.9(c)(8)(iv)' },
  vitamin_b12: { name: 'Vitamin B12', dv: 2.4, unit: 'mcg', note: '21 CFR §101.9(c)(8)(iv)' },
};

const RISK_BADGE_CLASSES = {
  CRITICAL: 'bg-red-500/10 text-red-500 border border-red-500/20',
  HIGH: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  MODERATE: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  LOW: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  COMPLIANT: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
};

export default function ClaimTranslator() {
  // Claim states
  const [claimsInput, setClaimsInput] = useState('Improves immunity to fight off winter infections');
  const [translationResults, setTranslationResults] = useState([]);

  // Recalculator states
  const [nutrientKey, setNutrientKey] = useState('vitamin_c');
  const [amount, setAmount] = useState('45');
  const [declaredRda, setDeclaredRda] = useState('112');
  const [recalcResult, setRecalcResult] = useState(null);

  // Claim Translation logic
  const handleTranslateClaims = () => {
    if (!claimsInput.trim()) {
      alert('Please enter a claim statement.');
      return;
    }

    const matchedResults = [];
    let matchFound = false;

    // Search static DB first
    COMPLIANCE_DATABASE.claimsDatabase.forEach((item) => {
      const hits = item.detectedEntities.filter((ent) =>
        claimsInput.toLowerCase().includes(ent.toLowerCase())
      ).length;

      if (hits > 0) {
        matchFound = true;
        matchedResults.push({
          isCustom: false,
          classification: item.classification.replace(/_/g, ' '),
          riskLevel: item.riskLevel,
          original: claimsInput,
          reason: item.reason,
          reframe: item.suggestedReframing,
          citation: item.citation,
        });
      }
    });

    // Run regex linter if no match found
    if (!matchFound) {
      let rewritten = claimsInput;
      let flagged = false;

      const reframings = [
        { regex: /cure[sd]?|treat[sd]?/i, replace: 'supports the natural maintenance of' },
        { regex: /prevent[sd]?/i, replace: 'helps maintain healthy' },
        { regex: /immunity/i, replace: 'immune function' },
        { regex: /cough|cold|asthma/i, replace: 'respiratory wellness' },
        { regex: /joint pain|arthritis/i, replace: 'joint mobility and comfort' },
        { regex: /detox(ifie[sd])?/i, replace: 'supports natural cleansing of' },
        { regex: /laxati(ve|on)/i, replace: 'supports digestive comfort and regularity' },
        { regex: /bowel clean|colon clean/i, replace: 'supports healthy digestive elimination' },
        { regex: /cancer/i, replace: 'cellular health' },
        { regex: /depression|anxiety/i, replace: 'everyday mental well-being' },
      ];

      reframings.forEach((rf) => {
        if (rf.regex.test(claimsInput)) {
          rewritten = rewritten.replace(rf.regex, rf.replace);
          flagged = true;
        }
      });

      matchedResults.push({
        isCustom: true,
        flagged,
        original: claimsInput,
        reframe: rewritten,
        classification: flagged ? 'PROHIBITED BIOMARKER INTERVENTION (AUTO-DETECTED)' : 'PERMISSIBLE GENERAL WELLNESS CLAIM',
        riskLevel: flagged ? 'HIGH' : 'COMPLIANT',
        reason: flagged
          ? 'Prohibited health biomarkers or drug terms were auto-detected. A structural reframing is required.'
          : 'No standard prohibited drug/disease keywords detected. Safe for general wellness.',
        citation: flagged
          ? '21 CFR §101.93 Structure/Function safe harbors'
          : '21 CFR §101.93 structure/function guidelines',
      });
    }

    setTranslationResults(matchedResults);
  };

  // Recalculate RDA logic
  const handleRecalculateRDA = () => {
    const inputRdaFloat = parseFloat(declaredRda);
    const amountFloat = parseFloat(amount);

    if (isNaN(inputRdaFloat) || isNaN(amountFloat) || amountFloat <= 0) {
      alert('Please enter valid positive numbers.');
      return;
    }

    const dv = US_DAILY_VALUES[nutrientKey];
    if (!dv) return;

    const usDvPercent = Math.round((amountFloat / dv.dv) * 100);
    const diff = Math.abs(usDvPercent - inputRdaFloat);

    setRecalcResult({
      name: dv.name,
      baseline: dv.dv,
      unit: dv.unit,
      amount: amountFloat,
      declared: inputRdaFloat,
      calculated: usDvPercent,
      note: dv.note,
      isMajorGap: diff > 10,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 animate-slide-in">
      {/* Left Column: Translation Gate */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md flex flex-col gap-5">
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-1">Claims Translation Engine</h2>
          <p className="text-xs text-slate-400 leading-normal">
            Indian Ayush and FSSAI claim structures are often highly clinical. Enter claims below to perform reframing into FDA structure/function compliant definitions.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300">Raw Exporter Claims</label>
          <textarea
            value={claimsInput}
            onChange={(e) => setClaimsInput(e.target.value)}
            className="w-full h-28 p-3 border border-slate-800 bg-slate-950/20 rounded-lg text-slate-300 text-xs focus:border-brand-teal-50 outline-none resize-none"
            placeholder="Enter clinical claims to translate..."
          />
        </div>

        <button
          onClick={handleTranslateClaims}
          className="w-full bg-brand-teal-50 hover:bg-teal-600 text-white font-bold py-2.5 rounded-lg text-xs transition duration-200 cursor-pointer shadow-lg shadow-teal-500/10"
        >
          🔄 Analyze &amp; Reframe Claims
        </button>

        {/* Translation Output Results */}
        {translationResults.length > 0 && (
          <div className="flex flex-col gap-4 mt-2">
            {translationResults.map((res, i) => (
              <div
                key={i}
                className="bg-slate-950/30 border border-slate-850 p-5 rounded-xl border-l-4 flex flex-col gap-3"
                style={{ borderLeftColor: res.riskLevel === 'CRITICAL' || res.riskLevel === 'HIGH' ? 'var(--color-brand-danger)' : 'var(--color-brand-success)' }}
              >
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <strong className="text-xs text-slate-200 uppercase tracking-wide truncate max-w-[280px]">
                    {res.classification}
                  </strong>
                  <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${RISK_BADGE_CLASSES[res.riskLevel] || 'bg-slate-800 text-slate-400'}`}>
                    {res.riskLevel} RISK
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Detected: <em className="text-slate-300 font-serif">"{res.original}"</em>
                </p>
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-300">FDA Reason:</strong> {res.reason}
                </p>
                <div className="bg-brand-teal-50/5 border border-brand-teal-50/20 p-3 rounded-lg flex flex-col gap-1">
                  <span className="text-[9px] text-brand-teal-50 uppercase tracking-wider font-extrabold">
                    FDA-Permissible Reframe:
                  </span>
                  <strong className="text-sm text-slate-200">"{res.reframe}"</strong>
                </div>
                <span className="text-[10px] text-slate-500 italic block">Citation: {res.citation}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Recalculator */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md flex flex-col gap-5">
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-1">RDA Recalculation Engine</h2>
          <p className="text-xs text-slate-400 leading-normal">
            Indian FSSAI Recommended Dietary Allowances (RDA%) differ significantly from US FDA Daily Values (DV%). Recalculate weights based on 21 CFR §101.9.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Active Nutrient Compound</label>
            <select
              value={nutrientKey}
              onChange={(e) => setNutrientKey(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-800 bg-slate-950/40 rounded-lg text-slate-300 text-xs focus:border-brand-teal-50 outline-none"
            >
              <option value="vitamin_c">Vitamin C (US DV baseline: 90mg)</option>
              <option value="vitamin_d">Vitamin D (US DV baseline: 20mcg / 800 IU)</option>
              <option value="calcium">Calcium (US DV baseline: 1300mg)</option>
              <option value="zinc">Zinc (US DV baseline: 11mg)</option>
              <option value="iron">Iron (US DV baseline: 18mg)</option>
              <option value="vitamin_b12">Vitamin B12 (US DV baseline: 2.4mcg)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Ingredient Amount (in mg or mcg per serving)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-800 bg-slate-950/40 rounded-lg text-slate-300 text-xs focus:border-brand-teal-50 outline-none"
              min="0"
              step="0.1"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Indian FSSAI % RDA declared on label</label>
            <input
              type="number"
              value={declaredRda}
              onChange={(e) => setDeclaredRda(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-800 bg-slate-950/40 rounded-lg text-slate-300 text-xs focus:border-brand-teal-50 outline-none"
              min="0"
              step="1"
            />
          </div>

          <button
            onClick={handleRecalculateRDA}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-lg text-xs border border-slate-700 transition duration-200 cursor-pointer"
          >
            ⚙️ Recalculate US Daily Value
          </button>
        </div>

        {/* Recalc output */}
        {recalcResult && (
          <div className="bg-slate-950/30 border border-slate-800/80 p-5 rounded-xl flex flex-col gap-3 text-xs animate-slide-in">
            <div className="flex justify-between items-center flex-wrap gap-2 text-xs">
              <span className="text-slate-300 leading-normal">
                <strong>{recalcResult.name}</strong> — US FDA DV baseline: <strong>{recalcResult.baseline} {recalcResult.unit}</strong>
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Amount: <strong className="text-slate-200">{recalcResult.amount} {recalcResult.unit}</strong> | Indian FSSAI RDA declared: <strong className="text-slate-200">{recalcResult.declared}%</strong>
            </p>
            <hr className="border-slate-800/60" />
            <p className="text-brand-teal-50 text-sm font-bold">
              Recalculated US FDA % Daily Value: <span className="text-base text-white">{recalcResult.calculated}%</span>
            </p>
            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              {recalcResult.note}. Must be declared on Supplement Facts panel.
            </p>
            {recalcResult.isMajorGap ? (
              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500 leading-relaxed text-[11px]">
                ⚠️ Significant gap: FSSAI RDA ({recalcResult.declared}%) vs US DV ({recalcResult.calculated}%). Current label value cannot be used as-is on US packaging.
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 leading-relaxed text-[11px]">
                ✅ Minor difference. US DV figure must still replace FSSAI RDA on the Supplement Facts panel.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
