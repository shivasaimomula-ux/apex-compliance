import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import COMPLIANCE_DATABASE from './mock_data.js';

// Import views components
import AppShell from './components/AppShell.jsx';
import Dashboard from './components/Dashboard.jsx';
import DocumentAudit from './components/DocumentAudit.jsx';
import ProductClassification from './components/ProductClassification.jsx';
import ClaimTranslator from './components/ClaimTranslator.jsx';
import TerminologyCrosswalk from './components/TerminologyCrosswalk.jsx';
import Markets from './components/Markets.jsx';
import RagExplorer from './components/RagExplorer.jsx';
import DisclaimerModal from './components/DisclaimerModal.jsx';

// Set worker path for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Local Linter Engine patterns (duplicated from original app.js)
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
  { name: 'Swarna Bhasma', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Gold Ash', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Abhraka Bhasma', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Tamra Bhasma', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Naga Bhasma', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Vanga Bhasma', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Hartala', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Manahshila', type: 'PROHIBITED_METAL', risk: 'CRITICAL' },
  { name: 'Ephedra', type: 'PROHIBITED', risk: 'CRITICAL' },
  { name: 'Ephedrine', type: 'PROHIBITED', risk: 'CRITICAL' },
  { name: 'Aristolochic', type: 'PROHIBITED', risk: 'CRITICAL' },
  { name: 'Aristolochia', type: 'PROHIBITED', risk: 'CRITICAL' },
  { name: 'Kava', type: 'RESTRICTED', risk: 'HIGH' },
  { name: 'Comfrey', type: 'RESTRICTED', risk: 'HIGH' },
  { name: 'Coltsfoot', type: 'RESTRICTED', risk: 'HIGH' },
  { name: 'Pennyroyal', type: 'RESTRICTED', risk: 'HIGH' },
  { name: 'Aconite', type: 'RESTRICTED', risk: 'HIGH' },
  { name: 'Belladonna', type: 'RESTRICTED', risk: 'HIGH' },
];

const NDI_LIKELY_INGREDIENTS = [
  'Shilajit', 'Moringa', 'Guduchi', 'Tinospora', 'Mucuna',
  'Boswellia', 'Gymnema', 'Vijayasar', 'Karela', 'Neem extract',
  'Haritaki', 'Vibhitaki', 'Dhataki', 'Bilva', 'Shyonaka',
  'Gambhari', 'Dashamul', 'Punarnava', 'Kutki', 'Chirayata',
  'Kalmegh', 'Andrographis', 'Pippali', 'Bhringraj', 'Manjistha',
  'Lodhra', 'Vidanga', 'Nagarmotha', 'Vacha', 'Jatamansi',
  'Khadira', 'Sariva', 'Devdaru', 'Bala', 'Atibala',
];

const FERMENTED_INDICATORS = ['arishta', 'asava', 'fermented', 'self-generated alcohol', 'abv', 'alcohol by volume', 'wine', 'dhataki'];

const GMP_GAPS = [
  { pattern: /no\s+(identity|identit(y|ification))\s+test/i,  finding: 'No identity testing mentioned for botanical ingredients', citation: '21 CFR §111.75(a)(1)(i)' },
  { pattern: /without\s+(independent|separate)\s+QC/i,        finding: 'Missing independent QC unit authorization', citation: '21 CFR §111.105' },
  { pattern: /formulator\s+sign(ed|off|ature)/i,              finding: 'MMR signed only by formulator — needs independent QC sign-off', citation: '21 CFR §111.105' },
  { pattern: /supplier\s+CoA\s+(only|alone|without test)/i,   finding: 'Reliance on supplier CoA without in-house identity testing', citation: '21 CFR §111.75(a)(1)' },
];

