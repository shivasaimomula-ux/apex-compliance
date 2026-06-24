import React, { useState, useRef } from 'react';

// Regulatory matching patterns for highlighting (Offline local linter)
const DISEASE_PATTERNS = [
  { pattern: /\bcure[sd]?\b/i, term: 'cure/cures' },
  { pattern: /\btreat(s|ed|ment|ing)?\b/i, term: 'treat/treatment' },
  { pattern: /\bprevent(s|ion|ing)?\b/i, term: 'prevent/prevention' },
  { pattern: /\bdiabetes\b|\bdiabetic\b|\bmadhumeh\b|\bblood sugar control\b/i, term: 'diabetes/blood sugar control' },
  { pattern: /\barthritis\b|\brheumat/i, term: 'arthritis' },
  { pattern: /\bcancer\b|\banti.?tumor\b/i, term: 'cancer' },
  { pattern: /\bhigh cholesterol\b|\bcholesterol.?lower/i, term: 'high cholesterol treatment' },
  { pattern: /\basthma\b/i, term: 'asthma' },
  { pattern: /\binfection\b/i, term: 'infection (disease)' },
  { pattern: /\bclinical depression\b|\bchronic depression\b/i, term: 'clinical depression' },
  { pattern: /\bhypothyroidism\b|\bthyroid disorder\b|\bthyroid disease\b/i, term: 'hypothyroidism' },
  { pattern: /\binfertility\b/i, term: 'infertility (disease)' },
  { pattern: /\bhypertension\b|\bhigh blood pressure\b/i, term: 'hypertension' },
  { pattern: /\bkidney (disease|failure|disorder)\b/i, term: 'kidney disease' },
  { pattern: /\bliver disease\b|\bhepatic (failure|disorder)\b/i, term: 'liver disease' },
  { pattern: /\blaxati(ve|on|ng)\b/i, term: 'laxation (drug-like action)' },
  { pattern: /\bbowel.{0,15}clean\b/i, term: 'bowel cleansing (drug claim)' },
  { pattern: /\bcolon.{0,15}clean\b/i, term: 'colon cleansing (drug claim)' },
  { pattern: /\bdetoxif(y|ies|ication|ying)\b/i, term: 'detoxification (organ)' },
  { pattern: /\bpurge[sd]?\b|\bpurgativ/i, term: 'purgative action (drug-like)' },
  { pattern: /\bfight(s|ing)?.{0,20}infection/i, term: 'fighting infections' },
  { pattern: /\bimmunit(y|ies).{0,15}(boost|enhanc|build|fight)/i, term: 'immunity boosting (prevention claim)' },
  { pattern: /\bweight loss\b|\bfat burn/i, term: 'weight loss' },
  { pattern: /\banti.?inflamm/i, term: 'anti-inflammatory (drug-like)' },
  { pattern: /\bpain relief\b|\breliev.{0,15}pain\b/i, term: 'pain relief (drug claim)' },
  { pattern: /\blower.{0,15}blood pressure\b/i, term: 'blood pressure lowering' },
  { pattern: /\bpsoriasis\b|\beczema\b|\bdermatitis\b/i, term: 'skin disease' },
  { pattern: /\bmenstrual irregularit/i, term: 'menstrual disorder treatment' },
  { pattern: /\bUTI\b|urinary tract infection/i, term: 'UTI treatment (drug claim)' },
  { pattern: /\bnerve debility\b/i, term: 'nerve debility (drug claim)' },
  { pattern: /\bchronic fatigue\b/i, term: 'chronic fatigue syndrome' },
  { pattern: /\bIBS\b|irritable bowel/i, term: 'IBS (disease)' },
];

const PROHIBITED_INGREDIENTS_LIST = [
  { name: 'Swarna Bhasma', type: 'PROHIBITED_METAL' },
  { name: 'Gold Ash', type: 'PROHIBITED_METAL' },
  { name: 'Abhraka Bhasma', type: 'PROHIBITED_METAL' },
  { name: 'Tamra Bhasma', type: 'PROHIBITED_METAL' },
  { name: 'Naga Bhasma', type: 'PROHIBITED_METAL' },
  { name: 'Vanga Bhasma', type: 'PROHIBITED_METAL' },
  { name: 'Hartala', type: 'PROHIBITED_METAL' },
  { name: 'Manahshila', type: 'PROHIBITED_METAL' },
  { name: 'Ephedra', type: 'PROHIBITED' },
  { name: 'Ephedrine', type: 'PROHIBITED' },
  { name: 'Aristolochic', type: 'PROHIBITED' },
  { name: 'Aristolochia', type: 'PROHIBITED' },
  { name: 'Kava', type: 'RESTRICTED' },
  { name: 'Comfrey', type: 'RESTRICTED' },
  { name: 'Coltsfoot', type: 'RESTRICTED' },
  { name: 'Pennyroyal', type: 'RESTRICTED' },
  { name: 'Aconite', type: 'RESTRICTED' },
  { name: 'Belladonna', type: 'RESTRICTED' },
];

