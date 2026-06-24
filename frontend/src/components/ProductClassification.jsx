import React, { useState, useEffect } from 'react';

const VERDICT_BADGE_CLASSES = {
  'DIETARY SUPPLEMENT': 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  'CONVENTIONAL FOOD': 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  'UNAPPROVED NEW DRUG': 'bg-red-500/10 text-red-500 border border-red-500/20',
  'MISBRANDED PRODUCT': 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  'REQUIRES_REVIEW': 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
};

export default function ProductClassification({ initialProduct }) {
  const [productName, setProductName] = useState('Traditional Ayurvedic Chyawanprash Jam');
  const [ingredients, setIngredients] = useState('Amalaki, Sugar, Honey, Ghee, Swarna Bhasma (Gold Ash), Pippali, Twak');
  const [claims, setClaims] = useState('Cures respiratory disorders and chronic asthma naturally. Builds 100% immunity against viral infections and seasonal coughs.');
  const [dosageForm, setDosageForm] = useState('paste');
  const [running, setRunning] = useState(false);

  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  // Sync with selected document when it changes
  useEffect(() => {
    if (initialProduct) {
      if (initialProduct.productName) setProductName(initialProduct.productName);
      if (initialProduct.extractedData) {
        if (initialProduct.extractedData.ingredientsRaw) {
          setIngredients(initialProduct.extractedData.ingredientsRaw);
        } else if (initialProduct.extractedData.ingredients) {
          setIngredients(initialProduct.extractedData.ingredients.map(i => i.name).join(', '));
        }
        if (initialProduct.extractedData.claimsRaw) {
          setClaims(initialProduct.extractedData.claimsRaw);
        } else if (initialProduct.extractedData.claims) {
          setClaims(initialProduct.extractedData.claims.join(' '));
        }
      }
      const dosageMap = { 'Paste / Jam': 'paste', 'Fermented Liquid (Arishta)': 'beverage' };
      if (initialProduct.dosageForm && dosageMap[initialProduct.dosageForm]) {
        setDosageForm(dosageMap[initialProduct.dosageForm]);
      }
    }
  }, [initialProduct]);

  // Run the classification rules
  const handleRun = () => {
    const nextErrors = {};
    if (!productName.trim()) nextErrors.productName = 'Product name is required.';
    if (!ingredients.trim()) nextErrors.ingredients = 'At least one ingredient is required.';
    if (!claims.trim()) nextErrors.claims = 'Please enter at least one marketing claim.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setRunning(true);

    // Simulate rule validation runtime delay for UI micro-interaction
    setTimeout(() => {
      setRunning(false);
      calculateClassification();
    }, 600);
  };

  const calculateClassification = () => {
    const ingredientsList = ingredients.split(',').map(i => i.trim().toLowerCase());
    const claimsText = claims.trim().toLowerCase();

    let classification = "DIETARY SUPPLEMENT";
    let law = "DSHEA Act 1994 / 21 CFR §101.36";
    let citation = "21 CFR §101.36 (DSHEA 1994)";
    let desc = "Product eligibility matches US Dietary Supplement definitions. Only structure/function health assertions are permitted.";
    let badgeClass = "DIETARY SUPPLEMENT";

    let step1 = "✅ Permissible (No disease names detected)";
    let step2 = "✅ Clear (All ingredients appear eligible)";
    let step3 = "✅ Approved (Dosage form matches dietary supplement)";
    let step4 = "✅ Checked (No Ayurvedic override triggers)";

    // Gate 1: Intended use check (disease keywords)
    const prohibitedClaims = [
      "cure", "cures", "treat", "treats", "prevent", "prevents", "diabetes", 
      "arthritis", "cancer", "cholesterol", "asthma", "infection", 
      "depression", "hypothyroidism", "infertility", "hypertension", 
      "laxation", "laxative", "detoxif"
    ];

    const hasProhibitedClaim = prohibitedClaims.some(term => new RegExp(`\\b${term}\\b`, 'i').test(claimsText));
    if (hasProhibitedClaim) {
      classification = "UNAPPROVED NEW DRUG";
      law = "21 USC §321(g)(1)(B), 21 CFR §310";
      citation = "FDCA §201(g)(1)(B)";
      desc = "Product makes explicit disease statements. Without an approved NDA, this is an unapproved new drug subject to immediate import seizure.";
      step1 = "❌ FAILED (Contains unapproved disease/drug claims)";
    }

    // Gate 2: Ingredient Safety check
    const forbiddenIngredients = [
      "swarna bhasma", "gold ash", "abhraka bhasma", "tamra bhasma", 
      "naga bhasma", "lead", "mercury", "ephedra", "aristolochia"
    ];
    const detected = forbiddenIngredients.filter(f => ingredientsList.some(i => i.includes(f)));

    if (detected.length > 0) {
      classification = "UNAPPROVED NEW DRUG";
      law = "FDCA §402(a)(1)";
      citation = "FDA Import Alert 54-15";
      desc = `Contains prohibited material(s): ${detected.join(', ')}. Triggers automatic Detention Without Physical Examination (DWPE).`;
      step2 = `❌ FAILED (Prohibited ingredient(s): ${detected.join(', ')})`;
    }

    // Gate 3: Dosage form validation
    if (["beverage", "food_bar"].includes(dosageForm) && classification === "DIETARY SUPPLEMENT") {
      classification = "CONVENTIONAL FOOD";
      law = "21 CFR Part 101";
      citation = "21 CFR §101 (Nutrition Facts)";
      desc = "Beverage or food bar dosage form requires a Nutrition Facts (not Supplement Facts) panel. Structure/function claims are invalid.";
      step3 = "⚠️ OVERRULED (Conventional food dosage form — Nutrition Facts panel required)";
    }

    // Gate 4: Ayurvedic specific override warnings
    if (/bhasma/i.test(ingredients)) {
      step4 = "❌ FAILED (Metallic Bhasma — prohibited under FDCA §402)";
    } else if (/asava|arishta/i.test(ingredients)) {
      step4 = "⚠️ WARNING (Fermented liquid — TTB alcohol permit required)";
    } else if (/shilajit/i.test(ingredients)) {
      step4 = "⚠️ WARNING (Shilajit — NDI notification required 75 days before US launch)";
    }

    setResult({
      classification,
      law,
      citation,
      desc,
      badgeClass,
      steps: [step1, step2, step3, step4],
    });
  };

  // Run automatically on first render
  useEffect(() => {
    calculateClassification();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 animate-slide-in">
      {/* Left Form Panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md">
        <h2 className="text-base font-bold text-slate-100 mb-6">Classification Input Gate</h2>

        <div className="space-y-4">
          {/* Product Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Product / Formulation Name</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-slate-300 text-xs outline-none bg-slate-950/20 focus:border-brand-teal-50 ${
                errors.productName ? 'border-red-500' : 'border-slate-800'
              }`}
            />
            {errors.productName && <span className="text-[10px] text-red-500 font-bold">{errors.productName}</span>}
          </div>

          {/* Ingredients */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Ingredients List (comma separated)</label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className={`w-full h-24 p-3 border rounded-lg text-slate-300 text-xs outline-none bg-slate-950/20 focus:border-brand-teal-50 resize-none`}
            />
            {errors.ingredients && <span className="text-[10px] text-red-500 font-bold">{errors.ingredients}</span>}
          </div>

          {/* Marketing Claims */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Marketing Claims / Label Statements</label>
            <textarea
              value={claims}
              onChange={(e) => setClaims(e.target.value)}
              className={`w-full h-28 p-3 border rounded-lg text-slate-300 text-xs outline-none bg-slate-950/20 focus:border-brand-teal-50 resize-none`}
            />
            {errors.claims && <span className="text-[10px] text-red-500 font-bold">{errors.claims}</span>}
          </div>

          {/* Dosage Form */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Dosage Form</label>
            <select
              value={dosageForm}
              onChange={(e) => setDosageForm(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-800 bg-slate-950/40 rounded-lg text-slate-300 text-xs focus:border-brand-teal-50 outline-none"
            >
              <option value="capsule">Capsule / Softgel</option>
              <option value="tablet">Tablet / Pill</option>
              <option value="powder">Powder / Churna</option>
              <option value="paste">Traditional Jam / Paste</option>
              <option value="beverage">Beverage / Fermented liquid</option>
              <option value="food_bar">Functional Food Bar</option>
            </select>
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={running}
            className="w-full bg-brand-teal-50 hover:bg-teal-600 text-white font-bold py-3 rounded-lg text-xs transition duration-200 cursor-pointer shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2"
          >
            {running ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin-custom shrink-0" />
                <span>Running Cascade...</span>
              </>
            ) : (
              <span>⚖️ Run Classification Cascade</span>
            )}
          </button>
        </div>
      </div>

      {/* Right Output Panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col gap-6 shadow-lg backdrop-blur-md">
        <h2 className="text-base font-bold text-slate-100 border-b border-slate-800/60 pb-3">Audit Verdict</h2>

        {result && (
          <div className="flex flex-col gap-5">
            {/* Verdict Box */}
            <div className="text-center p-6 bg-slate-950/30 rounded-xl border border-slate-800">
              <span className={`inline-block text-[10px] font-bold py-1 px-3.5 rounded-full uppercase tracking-wider mb-3 ${VERDICT_BADGE_CLASSES[result.classification] || 'bg-slate-800 text-slate-400'}`}>
                {result.classification}
              </span>
              <h3 className="text-lg font-extrabold text-white mb-1 leading-tight">{result.classification}</h3>
              <span className="text-[10px] text-slate-400 block tracking-wider font-semibold">
                Governing Law: {result.law}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 leading-relaxed leading-normal">{result.desc}</p>

            <hr className="border-slate-800/60" />

            {/* Step Check list */}
            <div>
              <h3 className="text-[10px] font-black tracking-wider text-brand-teal-50 uppercase mb-3">
                Deterministic Decision Steps
              </h3>
              <div className="flex flex-col gap-2.5 text-xs text-slate-400">
                <div className="leading-relaxed">
                  Gate 1 — Intended Use Claim Extraction: <span dangerouslySetInnerHTML={{ __html: result.steps[0] }} />
                </div>
                <div className="leading-relaxed">
                  Gate 2 — Ingredient Status Lookup: <span dangerouslySetInnerHTML={{ __html: result.steps[1] }} />
                </div>
                <div className="leading-relaxed">
                  Gate 3 — Dosage Form Validation: <span dangerouslySetInnerHTML={{ __html: result.steps[2] }} />
                </div>
                <div className="leading-relaxed">
                  Gate 4 — Ayurvedic Specific Override Rules: <span dangerouslySetInnerHTML={{ __html: result.steps[3] }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