// Helper calculations for score bands
const PILLAR_WEIGHTS = {
  product_classification: 0.15,
  labeling_compliance: 0.25,
  ingredient_safety: 0.25,
  manufacturing_compliance: 0.20,
  import_admissibility: 0.15,
};
const SEVERITY_DEDUCTIONS = { CRITICAL: 1.00, HIGH: 0.60, MEDIUM: 0.30, LOW: 0.10 };

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [userName, setUserName] = useState('S. Momula');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Staged files dossier
  const [dossier, setDossier] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('Checking AI analysis engine…');

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [lastReportDocs, setLastReportDocs] = useState([]);
  const [uploadMode, setUploadMode] = useState('live');

  // Check backend availability
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        const enabled = !!data.aiEnabled;
        setAiEnabled(enabled);
        setAiStatusText(
          enabled
            ? `AI analysis online — powered by ${data.model || 'Claude'}`
            : 'AI engine reachable, but ANTHROPIC_API_KEY is not set. Using offline rule-based analysis.'
        );
      } catch {
        setAiEnabled(false);
        setAiStatusText('Backend not running — using offline rule-based analysis. Run "npm start" with an API key for AI mode.');
      }
    }
    checkHealth();

    // Check disclaimer
    if (sessionStorage.getItem('apex_disclaimer_accepted')) {
      setDisclaimerAccepted(true);
    }
  }, []);

  // Update theme tag on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleAcceptDisclaimer = () => {
    sessionStorage.setItem('apex_disclaimer_accepted', '1');
    setDisclaimerAccepted(true);
  };

  // Stage files (PDF/TXT) and extract text
  const handleStageFiles = async (files) => {
    const accepted = files.filter((f) => /\.(pdf|txt|csv|tsv)$/i.test(f.name));
    if (accepted.length === 0) {
      alert('Please select a valid PDF or TXT file.');
      return;
    }

    setAnalyzing(true);
    setAiStatusText('Extracting file text...');

    const newDocs = [];
    for (const file of accepted) {
      try {
        const ext = file.name.split('.').pop().toLowerCase();
        let text = '';
        if (ext === 'pdf') {
          text = await extractTextFromPDF(file);
        } else {
          text = await readTextFile(file);
        }

        if (text && text.trim().length >= 30) {
          newDocs.push({ name: file.name, text });
        } else {
          alert(`Could not extract readable text from "${file.name}".`);
        }
      } catch (err) {
        alert(`Error reading "${file.name}": ${err.message}`);
      }
    }

    setDossier((prev) => [...prev, ...newDocs]);
    setAnalyzing(false);
    setAiStatusText(aiEnabled ? 'AI analysis online' : 'Offline rule-based mode');
  };

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const readTextFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsText(file);
    });
  };

  const handleClearDossier = () => {
    setDossier([]);
  };

  const handleRemoveDossierFile = (idx) => {
    setDossier((prev) => prev.filter((_, i) => i !== idx));
  };

  // Run AI analyze dossier or offline rules
  const handleRunAnalysis = async (docsOverride) => {
    const docs = docsOverride || dossier;
    if (!docs.length) {
      alert('Add at least one document to the dossier first.');
      return;
    }

    if (!aiEnabled) {
      // Offline Local Linter fallback on combined text
      const combined = docs.map((d) => `--- ${d.name} ---\n${d.text}`).join('\n\n');
      executeOfflineLinter(combined, docs[0].name, combined.length);
      return;
    }

    setAnalyzing(true);
    setAiStatusText('🧠 Claude is analyzing your dossier...');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: '', documents: docs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Analysis failed.');

      // Persist results
      setLastReport(data);
      setLastReportDocs(docs);

      const scoreReport = calculateFDAReadinessScore(data.violations || []);
      const virtualDoc = {
        id: `AI-${Date.now()}`,
        fileName: `${docs.length} Document Dossier`,
        documentType: data.classification?.title || 'AI Analysis',
        productName: data.productName || 'AI Audited Product',
        isLive: true,
        extractedData: {
          rawTextPreview: docs.map((d) => `--- ${d.name} ---\n${d.text.slice(0, 500)}`).join('\n\n'),
          ingredientsRaw: data.ingredientFindings?.map(i => i.name).join(', ') || '',
          claimsRaw: data.claimAnalysis?.map(c => c.originalClaim).join(' ') || '',
        },
        productSummary: data.productSummary,
        documentsAssessed: data.documentsAssessed,
        ingredientFindings: data.ingredientFindings,
        claimAnalysis: data.claimAnalysis,
        gapAnalysis: { violations: data.violations },
      };

      setSelectedDocument(virtualDoc);
      setAiStatusText(`Analysis complete — ${data.violations.length} gaps found.`);
      setActiveView('dashboard');
    } catch (err) {
      alert(`AI analysis failed: ${err.message}. Running offline check instead.`);
      const combined = docs.map((d) => `--- ${d.name} ---\n${d.text}`).join('\n\n');
      executeOfflineLinter(combined, docs[0].name, combined.length);
    } finally {
      setAnalyzing(false);
    }
  };

  // Run manually pasted text local checker
  const handleRunPastedAnalysis = (text, docName) => {
    if (aiEnabled) {
      handleRunAnalysis([{ name: docName, text }]);
    } else {
      executeOfflineLinter(text, docName, text.length);
    }
  };

  // Select preloaded mock document
  const handleSelectMockDoc = (key) => {
    const docData = COMPLIANCE_DATABASE.mockDocuments[key];
    if (!docData) return;

    setLastReport(null); // Clear last AI cache
    setSelectedDocument({ ...docData, isLive: false });
    setActiveView('dashboard');
  };

  // Calculate scores
  const calculateFDAReadinessScore = (violations = []) => {
    const pillarScores = {
      product_classification: 100,
      labeling_compliance: 100,
      ingredient_safety: 100,
      manufacturing_compliance: 100,
      import_admissibility: 100,
    };

    violations.forEach((v) => {
      const d = SEVERITY_DEDUCTIONS[v.severity] || 0;
      pillarScores[v.pillar] = Math.max(0, pillarScores[v.pillar] - 100 * d);
    });

    let totalScore = 0;
    Object.keys(PILLAR_WEIGHTS).forEach((p) => {
      totalScore += pillarScores[p] * PILLAR_WEIGHTS[p];
    });
    totalScore = Math.round(totalScore);

    let band;
    if (totalScore >= 85) {
      band = { label: 'EXPORT READY', color: '#16a34a', desc: 'Minor documentation gaps only. Proceed with FDA registration.' };
    } else if (totalScore >= 65) {
      band = { label: 'CONDITIONAL READY', color: '#f59e0b', desc: 'Moderate gaps. Resolve HIGH items before shipping.' };
    } else if (totalScore >= 40) {
      band = { label: 'SIGNIFICANT REMEDIATION REQUIRED', color: '#f97316', desc: 'Major labeling/ingredient/cGMP gaps. 3–6 month remediation timeline required.' };
    } else {
      band = { label: 'NOT EXPORT READY', color: '#ef4444', desc: 'Critical violations present. Extremely high risk of customs detention or seizure.' };
    }

    return { score: totalScore, band, pillarScores };
  };

  // Local Offline checker (compiled logic)
  const executeOfflineLinter = (rawText, fileName, fileSize) => {
    const detectDocumentType = (t) => {
      const text = t.toLowerCase();
      if (/certificate of analysis|coa|analytical report|lab report|test report/.test(text) ||
          (/\bppm\b|mg\/kg/.test(text) && /lead|arsenic|mercury/.test(text))) return 'coa';
      if (/master (manufacturing|formula|batch)|batch record|mmr|mmf|bill of material|bill of ingredients/.test(text)) return 'mmr';
      return 'label';
    };

    const docType = detectDocumentType(rawText);
    const productName = fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    const violations = [];

    // 1. Prohibited claims
    const foundDiseaseClaims = [];
    DISEASE_PATTERNS.forEach((dp) => {
      const sentences = rawText.match(/[^.!?\n]{10,250}[.!?]/g) || [];
      const hits = sentences.filter((s) => dp.pattern.test(s)).map((s) => s.trim()).slice(0, 3);
      hits.forEach((s) => {
        if (!foundDiseaseClaims.find((x) => x.text === s)) {
          foundDiseaseClaims.push({ text: s, term: dp.term });
        }
      });
    });

    if (foundDiseaseClaims.length > 0) {
      const preview = foundDiseaseClaims.slice(0, 2).map((c) => `"${c.text.substring(0, 80)}..."`).join('; ');
      const terms = [...new Set(foundDiseaseClaims.map((c) => c.term))].join(', ');
      violations.push({
        severity: 'CRITICAL',
        pillar: 'labeling_compliance',
        finding: `${foundDiseaseClaims.length} prohibited disease/drug claim(s) detected: ${terms}`,
        citation: '21 USC §321(g)(1)(B); 21 CFR §310 (Unapproved New Drug)',
        remediation: `Remove or reframe all disease claims to structure/function language. Detected in: ${preview}`,
      });
    }

    // 2. Prohibited ingredients
    const foundProhibited = [];
    PROHIBITED_INGREDIENTS_LIST.forEach((ing) => {
      if (new RegExp(`\\b${ing.name.replace(/[()]/g, '\\$&')}\\b`, 'i').test(rawText)) {
        foundProhibited.push(ing);
      }
    });
    if (/\bBhasma\b/i.test(rawText) && !foundProhibited.find((x) => x.name.includes('Bhasma'))) {
      foundProhibited.push({ name: 'Bhasma (unspecified metallic ash)', type: 'PROHIBITED_METAL', risk: 'CRITICAL' });
    }

    foundProhibited.forEach((ing) => {
      violations.push({
        severity: ing.risk,
        pillar: ing.type === 'PROHIBITED_METAL' ? 'product_classification' : 'ingredient_safety',
        finding: `${ing.type === 'PROHIBITED_METAL' ? 'Prohibited metallic ingredient' : 'Restricted ingredient'} detected: ${ing.name}`,
        citation: ing.type === 'PROHIBITED_METAL'
          ? 'FDA Import Alert 54-15 (DWPE); FDCA §402(a)(1) Adulteration'
          : '21 CFR Part 111; FDA Safety Concern — restricted botanical',
        remediation: ing.type === 'PROHIBITED_METAL'
          ? `Remove ${ing.name} entirely from the US export formulation. Metallic ash preparations trigger automatic Detention Without Physical Examination (DWPE).`
          : `Review FDA safety guidance for ${ing.name}. Some uses are restricted or require safety substantiation before marketing.`,
      });
    });

    // 3. Heavy metals checks (CoA type only)
    if (docType === 'coa') {
      const metals = {};
      const patterns = [
        { key: 'lead', re: /lead\s*(?:\(pb\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
        { key: 'arsenic', re: /arsenic\s*(?:\(as\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
        { key: 'mercury', re: /mercury\s*(?:\(hg\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
        { key: 'cadmium', re: /cadmium\s*(?:\(cd\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
      ];
      patterns.forEach(({ key, re }) => {
        let match;
        while ((match = re.exec(rawText)) !== null) {
          const val = parseFloat(match[1]);
          if (!isNaN(val)) metals[key] = val;
        }
      });

      const servingG = 1.0;
      const PROP65_MADL = { lead: 0.5, arsenic: 0.1, mercury: 0.3, cadmium: 4.1 };
      const metalNames = { lead: 'Lead (Pb)', arsenic: 'Arsenic (As)', mercury: 'Mercury (Hg)', cadmium: 'Cadmium (Cd)' };

      Object.keys(metals).forEach((key) => {
        const ppm = metals[key];
        const dailyExposure = ppm * servingG;
        const madl = PROP65_MADL[key];
        const name = metalNames[key];

        if (dailyExposure > madl) {
          violations.push({
            severity: dailyExposure > madl * 3 ? 'CRITICAL' : 'HIGH',
            pillar: 'import_admissibility',
            finding: `${name} daily exposure of ${dailyExposure.toFixed(2)} mcg/day exceeds California Prop 65 MADL of ${madl} mcg/day`,
            calculation: `${ppm} ppm × ${servingG}g serving = ${dailyExposure.toFixed(2)} mcg/day. Prop 65 MADL = ${madl} mcg/day`,
            citation: 'California OEHHA Proposition 65; Health & Safety Code §25249.5',
            remediation: `Source raw material with ${name} below ${(madl / servingG).toFixed(2)} ppm, OR apply Prop 65 warning label.`,
          });
        }

        if (key === 'lead' && ppm > 5) {
          violations.push({
            severity: 'CRITICAL',
            pillar: 'ingredient_safety',
            finding: `${name} at ${ppm} ppm exceeds USP <2232> dietary supplement action level of 5 ppm`,
            citation: 'USP Chapter <2232> Elemental Contaminants; 21 CFR §111.75',
            remediation: 'Must source raw material with Lead < 5 ppm for USP compliance.',
          });
        }
      });
    }

    // 4. DSHEA FDA Disclaimer
    const hasDisclaimer = /not been evaluated by the food and drug|not intended to diagnose/i.test(rawText);
    if (!hasDisclaimer && (docType === 'label' || foundDiseaseClaims.length > 0)) {
      violations.push({
        severity: 'HIGH',
        pillar: 'labeling_compliance',
        finding: 'Missing mandatory DSHEA FDA disclaimer statement',
        citation: '21 CFR §101.93(b)',
        remediation: 'Add the exact text: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
      });
    }

    // 5. NDI checks
    const foundNDI = NDI_LIKELY_INGREDIENTS.filter((ing) =>
      new RegExp(`\\b${ing}\\b`, 'i').test(rawText)
    );
    if (foundNDI.length > 0) {
      violations.push({
        severity: 'CRITICAL',
        pillar: 'ingredient_safety',
        finding: `${foundNDI.length} potential New Dietary Ingredient(s) detected: ${foundNDI.join(', ')}`,
        citation: '21 CFR §190.6; FDCA §413(a)(2)',
        remediation: 'File NDI notifications with FDA Office of Dietary Supplement Programs (ODSP) at least 75 days before export.',
      });
    }

    // 6. cGMP check
    GMP_GAPS.forEach((gap) => {
      if (gap.pattern.test(rawText)) {
        violations.push({
          severity: 'HIGH',
          pillar: 'manufacturing_compliance',
          finding: gap.finding,
          citation: gap.citation,
          remediation: 'Address GMP documentation gaps before US FDA inspection or import review.',
        });
      }
    });

    const liveDoc = {
      id: `LIVE-${Date.now()}`,
      fileName,
      documentType: docType === 'coa' ? 'Certificate of Analysis (CoA)' : docType === 'mmr' ? 'Master Manufacturing Record (MMR)' : 'Label / Packaging Scan',
      productName,
      servingSize: '1.0g (Standard)',
      isLive: true,
      extractedData: {
        rawTextPreview: rawText.substring(0, 3000),
        ingredientsRaw: '',
        claimsRaw: '',
        fdaDisclaimerPresent: hasDisclaimer,
      },
      gapAnalysis: { violations },
    };

    setSelectedDocument(liveDoc);
    setLastReport(null);
    setAiStatusText(`Local scan completed: ${violations.length} gaps found.`);
    setActiveView('dashboard');
  };

  // Download Reports logic
  const handleExportReport = () => {
    if (lastReport) {
      downloadAiReport();
    } else if (selectedDocument) {
      downloadOfflineReport();
    } else {
      alert('Run an analysis first.');
    }
  };

  const downloadOfflineReport = () => {
    const doc = selectedDocument;
    const scoreReport = calculateFDAReadinessScore(doc.gapAnalysis?.violations || []);
    const sorted = [...(doc.gapAnalysis?.violations || [])].sort((a, b) =>
      ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[b.severity] - { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[a.severity])
    );
    const bandColor = scoreReport.band.color;
    const sc = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#ca8a04', LOW: '#3b82f6' };

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>APEX Compliance Report — ${doc.productName}</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:2rem;color:#1e293b;background:white}
h1{font-size:1.6rem;color:#0f172a;margin-bottom:0.25rem}
.subtitle{color:#64748b;font-size:0.85rem;margin-bottom:2rem}
.score-box{display:inline-block;padding:1.5rem 2.5rem;border-radius:12px;background:#f8fafc;border:2px solid ${bandColor};text-align:center;margin-bottom:2rem}
.score-num{font-size:3rem;font-weight:800;color:${bandColor};line-height:1}
.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:2rem}
.pillar{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;text-align:center}
.pillar-name{font-size:11px;color:#64748b;margin-bottom:0.25rem}
.pillar-score{font-size:1.2rem;font-weight:700}
h2{font-size:1.1rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.5rem;margin:1.5rem 0 1rem}
.violation-card{border-left:4px solid #888;padding:1rem;margin-bottom:1rem;background:#f9fafb;border-radius:0 8px 8px 0}
.badge{display:inline-block;padding:0.2rem 0.6rem;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;margin-right:0.5rem}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}
</style>
</head><body>
<h1>APEX FDA Compliance Report${doc.isLive ? ' <span style="font-size:0.8rem;color:#16a34a;font-weight:400">[LIVE DOCUMENT ANALYSIS]</span>' : ''}</h1>
<p class="subtitle">Product: <strong>${doc.productName}</strong> &nbsp;|&nbsp; File: ${doc.fileName} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
<div class="score-box"><div class="score-num">${scoreReport.score}</div><div style="font-size:0.7rem;color:#888;margin:0.25rem 0">FRS Index</div><div style="font-size:0.8rem;font-weight:700;color:${bandColor}">${scoreReport.band.label}</div></div>
<div class="pillars">
${[
  ['Product Classification (15%)', scoreReport.pillarScores.product_classification],
  ['Labeling Compliance (25%)', scoreReport.pillarScores.labeling_compliance],
  ['Ingredient Safety (25%)', scoreReport.pillarScores.ingredient_safety],
  ['Manufacturing cGMP (20%)', scoreReport.pillarScores.manufacturing_compliance],
  ['Import Admissibility (15%)', scoreReport.pillarScores.import_admissibility],
]
  .map(
    ([n, s]) =>
      `<div class="pillar"><div class="pillar-name">${n}</div><div class="pillar-score" style="color:${
        s >= 70 ? '#16a34a' : s >= 40 ? '#f59e0b' : '#ef4444'
      }">${s}/100</div></div>`
  )
  .join('')}
</div>
<h2>Priority Remediation Actions (${sorted.length} gap${sorted.length !== 1 ? 's' : ''} found)</h2>
${
  sorted.length
    ? sorted
        .map(
          (v) => `<div class="violation-card" style="border-left-color:${sc[v.severity] || '#888'}">
  <div style="margin-bottom:0.5rem"><span class="badge" style="background:${sc[v.severity]}20;color:${sc[v.severity]}">${
            v.severity
          }</span><strong style="font-size:14px">${v.finding}</strong></div>
  <p style="font-size:13px;color:#555;margin-bottom:0.4rem">${v.remediation}</p>
  <p style="font-size:11px;color:#888">${v.citation}</p>
  ${v.calculation ? `<p style="font-size:11px;color:#888;font-family:monospace;margin-top:0.25rem">${v.calculation}</p>` : ''}
</div>`
        )
        .join('')
    : '<p style="color:#16a34a">✅ No compliance gaps detected.</p>'
}
<footer>APEX FDA Compliance Platform &nbsp;|&nbsp; Regulatory data current as of January 2026 &nbsp;|&nbsp; NOT a substitute for licensed regulatory or legal counsel.</footer>
</body></html>`;

    triggerDownload(html, `APEX_Report_${doc.productName.replace(/\s+/g, '_')}.html`);
  };

  const downloadAiReport = () => {
    const r = lastReport;
    const c = r.classification || {};
    const violations = r.violations || [];
    const scoreReport = calculateFDAReadinessScore(violations);
    const sorted = [...violations].sort((a, b) =>
      ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[b.severity] - { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[a.severity])
    );
    const bandColor = scoreReport.band.color;
    const sc = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#ca8a04', LOW: '#3b82f6' };
    const rc = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MODERATE: '#ca8a04', LOW: '#3b82f6', COMPLIANT: '#16a34a' };

    const pillars = [
      ['Product Classification (15%)', scoreReport.pillarScores.product_classification],
      ['Labeling Compliance (25%)', scoreReport.pillarScores.labeling_compliance],
      ['Ingredient Safety (25%)', scoreReport.pillarScores.ingredient_safety],
      ['Manufacturing cGMP (20%)', scoreReport.pillarScores.manufacturing_compliance],
      ['Import Admissibility (15%)', scoreReport.pillarScores.import_admissibility],
    ]
      .map(
        ([n, s]) =>
          `<div class="pillar"><div class="pillar-name">${n}</div><div class="pillar-score" style="color:${
            s >= 70 ? '#16a34a' : s >= 40 ? '#f59e0b' : '#ef4444'
          }">${s}/100</div></div>`
      )
      .join('');

    const docsTable = (r.documentsAssessed || []).length
      ? `<table><thead><tr><th>Document</th><th>Type</th><th>Summary</th></tr></thead><tbody>${r.documentsAssessed
          .map(
            (d) =>
              `<tr><td><strong>${esc(d.name)}</strong></td><td>${esc(d.type)}</td><td>${esc(d.summary)}</td></tr>`
          )
          .join('')}</tbody></table>`
      : '<p style="color:#94a3b8;font-size:13px">No documents assessed.</p>';

    const decisionGates = (c.decisionSteps || [])
      .map(
        (s) =>
          `<div class="gate">${s.status === 'PASS' ? '✅' : s.status === 'FAIL' ? '❌' : '⚠️'} <strong>${esc(
            s.gate
          )}:</strong> ${esc(s.detail)}</div>`
      )
      .join('');

    const violationCards = sorted.length
      ? sorted
          .map(
            (v) => `<div class="card" style="border-left-color:${sc[v.severity] || '#888'}">
  <div style="margin-bottom:0.4rem"><span class="badge" style="background:${sc[v.severity]}20;color:${
              sc[v.severity]
            }">${esc(v.severity)}</span><strong style="font-size:14px">${esc(v.finding)}</strong></div>
  <p style="font-size:13px;color:#555;margin-bottom:0.3rem"><strong>Remediation:</strong> ${esc(v.remediation)}</p>
  <p style="font-size:11px;color:#888">${esc(v.citation)}</p>
</div>`
          )
          .join('')
      : '<p style="color:#16a34a">✅ No compliance gaps detected.</p>';

    const claimRows = (r.claimAnalysis || []).length
      ? `<table><thead><tr><th>Risk</th><th>Original Claim</th><th>Issue</th><th>FDA-Compliant Reframing</th><th>Citation</th></tr></thead><tbody>${r.claimAnalysis
          .map(
            (cl) =>
              `<tr><td><span class="badge" style="background:${rc[cl.risk]}20;color:${rc[cl.risk]}">${esc(
                cl.risk
              )}</span></td><td class="orig">"${esc(cl.originalClaim)}"</td><td>${esc(cl.issue)}</td><td class="reframe">"${esc(
                cl.reframedClaim
              )}"</td><td style="font-size:11px;color:#888">${esc(cl.citation)}</td></tr>`
          )
          .join('')}</tbody></table>`
      : '<p style="color:#94a3b8;font-size:13px">No marketing claims detected.</p>';

    const ingredientRows = (r.ingredientFindings || []).length
      ? `<table><thead><tr><th>Ingredient</th><th>FDA Status</th><th>Note</th></tr></thead><tbody>${r.ingredientFindings
          .map(
            (i) =>
              `<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.fdaStatus)}</td><td>${esc(i.note)}</td></tr>`
          )
          .join('')}</tbody></table>`
      : '<p style="color:#94a3b8;font-size:13px">No ingredient findings.</p>';

    const docNames = (lastReportDocs || []).map((d) => d.name).join(', ') || '—';
    const model = r._meta?.model || 'Claude';

    const REPORT_CSS = `body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:2rem;color:#1e293b;background:white;line-height:1.55}h1{font-size:1.6rem;color:#0f172a;margin-bottom:0.25rem}.subtitle{color:#64748b;font-size:0.85rem;margin-bottom:1.5rem}.summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:0.92rem}.score-box{display:inline-block;padding:1.25rem 2rem;border-radius:12px;background:#f8fafc;text-align:center;margin-bottom:1.5rem;vertical-align:top}.score-num{font-size:2.6rem;font-weight:800;line-height:1}.verdict-box{display:inline-block;padding:1rem 1.5rem;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;margin:0 0 1.5rem 1rem;vertical-align:top;max-width:60%}.pillars{display:grid;grid-template-columns:repeat(5,1fr);gap:0.6rem;margin-bottom:1.5rem}.pillar{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.6rem;text-align:center}.pillar-name{font-size:10px;color:#64748b;margin-bottom:0.25rem}.pillar-score{font-size:1.1rem;font-weight:700}h2{font-size:1.1rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.5rem;margin:1.75rem 0 1rem}.card{border-left:4px solid #888;padding:0.85rem 1rem;margin-bottom:0.85rem;background:#f9fafb;border-radius:0 8px 8px 0}.badge{display:inline-block;padding:0.2rem 0.6rem;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;margin-right:0.5rem}.gate{font-size:13px;margin:0.2rem 0;color:#334155}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:1rem}td,th{border:1px solid #e2e8f0;padding:0.4rem 0.6rem;text-align:left;vertical-align:top}th{background:#f1f5f9}.orig{color:#b91c1c}.reframe{color:#15803d}footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}@media print{body{padding:1rem}}`;

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>APEX Compliance Report — ${esc(
      r.productName
    )}</title>
<style>${REPORT_CSS}</style></head><body>
<h1>APEX FDA Compliance Report <span style="font-size:0.8rem;color:#0ea5e9;font-weight:400">[AI ANALYSIS]</span></h1>
<p class="subtitle">Product: <strong>${esc(r.productName)}</strong> &nbsp;|&nbsp; Documents: ${esc(
      docNames
    )} &nbsp;|&nbsp; Engine: ${esc(model)} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
<div class="summary"><strong>Executive Summary</strong><br>${esc(r.productSummary)}</div>
<div class="score-box" style="border:2px solid ${bandColor}"><div class="score-num" style="color:${bandColor}">${
      scoreReport.score
    }</div><div style="font-size:0.7rem;color:#888;margin:0.25rem 0">FRS Index</div><div style="font-size:0.8rem;font-weight:700;color:${bandColor}">${
      scoreReport.band.label
    }</div></div>
<div class="verdict-box"><div style="font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Classification Verdict</div><div style="font-size:1.05rem;font-weight:800;color:#0f172a;margin:0.2rem 0">${esc(
      c.title
    )}</div><div style="font-size:11px;color:#64748b">${esc(c.governingLaw)}</div></div>
<div class="pillars">${pillars}</div>
<h2>Classification Rationale</h2>
<p style="font-size:13px">${esc(c.rationale)}</p>
${decisionGates ? `<div style="margin-top:0.75rem">${decisionGates}</div>` : ''}
<h2>Priority Remediation Actions (${sorted.length} gap${sorted.length !== 1 ? 's' : ''} found)</h2>
${violationCards}
<h2>Claim Analysis &amp; FDA-Compliant Reframing</h2>
${claimRows}
<h2>Ingredient Findings</h2>
${ingredientRows}
<h2>Documents Assessed</h2>
${docsTable}
<footer>APEX FDA Compliance Platform &nbsp;|&nbsp; AI-generated analysis via ${esc(
      model
    )} &nbsp;|&nbsp; Informational research tool only — NOT a substitute for licensed regulatory or legal counsel.</footer>
</body></html>`;

    triggerDownload(html, `APEX_Report_${String(r.productName || 'dossier').replace(/[^\w]+/g, '_').slice(0, 60)}.html`);
  };

  const triggerDownload = (html, name) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // Auto score reporting defaults
  const currentViolations = selectedDocument?.gapAnalysis?.violations || [];
  const scoreReport = calculateFDAReadinessScore(currentViolations);

  // Load coa on startup
  useEffect(() => {
    handleSelectMockDoc('coa');
  }, []);

  return (
    <>
      <DisclaimerModal isOpen={!disclaimerAccepted} onAccept={handleAcceptDisclaimer} />

      <AppShell
        activeView={activeView}
        onViewChange={setActiveView}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        aiEnabled={aiEnabled}
        aiStatusText={aiStatusText}
        userName={userName}
        onUserNameChange={setUserName}
        onExportReport={handleExportReport}
      >
        {activeView === 'dashboard' && (
          <Dashboard
            scoreReport={scoreReport}
            violations={currentViolations}
            productName={selectedDocument?.productName || ''}
            onNavigateToUpload={() => setActiveView('parsing')}
            onNavigateToClassification={() => setActiveView('classification')}
          />
        )}

        {activeView === 'parsing' && (
          <DocumentAudit
            dossier={dossier}
            onStageFiles={handleStageFiles}
            onClearDossier={handleClearDossier}
            onRemoveDossierFile={handleRemoveDossierFile}
            onRunAnalysis={handleRunAnalysis}
            analyzing={analyzing}
            aiEnabled={aiEnabled}
            aiStatusText={aiStatusText}
            selectedDocument={selectedDocument}
            onSelectMockDoc={handleSelectMockDoc}
            uploadMode={uploadMode}
            setUploadMode={setUploadMode}
            onRunPastedAnalysis={handleRunPastedAnalysis}
            onNavigateToView={setActiveView}
          />
        )}

        {activeView === 'classification' && (
          <ProductClassification initialProduct={selectedDocument} />
        )}

        {activeView === 'translation' && <ClaimTranslator />}

        {activeView === 'crosswalk' && <TerminologyCrosswalk />}

        {activeView === 'markets' && <Markets />}

        {activeView === 'rag' && <RagExplorer />}
      </AppShell>
    </>
  );
}
