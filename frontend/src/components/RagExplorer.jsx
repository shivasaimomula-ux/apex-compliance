import React, { useState, useEffect } from 'react';
import COMPLIANCE_DATABASE from '../mock_data.js';

export default function RagExplorer() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  // Draft letter states
  const [draftTitle, setDraftTitle] = useState('NDI Notification Cover Letter');
  const [draftCitation, setDraftCitation] = useState('21 CFR §190.6');
  const [draftText, setDraftText] = useState('');
  const [originalTemplate, setOriginalTemplate] = useState('');

  // Run Search logic
  const handleSearch = (searchQuery) => {
    const q = (searchQuery || query).trim().toLowerCase();
    if (!q) {
      alert('Please enter a search query.');
      return;
    }
    setHasSearched(true);

    const matches = [];
    COMPLIANCE_DATABASE.enforcementPrecedents.forEach((p) => {
      const isMatch =
        p.warningTextSnippet.toLowerCase().includes(q) ||
        p.exporter.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.violationsCited.some((v) => v.toLowerCase().includes(q));

      if (isMatch) {
        matches.push(p);
      }
    });

    setResults(matches);
    generateDraft(q);
  };

  const handleQuickSearch = (term) => {
    setQuery(term);
    handleSearch(term);
  };

  // Generate dynamic template letter based on search terms
  const generateDraft = (q) => {
    let title = 'NDI Notification Cover Letter';
    let citation = '21 CFR §190.6';
    let template = `[EXPORTER LETTERHEAD]
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

FDA Food and Drug Administration
Office of Dietary Supplement Programs (HFS-810)
5001 Campus Drive, College Park, MD 20740

SUBJECT: 75-Day New Dietary Ingredient Notification — Withania somnifera Extract

Dear Director,

Pursuant to FDCA §413(a)(2) and 21 CFR §190.6, we submit this notification for Withania somnifera Root Extract (Standardized ≥2.5% Withanolides) as a New Dietary Ingredient in the US.

1. Manufacturer: [Your Organization, India]
2. Ingredient: Ashwagandha (Withania somnifera) dry root extract
3. Conditions of Use: 1,000mg/day (500mg × 2 capsules). Not for pregnant women or children under 18.
4. History of Safe Use: Documented in Indian Ayurvedic Pharmacopoeia. Attached: RCT safety data at 1,000mg/day.

Sincerely,
[Regulatory Affairs Officer]`;

    if (/heavy|lead|metal|prop.?65|arsenic/.test(q)) {
      title = 'California Prop 65 Safe Harbor Warning Label Plan';
      citation = 'Title 27 CCR §25603';
      template = `[PACKAGING DESIGN SPECIFICATIONS — PROP 65 WARNING]

MANDATORY for California sales:

⚠️ WARNING: This product can expose you to chemicals including Lead, known to the State of California to cause cancer and birth defects or other reproductive harm. For more information go to www.P65Warnings.ca.gov.

PRINT REQUIREMENTS (27 CCR §25601–25603):
1. Font Size: ≥6pt, no smaller than other safety warnings on label
2. Icon: Bold black exclamation triangle, yellow background
3. Placement: Visible on Principal Display Panel before purchase

INTERNAL REMEDIATION:
Target raw material Lead < 0.5 ppm to avoid warning requirement.
Commission Prop 65-standard batch testing from ISO 17025 US lab.`;
    } else if (/identity|gmp|111/.test(q)) {
      title = 'FDA Form 483 Response — Raw Material Identity Testing';
      citation = '21 CFR §111.75(a)(1)(i)';
      template = `[OFFICIAL RESPONSE TO FDA FORM 483 OBSERVATION]
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

FDA CFSAN Compliance Branch
RE: Observation — Failure to verify botanical ingredient identity

CORRECTIVE ACTION PLAN:

1. IMMEDIATE (30 days): Established SOP-QC-743 requiring HPTLC identity testing for 100% of incoming botanical raw materials, signed by independent QC Unit.

2. SUPPLIER QUALIFICATION (60 days): All botanical suppliers will undergo formal qualification audit per 21 CFR §111.70.

3. DOCUMENTATION (90 days): All batch records updated with in-house identity test result attached and QC independent sign-off prior to production release.

Sincerely,
[Head of Quality Control Unit]
[FEI Registration Number: XXXXXXXXX]`;
    } else if (/ndi|shilajit|novel/.test(q)) {
      title = 'NDI Pre-Submission Meeting Request';
      citation = 'FDCA §413; FDA ODSP NDI Guidance (2022)';
      template = `[EXPORTER LETTERHEAD]
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

FDA Office of Dietary Supplement Programs (ODSP)
HFS-810, 5001 Campus Drive, College Park, MD 20740

SUBJECT: Pre-Submission Meeting Request — NDI Notification for Purified Shilajit Extract

We request a voluntary pre-submission meeting for our planned NDI notification for:
- Ingredient: Purified Shilajit (Asphaltum punjabianum) extract, ≥60% Fulvic Acid
- Proposed serving: 500mg/day
- Intended use: Energy and cognitive support dietary supplement

Issues for Discussion:
1. Safety substantiation approach — traditional use vs clinical RCT evidence
2. Heavy metal specification alignment with Prop 65
3. Characterization requirements for standardization of Fulvic Acid

Respectfully,
[Regulatory Affairs Director]`;
    }

    setDraftTitle(title);
    setDraftCitation(citation);
    setDraftText(template.trim());
    setOriginalTemplate(template.trim());
  };

  // Copy helper
  const handleCopy = () => {
    navigator.clipboard.writeText(draftText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Reset template helper
  const handleReset = () => {
    setDraftText(originalTemplate);
  };

  // Run initial default meeting request template
  useEffect(() => {
    generateDraft('ndi');
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      {/* Search Box Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-1">Regulatory RAG Search Engine</h2>
          <p className="text-xs text-slate-400 leading-normal">
            Query historical CFSAN Warning Letters, Import Alerts, and 21 CFR sections. Try searching: "lead", "identity testing", "unapproved claims", "dwpe", "ndi", "asava", or "clinically proven".
          </p>
        </div>

        <div className="flex gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2.5 border border-slate-800 bg-slate-950/40 rounded-lg text-slate-300 text-xs focus:border-brand-teal-50 outline-none"
            placeholder="Search warning letters, CFR sections, or enforcement actions..."
          />
          <button
            onClick={() => handleSearch()}
            className="bg-brand-teal-50 hover:bg-teal-600 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition duration-200 cursor-pointer shadow-md shrink-0"
          >
            🔍 Search DB
          </button>
        </div>

        {/* Quick Search Tag Buttons */}
        <div className="flex gap-2 items-center flex-wrap mt-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick search:</span>
          {['lead', 'identity', 'unapproved', 'ndi', 'dwpe', 'asava'].map((tag) => (
            <button
              key={tag}
              onClick={() => handleQuickSearch(tag)}
              className="bg-slate-800 hover:bg-slate-700/60 text-slate-300 text-[10px] font-bold py-1 px-2.5 rounded transition duration-200 border border-slate-750 cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* RAG Results Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Left Side: Results List */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-100 px-1">Search Results</h3>

          {!hasSearched ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 text-xs shadow-md backdrop-blur-md">
              Enter queries above to retrieve enforcement actions. Try searching "identity", "metals", or "asava".
            </div>
          ) : results.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md flex flex-col gap-4 text-xs">
              <div className="text-center text-slate-400">
                🔍 No matches found for "<strong>{query}</strong>".
              </div>
              <div className="p-4 border border-slate-800 bg-slate-950/20 rounded-lg space-y-1">
                <span className="text-brand-teal-50 font-bold block uppercase tracking-wider text-[10px]">
                  CFR Reference Hint:
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  21 CFR §111.75(a)(1) — Identity testing is required for all botanical raw materials.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {results.map((p, idx) => {
                const typeClass = p.type.includes('Warning')
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20';

                return (
                  <div
                    key={idx}
                    className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg backdrop-blur-md flex flex-col gap-3 text-xs animate-slide-in"
                  >
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <span className={`text-[8px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${typeClass}`}>
                        {p.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Date: {p.date}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-200">Exporter: {p.exporter}</h4>

                    <div className="space-y-1">
                      <strong className="text-slate-300 block font-bold">Violations Cited:</strong>
                      <ul className="list-disc pl-5 text-slate-400 space-y-1">
                        {p.violationsCited.map((v, i) => (
                          <li key={i} className="leading-relaxed">
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <blockquote className="bg-slate-950/30 p-3.5 border-l-3 border-brand-teal-50 rounded-r-lg font-serif italic text-slate-400 leading-normal text-[11px]">
                      "{p.warningTextSnippet}"
                    </blockquote>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Draft Letters Box */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-100 px-1">Response Drafts</h3>

          <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-5 shadow-lg flex flex-col gap-3 text-xs animate-slide-in">
            <h4 className="text-brand-teal-50 font-extrabold text-xs uppercase tracking-wider">
              📝 Editable Draft: {draftTitle}
            </h4>
            <span className="text-[10px] text-slate-400 block font-semibold">Citation: {draftCitation}</span>

            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full h-80 p-4 bg-slate-950/40 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-400 focus:border-brand-teal-50 outline-none resize-none leading-relaxed"
              spellCheck="false"
            />

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="bg-slate-800 hover:bg-slate-700/60 text-slate-200 text-xs font-semibold py-2 px-4 border border-slate-700 rounded-lg transition duration-200 cursor-pointer shrink-0"
              >
                {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
              </button>
              <button
                onClick={handleReset}
                className="bg-slate-800 hover:bg-slate-700/60 text-slate-200 text-xs font-semibold py-2 px-4 border border-slate-700 rounded-lg transition duration-200 cursor-pointer shrink-0"
              >
                ↩️ Reset Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