export default function DocumentAudit({
  dossier,
  onStageFiles,
  onClearDossier,
  onRemoveDossierFile,
  onRunAnalysis,
  analyzing,
  aiEnabled,
  aiStatusText,
  selectedDocument,
  onSelectMockDoc,
  uploadMode,
  setUploadMode,
  onRunPastedAnalysis,
  onNavigateToView,
}) {
  const [pastePanelOpen, setPastePanelOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteName, setPasteName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('raw');

  const fileInputRef = useRef(null);

  // Handle file drop & browsing
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length) {
      onStageFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      onStageFiles(Array.from(e.dataTransfer.files));
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current.click();
  };

  // Run manually pasted text audit
  const handlePastedAudit = () => {
    if (!pasteText.trim() || pasteText.trim().length < 30) {
      alert('Please paste at least some document content (minimum 30 characters).');
      return;
    }
    onRunPastedAnalysis(pasteText, pasteName || 'Pasted_Document.txt');
    setPasteText('');
    setPasteName('');
  };

  // Helper function to render text with highlighted regulatory violations
  const highlightText = (rawText) => {
    if (!rawText) return '';
    let highlightedText = rawText.substring(0, 3000);

    // Highlighting disease patterns
    DISEASE_PATTERNS.forEach((dp) => {
      highlightedText = highlightedText.replace(dp.pattern, (match) =>
        `<span class="bg-red-500/20 border-b border-dashed border-red-500 font-bold px-0.5 rounded cursor-help" title="Prohibited claim keyword: ${dp.term}">${match}</span>`
      );
    });

    // Highlighting prohibited ingredients
    PROHIBITED_INGREDIENTS_LIST.forEach((ing) => {
      const re = new RegExp(`\\b${ing.name.replace(/[()]/g, '\\$&')}\\b`, 'gi');
      highlightedText = highlightedText.replace(re, (match) =>
        `<span class="bg-red-500/20 border-b border-dashed border-red-500 font-bold px-0.5 rounded cursor-help" title="Prohibited ingredient">${match}</span>`
      );
    });

    return highlightedText;
  };

  // AI Online/Offline badge states
  const aiStatusColor = analyzing
    ? 'bg-amber-500'
    : aiEnabled
    ? 'bg-emerald-500'
    : 'bg-yellow-500';

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      {/* 1. DOCUMENT AUDIT INPUT CARD */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg backdrop-blur-md">
        <h2 className="text-base font-bold text-slate-100 mb-2">Document Audit Panel</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Choose a realistic Indian export-grade mock document to run the OCR scanning parser and compliance audit engine. Five documents are available.
        </p>

        {/* Tab switcher: Live Upload vs Mock Docs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setUploadMode('live')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
              uploadMode === 'live'
                ? 'bg-brand-teal-50 text-white shadow-md shadow-teal-500/10'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
            }`}
          >
            📤 Upload Your Document
          </button>
          <button
            onClick={() => setUploadMode('mock')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
              uploadMode === 'mock'
                ? 'bg-brand-teal-50 text-white shadow-md shadow-teal-500/10'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
            }`}
          >
            🗂️ Use Demo Documents
          </button>
        </div>

        {/* LIVE UPLOAD DISPLAY */}
        {uploadMode === 'live' && (
          <div className="flex flex-col gap-4">
            {/* AI status badge */}
            <div className="flex items-center gap-2 text-[10px] px-3.5 py-2 rounded-lg border border-slate-800 bg-teal-500/5 max-w-max">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${aiStatusColor}`} />
              <span className="text-slate-300 font-semibold">{aiStatusText}</span>
            </div>

            {/* Hidden Input file selector */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.txt,.csv,.tsv"
              multiple
              className="hidden"
            />

            {/* Drag & Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerBrowse}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition duration-350 overflow-hidden ${
                isDragOver
                  ? 'border-brand-teal-50 bg-teal-500/5'
                  : 'border-slate-800/80 bg-slate-950/20 hover:border-brand-teal-50 hover:bg-teal-500/5'
              }`}
            >
              {analyzing && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-teal-50 to-transparent shadow-[0_0_12px_#14b8a6] scan-beam-active z-10" />
              )}
              <div className="text-4xl text-brand-teal-50 mb-3 select-none">📄</div>
              <h3 className="text-sm font-bold text-slate-200">Drag &amp; Drop Your Product Dossier Here</h3>
              <p className="text-[10px] text-slate-400 mt-2 max-w-md mx-auto">
                Add one or more files — Label scans, CoA reports, Master Formulas. They're analyzed together as one product.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerBrowse();
                }}
                className="mt-5 bg-brand-teal-50 hover:bg-teal-600 text-white font-bold py-2 px-5 rounded-lg text-xs transition duration-200 cursor-pointer shadow-md"
              >
                📁 Browse &amp; Add Files
              </button>
            </div>

            {/* Staged dossier files */}
            {dossier.length > 0 && (
              <div className="bg-slate-950/30 border border-slate-800/60 rounded-lg p-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <strong className="text-xs font-extrabold text-slate-200">
                    📦 Dossier ({dossier.length} document{dossier.length === 1 ? '' : 's'})
                  </strong>
                  <button
                    onClick={onClearDossier}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1 px-2.5 rounded transition duration-200 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {dossier.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center gap-3 p-2 border border-slate-800 bg-slate-900/30 rounded-md text-xs"
                    >
                      <span className="truncate text-slate-300">
                        📄 {doc.name}{' '}
                        <span className="text-[10px] text-slate-400">
                          ({(doc.text.length / 1000).toFixed(1)}k chars)
                        </span>
                      </span>
                      <button
                        onClick={() => onRemoveDossierFile(idx)}
                        className="bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 text-[10px] font-bold px-2 py-1 rounded transition duration-200 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onRunAnalysis()}
                  disabled={analyzing}
                  className="w-full bg-brand-teal-50 hover:bg-teal-600 disabled:bg-teal-800 text-white font-bold py-3 rounded-lg text-xs transition duration-200 cursor-pointer shadow-lg shadow-teal-500/10"
                >
                  {analyzing ? '🧠 Analyzing dossier with Claude…' : '🤖 Analyze Full Dossier with AI'}
                </button>
              </div>
            )}

            {/* Paste Text Panel Toggle */}
            <div className="mt-4">
              <button
                onClick={() => setPastePanelOpen(!pastePanelOpen)}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 px-4 border border-slate-700 rounded-lg transition duration-200 cursor-pointer"
              >
                {pastePanelOpen
                  ? '✕ Close Paste Panel'
                  : '✏️ Or Paste Document Text Manually (for images / scanned docs)'}
              </button>

              {pastePanelOpen && (
                <div className="bg-slate-950/20 border border-slate-800/60 rounded-xl p-4 mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300">
                      Paste the extracted text from your label, CoA, or Master Formula below:
                    </label>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      className="w-full h-44 p-3 border border-slate-800 bg-slate-900/40 rounded-lg text-slate-300 text-xs font-mono focus:border-brand-teal-50 outline-none resize-none"
                      placeholder={`Example: Product Name: Triphala Churna\nIngredients: Haritaki 33%, Vibhitaki 33%, Amalaki 33%\nClaims: Relieves constipation and detoxifies the colon...`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-300">Document Name (optional)</label>
                    <input
                      type="text"
                      value={pasteName}
                      onChange={(e) => setPasteName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-800 bg-slate-900/40 rounded-lg text-slate-300 text-xs focus:border-brand-teal-50 outline-none"
                      placeholder="e.g. Triphala_Label_v2.pdf"
                    />
                  </div>
                  <button
                    onClick={handlePastedAudit}
                    className="w-full bg-brand-teal-50 hover:bg-teal-600 text-white font-bold py-2.5 rounded-lg text-xs transition duration-200 cursor-pointer shadow-md"
                  >
                    🔬 Analyze Pasted Text
                  </button>
                </div>
              )}
            </div>

            {/* Ingress Spinner status */}
            {analyzing && !dossier.length && (
              <div className="mt-4 p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl text-center">
                <div className="w-8 h-8 rounded-full border-4 border-slate-800 border-t-brand-teal-50 animate-spin-custom mx-auto mb-3" />
                <p className="text-xs text-brand-teal-50 font-bold">Extracting text and running compliance rules...</p>
              </div>
            )}
          </div>
        )}

        {/* MOCK DEMO DISPLAY */}
        {uploadMode === 'mock' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">Select a pre-loaded Indian export-grade document to run the audit:</p>
            <div className="flex gap-2.5 flex-wrap">
              <button
                onClick={() => onSelectMockDoc('label')}
                className="bg-slate-800 hover:bg-slate-700/60 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700 transition duration-200 cursor-pointer"
              >
                🏷️ Chyawanprash Label
              </button>
              <button
                onClick={() => onSelectMockDoc('coa')}
                className="bg-slate-800 hover:bg-slate-700/60 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700 transition duration-200 cursor-pointer"
              >
                📋 Ashwagandha CoA
              </button>
              <button
                onClick={() => onSelectMockDoc('mmf')}
                className="bg-slate-800 hover:bg-slate-700/60 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700 transition duration-200 cursor-pointer"
              >
                🏭 Triphala MMR
              </button>
              <button
                onClick={() => onSelectMockDoc('shilajit')}
                className="bg-slate-800 hover:bg-slate-700/60 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700 transition duration-200 cursor-pointer"
              >
                🪨 Shilajit Extract CoA
              </button>
              <button
                onClick={() => onSelectMockDoc('asava')}
                className="bg-slate-800 hover:bg-slate-700/60 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700 transition duration-200 cursor-pointer"
              >
                🍶 Dashamularishta Label
              </button>
            </div>
            <div className="border border-slate-800/80 rounded-xl p-8 bg-slate-950/20 text-center select-none text-slate-400 text-sm">
              📂 Select a demo document above to view the analysis below.
            </div>
          </div>
        )}
      </div>

      {/* 2. DUAL-PANEL GRID FOR AUDIT REPORT OUTCOME */}
      {selectedDocument && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 animate-slide-in">
          {/* Left panel: Verification outputs */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col gap-4 shadow-lg backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="text-xs font-bold text-slate-300 truncate mr-2" title={selectedDocument.fileName}>
                {selectedDocument.fileName}
              </h3>
              <span className="bg-slate-800 border border-slate-700 py-1 px-3 rounded-full text-[10px] uppercase font-bold text-slate-300 shrink-0">
                {selectedDocument.documentType}
              </span>
            </div>

            {/* Tab links: Raw vs JSON Schema vs Gaps */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('raw')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                  activeTab === 'raw'
                    ? 'bg-brand-teal-50 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
                }`}
              >
                📝 Raw Text / summary
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                  activeTab === 'schema'
                    ? 'bg-brand-teal-50 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
                }`}
              >
                💻 JSON Schema
              </button>
              <button
                onClick={() => setActiveTab('gaps')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
                  activeTab === 'gaps'
                    ? 'bg-brand-teal-50 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700/60'
                }`}
              >
                ❌ Gaps Found
              </button>
            </div>

            {/* Tab Panels */}
            {activeTab === 'raw' && (
              <div className="flex flex-col gap-4 text-xs">
                {/* Live Banner */}
                <div className="flex items-center gap-2 px-3 py-2 border border-teal-500/20 bg-teal-500/5 text-brand-teal-50 font-semibold rounded-md text-[10px]">
                  <span>🔬</span>
                  <span>
                    {selectedDocument.isLive ? 'Live Document Analysis' : 'Historical Mock Analysis'} —{' '}
                    {selectedDocument.gapAnalysis?.violations?.length || 0} compliance gap(s) found
                  </span>
                  <span className="bg-brand-teal-50/15 border border-brand-teal-50/30 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide ml-auto">
                    {selectedDocument.isLive && aiEnabled ? 'CLAUDE' : 'ENGINE'}
                  </span>
                </div>

                {/* AI Executive Summary Block (if loaded from server) */}
                {selectedDocument.isLive && selectedDocument.productSummary && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wide">Executive Summary</h4>
                    <p className="text-slate-400 leading-relaxed text-xs">{selectedDocument.productSummary}</p>
                  </div>
                )}

                {/* Staged Docs assessed summaries (if AI analyzed) */}
                {selectedDocument.isLive && selectedDocument.documentsAssessed && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wide">Documents Assessed</h4>
                    <div className="flex flex-col gap-2">
                      {selectedDocument.documentsAssessed.map((d, i) => (
                        <div key={i} className="p-3 border border-slate-800 bg-slate-950/20 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <strong className="text-slate-300">📄 {d.name}</strong>
                            <span className="text-[9px] font-bold py-0.5 px-2 bg-slate-800 border border-slate-700 rounded-full text-slate-300">
                              {d.type}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{d.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staged Ingredient safety logs (if AI analyzed) */}
                {selectedDocument.isLive && selectedDocument.ingredientFindings && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wide">Ingredient Findings</h4>
                    <div className="flex flex-col border border-slate-800 bg-slate-950/10 rounded-lg divide-y divide-slate-800/60 overflow-hidden">
                      {selectedDocument.ingredientFindings.map((ing, i) => {
                        const status = ing.fdaStatus;
                        const isBad = ['PROHIBITED', 'REQUIRES_TTB_PERMIT'].includes(status);
                        const isWarn = ['NDI_REQUIRED', 'RESTRICTED', 'REVIEW'].includes(status);
                        const statusCol = isBad ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-emerald-500';

                        return (
                          <div key={i} className="flex justify-between gap-4 p-2.5 text-[11px]">
                            <span className="text-slate-300 leading-normal">
                              <strong className="text-white font-bold">{ing.name}</strong> — {ing.note}
                            </span>
                            <span className={`font-black shrink-0 uppercase tracking-wide ${statusCol}`}>
                              {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Raw Text rendering (Fallback / Normal file review) */}
                {(!selectedDocument.isLive || !selectedDocument.productSummary) && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wide">Raw Extracted Text</h4>
                    <p className="text-[10px] text-slate-400">
                      Red highlights denote potential violations. Showing up to 3,000 characters.
                    </p>
                    <div
                      className="bg-slate-950/40 p-4 border border-slate-800/80 rounded font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: highlightText(selectedDocument.extractedData?.rawTextPreview || '') }}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schema' && (
              <div className="text-xs">
                <pre className="bg-slate-950/40 p-4 border border-slate-800/80 rounded font-mono text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {JSON.stringify(selectedDocument.extractedData, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'gaps' && (
              <div className="flex flex-col gap-3 text-xs">
                {(!selectedDocument.gapAnalysis?.violations || selectedDocument.gapAnalysis.violations.length === 0) ? (
                  <div className="text-emerald-500 bg-emerald-500/5 border border-emerald-500/20 py-2.5 px-4 rounded-lg font-bold">
                    ✅ No compliance gaps detected.
                  </div>
                ) : (
                  selectedDocument.gapAnalysis.violations.map((v, i) => {
                    const sev = v.severity || 'LOW';
                    const colClass = SEVERITY_COLORS[sev] || 'border-l-slate-500 bg-slate-500/5 text-slate-400';
                    const badgeClass = SEVERITY_BADGES[sev] || 'bg-slate-500/10 text-slate-400';

                    return (
                      <div
                        key={i}
                        className={`flex gap-3 border-l-4 p-4 rounded-r-lg bg-slate-950/15 border border-slate-800/40 border-l-inherit ${colClass}`}
                      >
                        <div className="text-lg mt-0.5 select-none">⚠️</div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider ${badgeClass}`}>
                              {sev}
                            </span>
                            <h4 className="font-bold text-slate-200 truncate">{v.finding}</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">{v.remediation}</p>
                          <span className="text-[9px] font-bold text-brand-teal-50 uppercase tracking-wide mt-1 block">
                            {v.citation}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right panel: Meta sidebar */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col gap-5 shadow-lg backdrop-blur-md text-xs">
            <h3 className="border-b border-slate-800/60 pb-3 font-bold text-slate-300">Audit Meta Information</h3>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">File UUID</span>
              <strong className="font-mono text-white text-xs">{selectedDocument.id || 'N/A'}</strong>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Audit Speed</span>
              <strong className="text-brand-teal-50 text-xs font-bold block">
                {selectedDocument.isLive ? 'Dynamic Analysis complete (via async Worker)' : '0.64 seconds (Cached rules complete)'}
              </strong>
            </div>

            <div className="space-y-1.5 leading-relaxed">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Rules Checked</span>
              <p className="text-slate-400 text-xs">
                Parsed ingredients against FDA GRAS notices, NDI notification registers, Import Alert 54-15 detention registries, and OEHHA Prop 65 lists.
              </p>
            </div>

            <hr className="border-slate-800/80" />

            <div className="bg-teal-500/5 p-4 rounded-xl border border-dashed border-teal-500/20 text-xs">
              <h4 className="text-brand-teal-50 font-bold mb-1.5">💡 Next Step</h4>
              <p className="text-slate-400 leading-relaxed text-xs">
                Use the <button onClick={() => onNavigateToView('rag')} className="text-brand-teal-50 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer">RAG Explorer</button> tab to immediately generate formal response templates (FDA Form 483 response, Prop 65 warning layouts) mapping directly to the gaps discovered above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-500/5 border-red-500/20 border-l-red-500',
  HIGH: 'bg-amber-500/5 border-amber-500/20 border-l-amber-500',
  MEDIUM: 'bg-yellow-500/5 border-yellow-500/20 border-l-yellow-500',
  LOW: 'bg-blue-500/5 border-blue-500/20 border-l-blue-500',
};

const SEVERITY_BADGES = {
  CRITICAL: 'bg-red-500/10 text-red-500 border border-red-500/20',
  HIGH: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  LOW: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
};
