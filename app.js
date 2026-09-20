/**
 * FDA Compliance Platform - Core Application Engine
 * Includes live PDF text extraction and real-time compliance analysis engine.
 */

document.addEventListener('DOMContentLoaded', () => {
  const db = window.COMPLIANCE_DATABASE;
  if (!db) { console.error("Compliance Database not loaded!"); return; }

  // Init PDF.js worker
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // ==========================================================================
  // 1. APPLICATION STATE
  // ==========================================================================
  const state = {
    activeView: 'dashboard',
    theme: 'dark',
    selectedDocument: null,
    ocrScanning: false,
    activeDocTab: 'raw',
    uploadMode: 'live', // 'live' | 'mock'
    aiEnabled: false,
    dossier: [], // [{ name, text }]
    analyzing: false,
    lastReport: null, // full Claude analysis report
    lastReportDocs: [],
  };

  // ==========================================================================
  // 2. DOM CACHE
  // ==========================================================================
  const DOM = {
    navItems: document.querySelectorAll('.nav-item'),
    viewPanels: document.querySelectorAll('.view-panel'),
    pageTitle: document.getElementById('current-page-title'),
    themeCheckbox: document.getElementById('theme-toggle-input'),

    // Dashboard
    dashboardScoreCircle: document.getElementById('dashboard-ring-fg'),
    dashboardScoreNumber: document.getElementById('dashboard-score-num'),
    dashboardScoreBand: document.getElementById('dashboard-score-band'),
    dashboardScoreDesc: document.getElementById('dashboard-score-desc'),
    dashboardPillarClassification: document.getElementById('pillar-score-classification'),
    dashboardPillarLabeling: document.getElementById('pillar-score-labeling'),
    dashboardPillarSafety: document.getElementById('pillar-score-safety'),
    dashboardPillarGMP: document.getElementById('pillar-score-gmp'),
    dashboardPillarImport: document.getElementById('pillar-score-import'),
    dashboardViolationsCount: document.getElementById('dashboard-violations-count'),
    dashboardRemediationList: document.getElementById('dashboard-remediation-list'),
    dashboardProductName: document.getElementById('dashboard-product-name'),
    dashboardReleaseStatus: document.getElementById('dashboard-release-status'),
    humanReviewForm: document.getElementById('human-review-form'),
    humanReviewStatus: document.getElementById('human-review-status'),
    humanReviewId: document.getElementById('human-review-id'),
    humanReviewName: document.getElementById('human-review-name'),
    humanReviewDisclaimer: document.getElementById('human-review-disclaimer'),
    humanReviewDisclaimerText: document.getElementById('human-review-disclaimer-text'),
    humanReviewSubmit: document.getElementById('human-review-submit'),

    // Document Parsing
    docSelectors: document.querySelectorAll('.doc-select-btn'),
    dropZone: document.getElementById('upload-drop-zone'),
    dropzoneHint: document.getElementById('dropzone-hint'),
    parsingDetailsCard: document.getElementById('parsing-details-card'),
    parsingDocName: document.getElementById('parsing-doc-name'),
    parsingDocType: document.getElementById('parsing-doc-type'),
    parsingDocSize: document.getElementById('parsing-doc-size'),
    docTabButtons: document.querySelectorAll('.doc-tab-btn'),
    docTabContentRaw: document.getElementById('doc-tab-content-raw'),
    docTabContentSchema: document.getElementById('doc-tab-content-schema'),
    docTabContentGaps: document.getElementById('doc-tab-content-gaps'),

    // Live upload
    fileInputHidden: document.getElementById('file-input-hidden'),
    browseFileBtn: document.getElementById('browse-file-btn'),
    togglePasteBtn: document.getElementById('toggle-paste-btn'),
    pasteTextPanel: document.getElementById('paste-text-panel'),
    pasteTextInput: document.getElementById('paste-text-input'),
    pasteDocName: document.getElementById('paste-doc-name'),
    analyzePasteBtn: document.getElementById('analyze-paste-btn'),
    uploadProcessingStatus: document.getElementById('upload-processing-status'),
    uploadStatusText: document.getElementById('upload-status-text'),
    dropzoneIcon: document.getElementById('dropzone-icon'),
    dropzoneTitle: document.getElementById('dropzone-title'),
    liveUploadPanel: document.getElementById('live-upload-panel'),
    mockDocsPanel: document.getElementById('mock-docs-panel'),
    uploadModeTabs: document.querySelectorAll('.upload-mode-tab'),

    // AI dossier analysis
    aiStatusDot: document.getElementById('ai-status-dot'),
    aiStatusText: document.getElementById('ai-status-text'),
    dossierStaging: document.getElementById('dossier-staging'),
    dossierFileList: document.getElementById('dossier-file-list'),
    dossierCount: document.getElementById('dossier-count'),
    dossierPlural: document.getElementById('dossier-plural'),
    dossierClearBtn: document.getElementById('dossier-clear-btn'),
    analyzeDossierBtn: document.getElementById('analyze-dossier-btn'),
    targetMarketSelect: document.getElementById('target-market-select'),
    productCategorySelect: document.getElementById('product-category-select'),
    aiProviderSelect: document.getElementById('ai-provider-select'),

    // Classification
    classInputName: document.getElementById('class-product-name'),
    classInputIngredients: document.getElementById('class-ingredients'),
    classInputClaims: document.getElementById('class-claims'),
    classInputDosage: document.getElementById('class-dosage-form'),
    classBtnRun: document.getElementById('class-btn-run'),
    classBtnText: document.getElementById('class-btn-text'),
    classBtnSpinner: document.getElementById('class-btn-spinner'),
    classResultBadge: document.getElementById('class-result-badge'),
    classResultTitle: document.getElementById('class-result-title'),
    classResultLaw: document.getElementById('class-result-law'),
    classResultDesc: document.getElementById('class-result-desc'),
    classResultTreeStep1: document.getElementById('class-step-1-status'),
    classResultTreeStep2: document.getElementById('class-step-2-status'),
    classResultTreeStep3: document.getElementById('class-step-3-status'),
    classResultTreeStep4: document.getElementById('class-step-4-status'),
    errClassName: document.getElementById('err-class-name'),
    errClassIngredients: document.getElementById('err-class-ingredients'),
    errClassClaims: document.getElementById('err-class-claims'),

    // Translation
    transClaimsInput: document.getElementById('trans-claims-input'),
    transBtnRun: document.getElementById('trans-btn-run'),
    transResultsContainer: document.getElementById('trans-results-container'),
    transUnitRdaInput: document.getElementById('trans-unit-rda'),
    transUnitAmtInput: document.getElementById('trans-unit-amount'),
    transUnitLabel: document.getElementById('trans-unit-type'),
    transUnitBtn: document.getElementById('trans-unit-btn'),
    transUnitOutput: document.getElementById('trans-unit-output'),

    // RAG
    ragSearchInput: document.getElementById('rag-search-input'),
    ragSearchBtn: document.getElementById('rag-search-btn'),
    ragResultsContainer: document.getElementById('rag-results-container'),
    ragRemediationDrafts: document.getElementById('rag-remediation-drafts'),

    // Crosswalk & Markets
    crosswalkTableContainer: document.getElementById('crosswalk-table-container'),
    marketRegulationsContainer: document.getElementById('market-regulations-container'),
    marketRegulationsHeading: document.getElementById('market-regulations-heading'),
    indiaRegulationsContainer: document.getElementById('india-regulations-container'),
    marketTabs: document.getElementById('market-tabs'),

    // Modal & Mobile
    disclaimerModal: document.getElementById('disclaimer-modal'),
    disclaimerAcceptBtn: document.getElementById('disclaimer-accept-btn'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    sidebarEl: document.getElementById('app-sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    btnDownloadReport: document.getElementById('btn-download-report'),
  };

  // ==========================================================================
  // 3. INIT
  // ==========================================================================
  function init() {
    setupViewListeners();
    setupThemeListener();
    setupDocumentParserListeners();
    setupLiveUploadListeners();
    setupClassificationListeners();
    setupTranslationListeners();
    setupRagListeners();
    setupCrosswalkListeners();
    setupMobileMenu();
    setupDownloadReport();
    setupUserNameEdit();

    applyTheme(readSavedTheme() || state.theme, { persist: false });

    // Pre-load CoA silently, highlight its button in mock mode
    loadMockDoc('coa', false);

    switchView('dashboard');
    renderCrosswalkView();
    setupMarketTabs();
    renderMarketsView('US');
    initDisclaimer();
    setupHumanReviewGate();

    // Set upload mode to live by default
    setUploadMode('live');

    // Probe the backend for AI analysis availability
    checkAiHealth();
  }

  // ==========================================================================
  // 4. DISCLAIMER
  // ==========================================================================
  function initDisclaimer() {
    if (!sessionStorage.getItem('apex_disclaimer_accepted')) {
      DOM.disclaimerModal.classList.remove('hidden');
    } else {
      DOM.disclaimerModal.classList.add('hidden');
    }
    DOM.disclaimerAcceptBtn.addEventListener('click', () => {
      sessionStorage.setItem('apex_disclaimer_accepted', '1');
      DOM.disclaimerModal.classList.add('hidden');
    });
  }

  // ==========================================================================
  // 5. VIEW MANAGER
  // ==========================================================================
  function setupViewListeners() {
    DOM.navItems.forEach(item => {
      item.addEventListener('click', () => {
        switchView(item.getAttribute('data-view'));
        closeMobileSidebar();
      });
    });
  }

  function switchView(viewName) {
    state.activeView = viewName;
    DOM.navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-view') === viewName));
    DOM.viewPanels.forEach(panel => panel.classList.toggle('active', panel.id === `view-${viewName}`));
    const titles = {
      dashboard: "Compliance Dashboard & Executive Summary",
      parsing: "Intelligent Document Analysis & OCR Pipeline",
      classification: "Algorithmic Product Classification Gate",
      translation: "Ayush Claim Translator & RDA Recalculator",
      crosswalk: "FSSAI / AYUSH → US FDA Terminology Crosswalk",
      markets: "EU & Gulf Market Regulatory Guide",
      rag: "Regulatory Knowledge Base Explorer"
    };
    DOM.pageTitle.textContent = titles[viewName] || "FDA Compliance Platform";
  }
  window.switchView = switchView;

  // ==========================================================================
  // 6. MOBILE SIDEBAR
  // ==========================================================================
  function setupMobileMenu() {
    DOM.hamburgerBtn.addEventListener('click', () => {
      DOM.sidebarEl.classList.contains('sidebar-open') ? closeMobileSidebar() : openMobileSidebar();
    });
    DOM.sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }
  function openMobileSidebar() {
    DOM.sidebarEl.classList.add('sidebar-open');
    DOM.sidebarOverlay.classList.add('visible');
    DOM.hamburgerBtn.classList.add('open');
  }
  function closeMobileSidebar() {
    DOM.sidebarEl.classList.remove('sidebar-open');
    DOM.sidebarOverlay.classList.remove('visible');
    DOM.hamburgerBtn.classList.remove('open');
  }

  // ==========================================================================
  // 7. THEME
  // ==========================================================================
  function readSavedTheme() {
    try {
      const saved = localStorage.getItem('apex_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* private mode / blocked storage */
    }
    return null;
  }

  function applyTheme(theme, { persist = true } = {}) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    DOM.themeCheckbox.checked = state.theme === 'dark';
    DOM.themeCheckbox.setAttribute('aria-label', state.theme === 'dark' ? 'Use light theme' : 'Use dark theme');
    if (!persist) return;
    try {
      localStorage.setItem('apex_theme', state.theme);
    } catch {
      /* private mode / blocked storage */
    }
  }

  function setupThemeListener() {
    DOM.themeCheckbox.addEventListener('change', () => {
      applyTheme(DOM.themeCheckbox.checked ? 'dark' : 'light');
    });
  }

  // ==========================================================================
  // 8. USERNAME
  // ==========================================================================
  function setupUserNameEdit() {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-initials');
    nameEl.addEventListener('input', () => {
      const val = nameEl.textContent.trim();
      if (val.length > 0) {
        const parts = val.split(' ');
        avatarEl.textContent = (parts.length >= 2
          ? parts[0][0] + parts[parts.length - 1][0]
          : val.substring(0, 2)).toUpperCase();
      }
    });
  }

  // ==========================================================================
  // 9. UPLOAD MODE TOGGLE (Live vs Mock)
  // ==========================================================================
  function setUploadMode(mode) {
    state.uploadMode = mode;
    DOM.uploadModeTabs.forEach(btn => {
      btn.classList.toggle('active-mode', btn.getAttribute('data-mode') === mode);
      btn.classList.toggle('btn-primary', btn.getAttribute('data-mode') === mode);
      btn.classList.toggle('btn-secondary', btn.getAttribute('data-mode') !== mode);
    });
    if (mode === 'live') {
      DOM.liveUploadPanel.style.display = 'block';
      DOM.mockDocsPanel.style.display = 'none';
    } else {
      DOM.liveUploadPanel.style.display = 'none';
      DOM.mockDocsPanel.style.display = 'block';
      // Highlight coa button
      DOM.docSelectors.forEach(b => {
        if (b.getAttribute('data-doc') === 'coa') { b.classList.add('btn-primary'); b.classList.remove('btn-secondary'); }
      });
    }
  }

  // ==========================================================================
  // 10. LIVE UPLOAD LISTENERS
  // ==========================================================================
  function setupLiveUploadListeners() {
    // Mode tab switch
    DOM.uploadModeTabs.forEach(btn => {
      btn.addEventListener('click', () => setUploadMode(btn.getAttribute('data-mode')));
    });

    // Browse button
    DOM.browseFileBtn.addEventListener('click', () => DOM.fileInputHidden.click());

    // File input change — stage one or more files into the dossier
    DOM.fileInputHidden.addEventListener('change', (e) => {
      stageFiles(Array.from(e.target.files));
      e.target.value = ''; // reset so same file can be re-selected
    });

    // Drop zone drag events
    const dz = DOM.dropZone;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      stageFiles(Array.from(e.dataTransfer.files));
    });
    dz.addEventListener('click', e => {
      if (e.target.closest('#browse-file-btn') || e.target.closest('#toggle-paste-btn')) return;
      DOM.fileInputHidden.click();
    });

    // Dossier staging actions
    if (DOM.dossierClearBtn) DOM.dossierClearBtn.addEventListener('click', clearDossier);
    if (DOM.analyzeDossierBtn) DOM.analyzeDossierBtn.addEventListener('click', () => analyzeDossier());

    // Paste text toggle
    DOM.togglePasteBtn.addEventListener('click', () => {
      const isHidden = DOM.pasteTextPanel.style.display === 'none';
      DOM.pasteTextPanel.style.display = isHidden ? 'block' : 'none';
      DOM.togglePasteBtn.textContent = isHidden
        ? '✖ Close Paste Panel'
        : '✏️ Or Paste Document Text Manually (for images / scanned docs)';
    });

    // Analyze pasted text
    DOM.analyzePasteBtn.addEventListener('click', () => {
      const text = DOM.pasteTextInput.value.trim();
      if (!text || text.length < 30) {
        alert('Please paste at least some document content to analyze (minimum 30 characters).');
        return;
      }
      const docName = DOM.pasteDocName.value.trim() || 'Pasted_Document.txt';
      // Regex offline path is demo-only and must not count as pipeline success.
      analyzeDossier([{ name: docName, text }]);
    });
  }

  // ==========================================================================
  // 11. FILE PROCESSING & PDF TEXT EXTRACTION
  // ==========================================================================
  async function processUploadedFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    setDropzoneProcessing(true, `Reading "${file.name}"...`);

    try {
      let rawText = '';

      if (ext === 'pdf') {
        setDropzoneProcessing(true, 'Extracting text from PDF pages...');
        rawText = await extractTextFromPDF(file);
      } else if (['txt', 'csv', 'tsv', 'md', 'markdown'].includes(ext)) {
        setDropzoneProcessing(true, 'Reading text file...');
        rawText = await readTextFile(file);
      } else {
        setDropzoneProcessing(false);
        setDropzoneState('error',
          '⚠️',
          `Unsupported File Format (.${ext})`,
          `PDF, TXT, CSV, and Markdown files are supported. For JPG/TIFF scans, use the "Paste Document Text" option below.`
        );
        return;
      }

      if (!rawText || rawText.trim().length < 30) {
        setDropzoneProcessing(false);
        setDropzoneState('error', '⚠️', 'No Text Extracted',
          'Could not extract readable text from this file. It may be an image-based or encrypted PDF. Please use the "Paste Document Text" option below.');
        return;
      }

      setDropzoneProcessing(true, 'Queuing for AI compliance analysis...');
      await sleep(200);
      // Prefer AI path; do not treat regex as success.
      if (state.aiEnabled) {
        await analyzeDossier([{ name: file.name, text: rawText }]);
      } else {
        setDropzoneProcessing(false);
        setDropzoneState('error', '⚠️', 'AI key required',
          'Offline regex analysis is not pipeline success. Set NVIDIA_API_KEY or ANTHROPIC_API_KEY and restart.');
      }

    } catch (err) {
      console.error('File processing error:', err);
      setDropzoneProcessing(false);
      setDropzoneState('error', '❌', 'Processing Error',
        `Error reading file: ${err.message}. Try the "Paste Document Text" option below.`);
    }
  }

  async function extractTextFromPDF(file) {
    if (!window.pdfjsLib) throw new Error('PDF.js library not loaded.');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      DOM.uploadStatusText.textContent = `Extracting text — page ${i} of ${pdf.numPages}...`;
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsText(file);
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function setDropzoneProcessing(active, message = '') {
    DOM.uploadProcessingStatus.style.display = active ? 'block' : 'none';
    if (message) DOM.uploadStatusText.textContent = message;
    DOM.browseFileBtn.disabled = active;
  }

  function setDropzoneState(type, icon, title, hint) {
    if (DOM.dropzoneIcon) DOM.dropzoneIcon.textContent = icon;
    if (DOM.dropzoneTitle) DOM.dropzoneTitle.textContent = title;
    if (DOM.dropzoneHint) {
      DOM.dropzoneHint.textContent = hint;
      DOM.dropzoneHint.style.color = type === 'error' ? 'var(--clr-warning-50)' : type === 'success' ? 'var(--clr-success-50)' : '';
    }
  }

  // ==========================================================================
  // 11b. AI DOSSIER ANALYSIS (Claude backend)
  // ==========================================================================
  async function checkAiHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      state.aiEnabled = !!data.aiEnabled;
      populateProviders(data);
      if (data.humanReviewDisclaimer && DOM.humanReviewDisclaimerText) {
        DOM.humanReviewDisclaimerText.textContent = data.humanReviewDisclaimer;
      }
      setAiStatus(
        state.aiEnabled ? 'online' : 'offline',
        state.aiEnabled
          ? `AI analysis online — powered by ${data.model || data.provider || 'LLM'}`
          : 'AI engine reachable, but no API key is set. Pipeline analysis unavailable (regex is not success).'
      );
    } catch {
      state.aiEnabled = false;
      setAiStatus('offline', 'Backend not running — pipeline analysis unavailable. Run "npm start" with an NVIDIA or Anthropic key.');
    }
  }

  function updateHumanReviewPanel(meta) {
    const m = meta || {};
    const reportId = m.reportId || (state.lastReport && state.lastReport._meta && state.lastReport._meta.reportId);
    if (DOM.dashboardReleaseStatus) {
      if (m.released === true || m.exportAuthorized === true) {
        DOM.dashboardReleaseStatus.textContent = 'released (human review on file)';
        DOM.dashboardReleaseStatus.style.color = 'var(--clr-success-50)';
      } else if (m.humanReviewRequired) {
        DOM.dashboardReleaseStatus.textContent = 'blocked — human review required';
        DOM.dashboardReleaseStatus.style.color = 'var(--clr-warning-50)';
      } else {
        DOM.dashboardReleaseStatus.textContent = 'not released';
        DOM.dashboardReleaseStatus.style.color = '';
      }
    }
    if (!DOM.humanReviewStatus) return;
    if (!reportId) {
      DOM.humanReviewStatus.textContent =
        'Analyze a dossier first. EXPORT READY scores require a named sign-off before released.';
      if (DOM.humanReviewSubmit) DOM.humanReviewSubmit.disabled = true;
      return;
    }
    if (m.humanReview && m.humanReview.reviewerName) {
      DOM.humanReviewStatus.textContent =
        `Signed off by ${m.humanReview.reviewerName} (${m.humanReview.reviewerId}) at ${m.humanReview.reviewedAt}` +
        (m.released ? ' · released=true' : ' · released=false');
      if (DOM.humanReviewSubmit) DOM.humanReviewSubmit.disabled = true;
      return;
    }
    DOM.humanReviewStatus.textContent =
      `Report ${reportId} · band=${m.band || '?'} · gate=${m.humanReviewGate || 'enforce'}` +
      (m.humanReviewRequired
        ? ' · submit named sign-off to authorize export language.'
        : ' · sign-off optional for this band (export still not released unless EXPORT_READY).');
    if (DOM.humanReviewSubmit) DOM.humanReviewSubmit.disabled = false;
  }

  function setupHumanReviewGate() {
    if (!DOM.humanReviewForm) return;
    if (DOM.humanReviewSubmit) DOM.humanReviewSubmit.disabled = true;
    DOM.humanReviewForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const reportId =
        state.lastReport && state.lastReport._meta && state.lastReport._meta.reportId;
      if (!reportId) {
        alert('Run AI analyze first so the server has a reportId to sign.');
        return;
      }
      const reviewerId = (DOM.humanReviewId && DOM.humanReviewId.value.trim()) || '';
      const reviewerName = (DOM.humanReviewName && DOM.humanReviewName.value.trim()) || '';
      const ack = !!(DOM.humanReviewDisclaimer && DOM.humanReviewDisclaimer.checked);
      if (!reviewerId || !reviewerName || !ack) {
        alert('Reviewer id, name, and jurisdiction disclaimer acknowledgement are required.');
        return;
      }
      if (DOM.humanReviewSubmit) {
        DOM.humanReviewSubmit.disabled = true;
        DOM.humanReviewSubmit.textContent = 'Submitting…';
      }
      try {
        const res = await fetch('/api/human-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            reviewerId,
            reviewerName,
            jurisdictionDisclaimerAck: true,
            decision: 'approve',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Sign-off failed');
        if (data.report) {
          state.lastReport = data.report;
        } else if (state.lastReport && data._meta) {
          state.lastReport._meta = data._meta;
        }
        const violations = (state.lastReport && state.lastReport.violations) || [];
        const scoreReport = scoreReportFromMetaOrLocal(
          violations,
          state.lastReport && state.lastReport._meta,
        );
        updateDashboardScores(scoreReport, violations);
        updateHumanReviewPanel(state.lastReport && state.lastReport._meta);
        setAiStatus(
          'online',
          data.released
            ? `Human review approved — released=true (${reviewerName})`
            : `Human review recorded — released=false (band=${data.band})`,
        );
      } catch (err) {
        alert(`Human review failed: ${err.message}`);
        if (DOM.humanReviewSubmit) DOM.humanReviewSubmit.disabled = false;
      } finally {
        if (DOM.humanReviewSubmit) DOM.humanReviewSubmit.textContent = 'Submit sign-off';
      }
    });
  }

  // Build the AI-engine dropdown from the providers/models the backend reports.
  function populateProviders(data) {
    const sel = DOM.aiProviderSelect;
    if (!sel) return;
    const labels = { anthropic: 'Claude (Anthropic)', nvidia: 'NVIDIA Nemotron' };
    const providers = data.providers || {};
    const models = data.models || {};
    const opts = Object.keys(labels)
      .filter(p => providers[p])                 // only providers with a usable key
      .map(p => `<option value="${p}">${labels[p]} — ${models[p] || ''}</option>`);
    if (opts.length === 0) {
      sel.innerHTML = '<option value="">No AI engine configured</option>';
      sel.disabled = true;
      return;
    }
    sel.innerHTML = opts.join('');
    sel.disabled = false;
    if (data.provider && providers[data.provider]) sel.value = data.provider;  // default to active
  }

  function setAiStatus(kind, text) {
    if (!DOM.aiStatusDot) return;
    const colors = { online: 'var(--clr-success-50)', offline: 'var(--clr-warning-50)', busy: 'var(--accent)' };
    DOM.aiStatusDot.style.background = colors[kind] || 'var(--text-muted)';
    DOM.aiStatusText.textContent = text;
  }

  async function stageFiles(files) {
    const accepted = files.filter(f => /\.(pdf|txt|csv|tsv|md|markdown)$/i.test(f.name));
    if (accepted.length === 0) {
      setDropzoneState('error', '⚠️', 'Unsupported File Type', 'Please add PDF, TXT, CSV, or Markdown (.md) files. For images/scans, use the paste-text option below.');
      return;
    }
    for (const file of accepted) {
      setDropzoneProcessing(true, `Reading "${file.name}"…`);
      try {
        const ext = file.name.split('.').pop().toLowerCase();
        const text = ext === 'pdf' ? await extractTextFromPDF(file) : await readTextFile(file);
        if (text && text.trim().length >= 20) {
          state.dossier.push({ name: file.name, text });
        } else {
          setDropzoneState('error', '⚠️', 'No text extracted', `"${file.name}" appears to be image-based or empty. Use the paste-text option for scanned files.`);
        }
      } catch (err) {
        setDropzoneState('error', '❌', 'Read error', `Could not read "${file.name}": ${err.message}`);
      }
    }
    setDropzoneProcessing(false);
    renderDossierList();
  }

  function renderDossierList() {
    const has = state.dossier.length > 0;
    DOM.dossierStaging.style.display = has ? 'block' : 'none';
    if (!has) return;
    DOM.dossierCount.textContent = state.dossier.length;
    DOM.dossierPlural.textContent = state.dossier.length === 1 ? '' : 's';
    DOM.dossierFileList.innerHTML = '';
    state.dossier.forEach((doc, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:var(--fs-xs);background:rgba(0,0,0,0.02)';
      row.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📄 ${doc.name} <span style="color:var(--text-muted)">(${(doc.text.length/1000).toFixed(1)}k chars)</span></span>`;
      const rm = document.createElement('button');
      rm.className = 'btn btn-secondary';
      rm.style.cssText = 'min-block-size:26px;padding:0 0.5rem;font-size:var(--fs-xs);flex-shrink:0';
      rm.textContent = '✕';
      rm.title = 'Remove from dossier';
      rm.onclick = () => { state.dossier.splice(idx, 1); renderDossierList(); };
      row.appendChild(rm);
      DOM.dossierFileList.appendChild(row);
    });
  }

  function clearDossier() {
    state.dossier = [];
    renderDossierList();
    setDropzoneState('default', '📄', 'Drag & Drop Your Product Dossier Here', 'Add one or more files — analyzed together as one product.');
  }

  // documents: optional override (e.g. paste). Otherwise uses staged dossier.
  async function analyzeDossier(documents) {
    const docs = documents || state.dossier;
    if (!docs.length) { alert('Add at least one document to the dossier first.'); return; }
    if (state.analyzing) return;

    if (!state.aiEnabled) {
      // No regex-as-success: offline rule engine is not pipeline output.
      alert('AI analysis is required for a valid compliance report. Set NVIDIA_API_KEY or ANTHROPIC_API_KEY and restart the server. Offline regex analysis is demo-only and does not count as success.');
      setAiStatus('offline', 'Pipeline blocked — no API key. Regex is not treated as success.');
      return;
    }

    state.analyzing = true;
    const engineLabel = (DOM.aiProviderSelect && DOM.aiProviderSelect.selectedOptions[0])
      ? DOM.aiProviderSelect.selectedOptions[0].textContent.split(' — ')[0]
      : 'AI';
    if (DOM.analyzeDossierBtn) { DOM.analyzeDossierBtn.disabled = true; DOM.analyzeDossierBtn.textContent = `🧠 Analyzing dossier with ${engineLabel}…`; }
    setAiStatus('busy', `${engineLabel} is analyzing ${docs.length} document(s)…`);

    try {
      const productName = (DOM.classInputName && DOM.classInputName.value.trim()) || '';
      const market = (DOM.targetMarketSelect && DOM.targetMarketSelect.value) || 'US';
      const category = (DOM.productCategorySelect && DOM.productCategorySelect.value) || 'SUPPLEMENT';
      const provider = (DOM.aiProviderSelect && DOM.aiProviderSelect.value) || undefined;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, documents: docs, market, category, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Analysis failed.');
      renderAiReport(data, docs);
      const mkt = data._meta?.marketLabel ? ` for ${data._meta.marketLabel}` : '';
      const cat = data._meta?.categoryLabel ? ` (${data._meta.categoryLabel})` : '';
      setAiStatus('online', `Analysis complete${mkt}${cat} — ${data.violations.length} finding(s)` +
        (data._meta?.readinessScore != null ? ` · FRS ${data._meta.readinessScore} (${data._meta.bandLabel || data._meta.band})` : '') +
        (data._meta?.pipelineReady ? ' · pipelineReady' : '') +
        ` — ${data._meta?.model || 'AI'}.`);
    } catch (err) {
      setAiStatus('offline', `Analysis error: ${err.message}`);
      alert(`AI analysis failed: ${err.message}`);
    } finally {
      state.analyzing = false;
      if (DOM.analyzeDossierBtn) { DOM.analyzeDossierBtn.disabled = false; DOM.analyzeDossierBtn.textContent = '🤖 Analyze Full Dossier with AI'; }
    }
  }

  // Render the structured Claude report across Dashboard, Doc Audit,
  // Classification, and Claim Translator views.
  function renderAiReport(report, docs) {
    const violations = report.violations || [];
    // Persist the full report so the Export Report button can capture everything.
    state.lastReport = report;
    state.lastReportDocs = docs || [];

    // --- Dashboard: consume server `_meta` readiness (pipeline truth) ---
    if (DOM.dashboardProductName) DOM.dashboardProductName.textContent = report.productName || 'Analyzed Product';
    // Reflect the analyzed market in the readiness-score heading.
    const headingEl = document.getElementById('readiness-score-heading');
    if (headingEl) {
      const mkt = report._meta && report._meta.marketLabel;
      headingEl.textContent = mkt ? `Export Readiness Score — ${mkt}` : 'Export Readiness Score';
    }
    const scoreReport = scoreReportFromMetaOrLocal(violations, report._meta);
    updateDashboardScores(scoreReport, violations);
    if (scoreReport.truncated && DOM.dashboardScoreDesc) {
      DOM.dashboardScoreDesc.textContent =
        `${scoreReport.band.desc} ⚠ Dossier truncated before analysis — see _meta.truncation.`;
    }
    if (scoreReport.fromServer && scoreReport.humanReviewRequired && scoreReport.band.key === 'EXPORT_READY') {
      DOM.dashboardScoreDesc.textContent =
        `${scoreReport.band.desc} Human review required before export authorization.`;
    }
    updateHumanReviewPanel(report._meta);

    // --- Document Audit panel ---
    const primary = (docs && docs[0]) || { name: report.productName, text: '' };
    state.selectedDocument = {
      isLive: true,
      fileName: primary.name,
      documentType: 'AI Dossier Analysis',
      id: `AI-${Date.now()}`,
    };
    DOM.parsingDocName.textContent = `${(docs || []).length} document(s) — ${report.productName || 'Dossier'}`;
    DOM.parsingDocType.textContent = report.classification?.title || 'AI Analysis';
    DOM.parsingDocSize.textContent = state.selectedDocument.id;
    renderAiDocTabs(report, docs || []);

    // --- Classification view ---
    renderAiClassification(report.classification);

    // --- Claim Translator view ---
    renderAiClaims(report.claimAnalysis || []);

    // Navigate the user to the results
    switchView('dashboard');
  }

  function renderAiDocTabs(report, docs) {
    [DOM.docTabContentRaw, DOM.docTabContentSchema, DOM.docTabContentGaps].forEach(p => p.style.display = 'none');
    DOM.docTabContentRaw.style.display = 'block';

    const docSummaries = (report.documentsAssessed || []).map(d =>
      `<div style="padding:0.65rem 0.85rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:0.5rem">
        <strong style="font-size:var(--fs-sm)">📄 ${d.name} <span class="badge badge-low">${d.type}</span></strong>
        <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:0.3rem">${d.summary}</p>
      </div>`).join('');

    const ingredients = (report.ingredientFindings || []).map(i => {
      const bad = ['PROHIBITED', 'REQUIRES_TTB_PERMIT'].includes(i.fdaStatus);
      const warn = ['NDI_REQUIRED', 'RESTRICTED', 'REVIEW'].includes(i.fdaStatus);
      const color = bad ? 'var(--clr-danger-50)' : warn ? 'var(--clr-warning-50)' : 'var(--clr-success-50)';
      return `<div style="display:flex;justify-content:space-between;gap:0.5rem;padding:0.35rem 0;border-bottom:1px solid var(--border-color);font-size:var(--fs-xs)">
        <span><strong>${i.name}</strong> — ${i.note}</span>
        <span style="color:${color};font-weight:700;white-space:nowrap">${i.fdaStatus}</span>
      </div>`;
    }).join('');

    DOM.docTabContentRaw.innerHTML = `
      <div class="live-result-banner"><span>🤖</span><span>AI Dossier Analysis — ${report.violations.length} compliance gap(s) found</span><span class="confidence-chip">CLAUDE</span></div>
      <h3 style="margin-top:1rem">Executive Summary</h3>
      <p style="font-size:var(--fs-sm)">${report.productSummary || ''}</p>
      <h3 style="margin-top:1rem">Documents Assessed</h3>
      ${docSummaries || '<p style="font-size:var(--fs-xs);color:var(--text-muted)">—</p>'}
      ${ingredients ? `<h3 style="margin-top:1rem">Ingredient Findings</h3><div>${ingredients}</div>` : ''}`;

    DOM.docTabContentSchema.innerHTML = `<pre style="font-size:var(--fs-xs);line-height:1.4;color:var(--text-muted);overflow-x:auto;white-space:pre-wrap">${JSON.stringify(report, null, 2)}</pre>`;

    DOM.docTabContentGaps.innerHTML = '';
    if (report.violations.length === 0) {
      DOM.docTabContentGaps.innerHTML = `<div class="badge badge-ready">✅ No compliance gaps detected.</div>`;
    } else {
      report.violations.forEach(v => {
        const card = document.createElement('div');
        card.className = `remediation-card ${v.severity.toLowerCase()}`;
        card.innerHTML = `
          <div class="remediation-icon">⚠️</div>
          <div class="remediation-details">
            <div class="remediation-title"><span class="badge badge-${v.severity.toLowerCase()}">${v.severity}</span> ${v.finding}</div>
            <div class="remediation-text">${v.remediation}</div>
            <div class="remediation-meta"><span class="remediation-citation">${v.citation}</span></div>
          </div>`;
        DOM.docTabContentGaps.appendChild(card);
      });
    }

    DOM.docTabButtons.forEach(btn => {
      btn.onclick = () => {
        DOM.docTabButtons.forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
        btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
        const tab = btn.getAttribute('data-tab');
        DOM.docTabContentRaw.style.display = tab === 'raw' ? 'block' : 'none';
        DOM.docTabContentSchema.style.display = tab === 'schema' ? 'block' : 'none';
        DOM.docTabContentGaps.style.display = tab === 'gaps' ? 'block' : 'none';
      };
    });
  }

  const VERDICT_BADGE = {
    DIETARY_SUPPLEMENT: 'badge-ready',
    CONVENTIONAL_FOOD: 'badge-low',
    UNAPPROVED_NEW_DRUG: 'badge-critical',
    MISBRANDED_PRODUCT: 'badge-high',
    REQUIRES_REVIEW: 'badge-medium',
  };

  function renderAiClassification(c) {
    if (!c) return;
    DOM.classResultBadge.textContent = c.title;
    DOM.classResultBadge.className = `badge ${VERDICT_BADGE[c.verdict] || 'badge-medium'}`;
    DOM.classResultTitle.textContent = c.title;
    DOM.classResultLaw.textContent = `Governing Law: ${c.governingLaw}`;
    DOM.classResultDesc.textContent = c.rationale;

    const stepEls = [DOM.classResultTreeStep1, DOM.classResultTreeStep2, DOM.classResultTreeStep3, DOM.classResultTreeStep4];
    const icon = { PASS: '✅', FAIL: '❌', REVIEW: '⚠️' };
    stepEls.forEach((el, i) => {
      if (!el) return;
      const step = c.decisionSteps && c.decisionSteps[i];
      el.innerHTML = step
        ? `${step.gate}: <strong>${icon[step.status] || ''} ${step.detail}</strong>`
        : '';
      el.style.display = step ? 'block' : 'none';
    });
  }

  function renderAiClaims(claims) {
    if (!DOM.transResultsContainer) return;
    DOM.transResultsContainer.innerHTML = '';
    if (!claims.length) {
      DOM.transResultsContainer.innerHTML = `<p style="font-size:var(--fs-sm);color:var(--text-muted)">No marketing claims were detected in the dossier.</p>`;
      return;
    }
    const riskBadge = { CRITICAL: 'badge-critical', HIGH: 'badge-high', MODERATE: 'badge-medium', LOW: 'badge-low', COMPLIANT: 'badge-ready' };
    claims.forEach(c => {
      const card = document.createElement('div');
      card.className = 'glass-card';
      card.style.cssText = 'padding:1rem;border-left:3px solid var(--accent)';
      card.innerHTML = `
        <span class="badge ${riskBadge[c.risk] || 'badge-medium'}">${c.risk}</span>
        <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:0.5rem">Original claim:</p>
        <p style="font-size:var(--fs-sm);font-style:italic">"${c.originalClaim}"</p>
        <p style="font-size:var(--fs-xs);color:var(--clr-danger-50);margin-top:0.5rem">${c.issue}</p>
        <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:0.65rem">FDA-compliant reframing:</p>
        <p style="font-size:var(--fs-sm);color:var(--clr-success-50)">"${c.reframedClaim}"</p>
        <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:0.5rem">${c.citation}</p>`;
      DOM.transResultsContainer.appendChild(card);
    });
  }

  // ==========================================================================
  // 12. LIVE COMPLIANCE ANALYSIS ENGINE
  // ==========================================================================

  // -- Disease claim patterns --
  const DISEASE_PATTERNS = [
    { pattern: /\bcure[sd]?\b/i,                        term: 'cure/cures' },
    { pattern: /\btreat(s|ed|ment|ing)?\b/i,            term: 'treat/treatment' },
    { pattern: /\bprevent(s|ion|ing)?\b/i,              term: 'prevent/prevention' },
    { pattern: /\bdiabetes\b|\bdiabetic\b|\bmadhumeh\b|\bblood sugar control\b/i, term: 'diabetes/blood sugar control' },
    { pattern: /\barthritis\b|\brheumat/i,              term: 'arthritis' },
    { pattern: /\bcancer\b|\banti.?tumor\b/i,           term: 'cancer' },
    { pattern: /\bhigh cholesterol\b|\bcholesterol.?lower/i, term: 'high cholesterol treatment' },
    { pattern: /\basthma\b/i,                            term: 'asthma' },
    { pattern: /\binfection\b/i,                         term: 'infection (disease)' },
    { pattern: /\bclinical depression\b|\bchronic depression\b/i, term: 'clinical depression' },
    { pattern: /\bhypothyroidism\b|\bthyroid disorder\b|\bthyroid disease\b/i, term: 'hypothyroidism' },
    { pattern: /\binfertility\b/i,                       term: 'infertility (disease)' },
    { pattern: /\bhypertension\b|\bhigh blood pressure\b/i, term: 'hypertension' },
    { pattern: /\bkidney (disease|failure|disorder)\b/i, term: 'kidney disease' },
    { pattern: /\bliver disease\b|\bhepatic (failure|disorder)\b/i, term: 'liver disease' },
    { pattern: /\blaxati(ve|on|ng)\b/i,                  term: 'laxation (drug-like action)' },
    { pattern: /\bbowel.{0,15}clean\b/i,                 term: 'bowel cleansing (drug claim)' },
    { pattern: /\bcolon.{0,15}clean\b/i,                 term: 'colon cleansing (drug claim)' },
    { pattern: /\bdetoxif(y|ies|ication|ying)\b/i,       term: 'detoxification (organ)' },
    { pattern: /\bpurge[sd]?\b|\bpurgativ/i,             term: 'purgative action (drug-like)' },
    { pattern: /\bfight(s|ing)?.{0,20}infection/i,       term: 'fighting infections' },
    { pattern: /\bimmunit(y|ies).{0,15}(boost|enhanc|build|fight)/i, term: 'immunity boosting (prevention claim)' },
    { pattern: /\bweight loss\b|\bfat burn/i,            term: 'weight loss' },
    { pattern: /\banti.?inflamm/i,                       term: 'anti-inflammatory (drug-like)' },
    { pattern: /\bpain relief\b|\breliev.{0,15}pain\b/i, term: 'pain relief (drug claim)' },
    { pattern: /\blower.{0,15}blood pressure\b/i,        term: 'blood pressure lowering' },
    { pattern: /\bpsoriasis\b|\beczema\b|\bdermatitis\b/i, term: 'skin disease' },
    { pattern: /\bmenstrual irregularit/i,               term: 'menstrual disorder treatment' },
    { pattern: /\bUTI\b|urinary tract infection/i,       term: 'UTI treatment (drug claim)' },
    { pattern: /\bnerve debility\b/i,                    term: 'nerve debility (drug claim)' },
    { pattern: /\bchronic fatigue\b/i,                   term: 'chronic fatigue syndrome' },
    { pattern: /\bIBS\b|irritable bowel/i,               term: 'IBS (disease)' },
  ];

  // -- Prohibited/high-risk ingredients --
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

  // -- NDI-likely ingredients (not commercially marketed in US before Oct 15, 1994) --
  const NDI_LIKELY_INGREDIENTS = [
    'Shilajit', 'Moringa', 'Guduchi', 'Tinospora', 'Mucuna',
    'Boswellia', 'Gymnema', 'Vijayasar', 'Karela', 'Neem extract',
    'Haritaki', 'Vibhitaki', 'Dhataki', 'Bilva', 'Shyonaka',
    'Gambhari', 'Dashamul', 'Punarnava', 'Kutki', 'Chirayata',
    'Kalmegh', 'Andrographis', 'Pippali', 'Bhringraj', 'Manjistha',
    'Lodhra', 'Vidanga', 'Nagarmotha', 'Vacha', 'Jatamansi',
    'Khadira', 'Sariva', 'Devdaru', 'Bala', 'Atibala',
  ];

  // -- Alcohol/TTB trigger ingredients --
  const FERMENTED_INDICATORS = ['arishta', 'asava', 'fermented', 'self-generated alcohol', 'abv', 'alcohol by volume', 'wine', 'dhataki'];

  // -- Known GMP gap indicators --
  const GMP_GAPS = [
    { pattern: /no\s+(identity|identit(y|ification))\s+test/i,  finding: 'No identity testing mentioned for botanical ingredients', citation: '21 CFR §111.75(a)(1)(i)' },
    { pattern: /without\s+(independent|separate)\s+QC/i,        finding: 'Missing independent QC unit authorization', citation: '21 CFR §111.105' },
    { pattern: /formulator\s+sign(ed|off|ature)/i,              finding: 'MMR signed only by formulator — needs independent QC sign-off', citation: '21 CFR §111.105' },
    { pattern: /supplier\s+CoA\s+(only|alone|without test)/i,   finding: 'Reliance on supplier CoA without in-house identity testing', citation: '21 CFR §111.75(a)(1)' },
  ];

  // Main analysis function
  function runLiveAnalysis(rawText, fileName, fileSize) {
    setDropzoneProcessing(false);
    state.lastReport = null; // regex analysis supersedes any prior AI report

    const docType = detectDocumentType(rawText);
    const productName = extractProductName(rawText) || fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    const violations = [];

    // --- 1. Disease claims ---
    const foundDiseaseClaims = [];
    DISEASE_PATTERNS.forEach(dp => {
      const sentences = extractSentencesWithPattern(rawText, dp.pattern);
      sentences.forEach(s => {
        if (!foundDiseaseClaims.find(x => x.text === s)) {
          foundDiseaseClaims.push({ text: s, term: dp.term });
        }
      });
    });
    if (foundDiseaseClaims.length > 0) {
      const preview = foundDiseaseClaims.slice(0, 3).map(c => `"${c.text.trim().substring(0, 80)}..."`).join('; ');
      const terms = [...new Set(foundDiseaseClaims.map(c => c.term))].join(', ');
      violations.push({
        severity: 'CRITICAL',
        pillar: 'labeling_compliance',
        finding: `${foundDiseaseClaims.length} prohibited disease/drug claim(s) detected: ${terms}`,
        citation: '21 USC §321(g)(1)(B); 21 CFR §310 (Unapproved New Drug)',
        remediation: `Remove or reframe all disease claims to structure/function language. Detected in: ${preview}`,
      });
    }

    // --- 2. Prohibited ingredients ---
    const foundProhibited = [];
    PROHIBITED_INGREDIENTS_LIST.forEach(ing => {
      if (new RegExp(`\\b${ing.name.replace(/[()]/g, '\\$&')}\\b`, 'i').test(rawText)) {
        foundProhibited.push(ing);
      }
    });
    // Also check for generic "Bhasma"
    if (/\bBhasma\b/i.test(rawText) && !foundProhibited.find(x => x.name.includes('Bhasma'))) {
      foundProhibited.push({ name: 'Bhasma (unspecified metallic ash)', type: 'PROHIBITED_METAL', risk: 'CRITICAL' });
    }
    if (foundProhibited.length > 0) {
      foundProhibited.forEach(ing => {
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
    }

    // --- 3. Heavy metals from CoA ---
    if (docType === 'coa') {
      const metals = extractHeavyMetals(rawText);
      const servingG = extractServingSizeGrams(rawText);

      const PROP65_MADL = { lead: 0.5, arsenic: 0.1, mercury: 0.3, cadmium: 4.1 };
      const metalNames = { lead: 'Lead (Pb)', arsenic: 'Arsenic (As)', mercury: 'Mercury (Hg)', cadmium: 'Cadmium (Cd)' };

      Object.keys(metals).forEach(key => {
        const ppm = metals[key];
        const dailyExposure = ppm * servingG;
        const madl = PROP65_MADL[key];
        const name = metalNames[key];

        if (dailyExposure > madl) {
          violations.push({
            severity: dailyExposure > madl * 3 ? 'CRITICAL' : 'HIGH',
            pillar: 'import_admissibility',
            finding: `${name} daily exposure of ${dailyExposure.toFixed(2)} mcg/day exceeds California Prop 65 MADL of ${madl} mcg/day`,
            calculation: `${ppm} ppm × ${servingG}g serving = ${dailyExposure.toFixed(2)} mcg/day. Prop 65 MADL = ${madl} mcg/day (exceeds by ${(dailyExposure / madl).toFixed(1)}×)`,
            citation: 'California OEHHA Proposition 65 (Safe Drinking Water and Toxic Enforcement Act); Health & Safety Code §25249.5',
            remediation: `Source raw material with ${name} below ${(madl / servingG).toFixed(2)} ppm, OR apply mandatory California Prop 65 warning label for all California sales.`,
          });
        }

        // USP <2232> check (5 ppm for lead)
        if (key === 'lead' && ppm > 5) {
          violations.push({
            severity: 'CRITICAL',
            pillar: 'ingredient_safety',
            finding: `${name} at ${ppm} ppm exceeds USP <2232> dietary supplement action level of 5 ppm`,
            citation: 'USP Chapter <2232> Elemental Contaminants in Dietary Supplements; 21 CFR §111.75',
            remediation: `Product will fail US dietary supplement quality standards. Must source raw material with Lead < 5 ppm for USP compliance, and < 0.5 ppm for Prop 65 California compliance.`,
          });
        }
      });

      // Check if CoA uses Indian API limits vs US limits
      if (/ayurvedic pharmacopoeia|API limit|schedule [A-Z]/i.test(rawText)) {
        violations.push({
          severity: 'LOW',
          pillar: 'manufacturing_compliance',
          finding: 'CoA references Indian Ayurvedic Pharmacopoeia (API) limits which are significantly less stringent than US FDA/USP standards',
          citation: '21 CFR §111.75; USP Chapter <2232>',
          remediation: 'Update QA laboratory release specifications to use USP <2232> elemental impurity thresholds. Indian API lead limit (10 ppm) is 2× higher than USP limit (5 ppm).',
        });
      }
    }

    // --- 4. DSHEA disclaimer check ---
    const hasDisclaimer = /not been evaluated by the food and drug|not intended to diagnose/i.test(rawText);
    if (!hasDisclaimer && (docType === 'label' || foundDiseaseClaims.length > 0)) {
      violations.push({
        severity: 'HIGH',
        pillar: 'labeling_compliance',
        finding: 'Missing mandatory DSHEA FDA disclaimer statement',
        citation: '21 CFR §101.93(b) — Mandatory disclaimer for structure/function claims',
        remediation: `Add the exact text: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease." Must appear adjacent to every structure/function claim.`,
      });
    }

    // --- 5. Supplement Facts panel check ---
    const hasSupplementFacts = /supplement\s+facts/i.test(rawText);
    const hasFSSAIPanel = /nutritional\s+information|%\s*rda|recommended\s+dietary\s+allow/i.test(rawText);
    const hasNutritionFacts = /nutrition\s+facts/i.test(rawText);
    if (!hasSupplementFacts && !hasNutritionFacts && docType === 'label') {
      violations.push({
        severity: 'HIGH',
        pillar: 'labeling_compliance',
        finding: hasFSSAIPanel
          ? 'FSSAI Nutritional Information panel detected — US "Supplement Facts" panel is missing'
          : 'No "Supplement Facts" or "Nutrition Facts" panel detected on label',
        citation: '21 CFR §101.36 (Supplement Facts); 21 CFR §101.9 (Nutrition Facts)',
        remediation: 'Redesign the label to include a US-compliant Supplement Facts panel with all active botanicals listed in metric amounts per serving. Recalculate all % Daily Values using US FDA reference amounts.',
      });
    }

    // --- 6. NDI check ---
    const foundNDI = NDI_LIKELY_INGREDIENTS.filter(ing =>
      new RegExp(`\\b${ing}\\b`, 'i').test(rawText)
    );
    if (foundNDI.length > 0) {
      violations.push({
        severity: 'CRITICAL',
        pillar: 'ingredient_safety',
        finding: `${foundNDI.length} potential New Dietary Ingredient(s) detected: ${foundNDI.join(', ')}`,
        citation: '21 CFR §190.6; FDCA §413(a)(2) — NDI Notification required 75 days before US market entry',
        remediation: `File NDI notifications with FDA Office of Dietary Supplement Programs (ODSP) for each ingredient not commercially marketed in the US before October 15, 1994. Each notification must include safety substantiation, history of use, and proposed conditions of use.`,
      });
    }

    // --- 7. TTB / alcohol check ---
    const foundFermented = FERMENTED_INDICATORS.filter(kw => new RegExp(kw, 'i').test(rawText));
    if (foundFermented.length > 0 || /\b\d+(\.\d+)?\s*%\s*(ABV|alcohol by volume)\b/i.test(rawText)) {
      violations.push({
        severity: 'CRITICAL',
        pillar: 'product_classification',
        finding: 'Fermented/alcoholic preparation detected (Asava/Arishta type). Products >0.5% ABV fall under TTB (Alcohol and Tobacco Tax and Trade Bureau) jurisdiction',
        citation: '27 CFR Part 1 (TTB Basic Permit Requirements); 27 CFR Part 24 (Wine regulations)',
        remediation: 'Apply for a TTB Basic Importer Permit before shipping. Product may also require Alcohol content declaration on label, government health warning per 27 CFR §16.21, and compliance with all 50 state alcohol distribution laws.',
      });
    }

    // --- 8. GMP gap indicators ---
    GMP_GAPS.forEach(gap => {
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

    // --- 9. "100% natural / no side effects" type misleading claims ---
    if (/no side effects guaranteed|zero side effects|100% safe|completely safe/i.test(rawText)) {
      violations.push({
        severity: 'HIGH',
        pillar: 'labeling_compliance',
        finding: 'Absolute safety claim detected ("no side effects guaranteed" or "100% safe") — FTC considers these deceptive',
        citation: 'FTC Act Section 5 (Deceptive Claims); 21 CFR §101.56',
        remediation: 'Remove absolute safety claims. Replace with: "Consult your healthcare provider before use. Not intended for pregnant or nursing women."',
      });
    }

    // --- 10. FDA facility registration ---
    if (!/FDA\s+registr|FSSAI\s+licens|cGMP\s+certified|WHO.GMP|21\s+CFR\s+Part\s+1(?:11|17)/i.test(rawText)) {
      if (docType !== 'coa') {
        violations.push({
          severity: 'MEDIUM',
          pillar: 'manufacturing_compliance',
          finding: 'No FDA facility registration number or cGMP compliance certificate referenced in document',
          citation: '21 CFR Part 1, Subpart H (Facility Registration); FSMA Foreign Supplier Verification Program',
          remediation: 'Register manufacturing facility with FDA prior to export (free registration at FDA.gov/food/registration-food-facilities). Include FDA registration number (FEI) on all export documentation.',
        });
      }
    }

    // Build the live doc object matching mock doc structure
    const liveDoc = buildLiveDocObject(rawText, fileName, productName, docType, violations);
    state.selectedDocument = liveDoc;

    // Update dashboard product name
    if (DOM.dashboardProductName) DOM.dashboardProductName.textContent = productName;

    // Update scores & remediation on dashboard
    const scoreReport = calculateFDAReadinessScore(violations);
    updateDashboardScores(scoreReport, violations);

    // Show parsed document analysis
    DOM.parsingDocName.textContent = fileName;
    DOM.parsingDocType.textContent = docTypeLabel(docType);
    DOM.parsingDocSize.textContent = `LIVE-${Date.now().toString().slice(-6)}`;

    // Reset tabs and render
    DOM.docTabButtons.forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
    DOM.docTabButtons[0].classList.remove('btn-secondary');
    DOM.docTabButtons[0].classList.add('btn-primary');
    state.activeDocTab = 'raw';

    renderLiveDocTabs(liveDoc, rawText);

    // Update drop zone UI to show success
    setDropzoneState('success', '✅', `Analysis Complete: ${productName}`,
      `${violations.length} compliance gap(s) found. Check the Dashboard for the full FRS score and remediation plan.`);

    // Auto-populate classification gate
    if (liveDoc.extractedData.claimsRaw) {
      DOM.classInputClaims.value = liveDoc.extractedData.claimsRaw.substring(0, 500);
    }
    if (liveDoc.extractedData.ingredientsRaw) {
      DOM.classInputIngredients.value = liveDoc.extractedData.ingredientsRaw.substring(0, 300);
    }
    DOM.classInputName.value = productName;

    // Switch to dashboard to show results
    switchView('dashboard');
  }

  function buildLiveDocObject(rawText, fileName, productName, docType, violations) {
    const ingredientsRaw = extractIngredientsRaw(rawText);
    const claimsRaw = extractClaimsRaw(rawText);
    const metals = docType === 'coa' ? extractHeavyMetals(rawText) : {};
    const servingSize = extractServingSizeText(rawText) || 'Not specified';

    // Build extractedData
    let extractedData = {
      rawTextPreview: rawText.substring(0, 2000),
      ingredientsRaw,
      claimsRaw,
      fdaDisclaimerPresent: /not been evaluated by the food and drug/i.test(rawText),
      supplementFactsPresent: /supplement\s+facts/i.test(rawText),
    };

    if (docType === 'coa') {
      extractedData.issuingLab = extractLab(rawText) || 'Unknown Lab';
      extractedData.reportNumber = extractReportNumber(rawText) || 'Not found';
      extractedData.batchLotNumber = extractBatchNumber(rawText) || 'Not found';
      extractedData.manufactureDate = extractDate(rawText, 'manufacture') || 'Not found';
      extractedData.expiryDate = extractDate(rawText, 'expiry') || 'Not found';
      // Build parameters table from extracted metals
      extractedData.parameters = {};
      const metalFullNames = { lead: 'Lead (Pb)', arsenic: 'Arsenic (As)', mercury: 'Mercury (Hg)', cadmium: 'Cadmium (Cd)' };
      const usLimits = { lead: 'Max 5 ppm (USP)', arsenic: 'Max 1.5 ppm (USP)', mercury: 'Max 1 ppm (USP)', cadmium: 'Max 0.3 ppm (USP)' };
      Object.keys(metals).forEach(k => {
        extractedData.parameters[k] = {
          name: metalFullNames[k] || k,
          result: `${metals[k]} ppm`,
          specLimit: usLimits[k] || 'See USP <2232>',
          status: metals[k] > 5 ? 'FAIL' : 'PASS'
        };
      });
    }

    return {
      id: `LIVE-${Date.now()}`,
      fileName,
      documentType: docTypeLabel(docType),
      productName,
      servingSize,
      isLive: true,
      extractedData,
      gapAnalysis: { violations }
    };
  }

  function docTypeLabel(docType) {
    return { label: 'Label / Packaging Scan', coa: 'Certificate of Analysis (CoA)', mmr: 'Master Manufacturing Record (MMR)' }[docType] || 'Regulatory Document';
  }

  function renderLiveDocTabs(liveDoc, rawText) {
    [DOM.docTabContentRaw, DOM.docTabContentSchema, DOM.docTabContentGaps].forEach(p => p.style.display = 'none');
    DOM.docTabContentRaw.style.display = 'block';

    DOM.docTabContentRaw.innerHTML = '';
    const block = document.createElement('div');
    block.style.cssText = 'display:flex;flex-direction:column;gap:1rem';

    // Live analysis banner
    const banner = `<div class="live-result-banner">
      <span>🔬</span>
      <span>Live Document Analysis — ${liveDoc.documentType} — ${liveDoc.gapAnalysis.violations.length} compliance gap(s) found</span>
      <span class="confidence-chip">LIVE</span>
    </div>`;

    // Raw text preview with highlighted terms
    let highlightedText = rawText.substring(0, 3000);
    DISEASE_PATTERNS.forEach(dp => {
      highlightedText = highlightedText.replace(dp.pattern, match =>
        `<span class="highlight-error" title="Prohibited claim keyword: ${dp.term}">${match}</span>`
      );
    });
    PROHIBITED_INGREDIENTS_LIST.forEach(ing => {
      const re = new RegExp(`\\b${ing.name.replace(/[()]/g, '\\$&')}\\b`, 'gi');
      highlightedText = highlightedText.replace(re, match =>
        `<span class="highlight-error" title="Prohibited ingredient">${match}</span>`
      );
    });

    block.innerHTML = `
      ${banner}
      <h3>Extracted Document Content</h3>
      <p style="font-size:var(--fs-xs);color:var(--text-muted)">Red highlights = prohibited claims or ingredients. Green highlights = compliant terms. Showing first 3,000 characters.</p>
      <div style="background:light-dark(rgba(0,0,0,0.02),rgba(0,0,0,0.3));padding:1rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);font-size:var(--fs-xs);font-family:monospace;line-height:1.7;white-space:pre-wrap;overflow-x:auto;max-height:400px;overflow-y:auto">${highlightedText}${rawText.length > 3000 ? '\n\n... [' + (rawText.length - 3000) + ' more characters]' : ''}</div>
      ${liveDoc.extractedData.fdaDisclaimerPresent
        ? `<p style="color:var(--clr-success-50);font-size:var(--fs-xs)">✅ DSHEA FDA Disclaimer detected in document</p>`
        : `<p style="color:var(--clr-danger-50);font-size:var(--fs-xs)">❌ DSHEA FDA Disclaimer NOT detected — required adjacent to any health claims</p>`}
    `;
    DOM.docTabContentRaw.appendChild(block);

    // Schema tab
    DOM.docTabContentSchema.innerHTML = `<pre style="font-size:var(--fs-xs);line-height:1.4;color:var(--text-muted);overflow-x:auto;white-space:pre-wrap">${JSON.stringify(liveDoc.extractedData, null, 2)}</pre>`;

    // Gaps tab
    DOM.docTabContentGaps.innerHTML = '';
    if (liveDoc.gapAnalysis.violations.length === 0) {
      DOM.docTabContentGaps.innerHTML = `<div class="badge badge-ready">✅ No compliance gaps detected.</div>`;
    } else {
      liveDoc.gapAnalysis.violations.forEach(v => {
        const card = document.createElement('div');
        card.className = `remediation-card ${v.severity.toLowerCase()}`;
        card.innerHTML = `
          <div class="remediation-icon">⚠️</div>
          <div class="remediation-details">
            <div class="remediation-title"><span class="badge badge-${v.severity.toLowerCase()}">${v.severity}</span> ${v.finding}</div>
            <div class="remediation-text">${v.remediation}</div>
            <div class="remediation-meta"><span class="remediation-citation">${v.citation}</span></div>
          </div>`;
        DOM.docTabContentGaps.appendChild(card);
      });
    }

    // Wire up tab buttons for live doc
    DOM.docTabButtons.forEach(btn => {
      btn.onclick = () => {
        DOM.docTabButtons.forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
        btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
        const tab = btn.getAttribute('data-tab');
        DOM.docTabContentRaw.style.display = tab === 'raw' ? 'block' : 'none';
        DOM.docTabContentSchema.style.display = tab === 'schema' ? 'block' : 'none';
        DOM.docTabContentGaps.style.display = tab === 'gaps' ? 'block' : 'none';
      };
    });
  }

  // ==========================================================================
  // 13. TEXT EXTRACTION HELPERS
  // ==========================================================================
  function detectDocumentType(text) {
    const t = text.toLowerCase();
    if (/certificate of analysis|coa|analytical report|lab report|test report/.test(t) ||
        (/\bppm\b|mg\/kg/.test(t) && /lead|arsenic|mercury/.test(t))) return 'coa';
    if (/master (manufacturing|formula|batch)|batch record|mmr|mmf|bill of material|bill of ingredients/.test(t)) return 'mmr';
    return 'label';
  }

  function extractProductName(text) {
    const patterns = [
      /product\s+name[:\s]+([^\n\r.]{3,60})/i,
      /name\s+of\s+product[:\s]+([^\n\r.]{3,60})/i,
      /product[:\s]+([A-Z][^\n\r.]{2,50})/,
      /^([A-Z][A-Za-z\s&-]{3,50}(?:capsule|tablet|powder|extract|syrup|tonic|churna|oil|cream))/im,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[1]) return m[1].trim().replace(/\s+/g, ' ');
    }
    return null;
  }

  function extractIngredientsRaw(text) {
    const m = text.match(/ingredients?[:\s]+([^\n\r]{10,400})/i) ||
               text.match(/composition[:\s]+([^\n\r]{10,400})/i) ||
               text.match(/contains?[:\s]+([^\n\r]{10,400})/i);
    return m ? m[1].trim() : '';
  }

  function extractClaimsRaw(text) {
    // Grab text that looks like marketing claims (sentences with action verbs)
    const sentences = text.match(/[^.!?\n]{20,200}[.!?]/g) || [];
    const claimLike = sentences.filter(s =>
      /helps?|supports?|promotes?|boost|enhanc|improv|reliev|cure|treat|prevent|reduces?|protects?|strengthen/i.test(s)
    );
    return claimLike.slice(0, 5).join(' ');
  }

  function extractSentencesWithPattern(text, pattern) {
    const sentences = text.match(/[^.!?\n]{10,250}[.!?]/g) || [];
    return sentences.filter(s => pattern.test(s)).map(s => s.trim()).slice(0, 3);
  }

  function extractHeavyMetals(text) {
    const metals = {};
    const patterns = [
      { key: 'lead',    re: /lead\s*(?:\(pb\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
      { key: 'arsenic', re: /arsenic\s*(?:\(as\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
      { key: 'mercury', re: /mercury\s*(?:\(hg\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
      { key: 'cadmium', re: /cadmium\s*(?:\(cd\))?\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(?:ppm|mg\/kg)/gi },
    ];
    patterns.forEach(({ key, re }) => {
      let match;
      while ((match = re.exec(text)) !== null) {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) metals[key] = val;
      }
    });
    return metals;
  }

  function extractServingSizeGrams(text) {
    const m = text.match(/serving\s+size[:\s]+([0-9]+\.?[0-9]*)\s*(g|gram|mg)/i) ||
               text.match(/daily\s+(?:dose|serving)[:\s]+([0-9]+\.?[0-9]*)\s*(g|gram|mg)/i);
    if (m) {
      const val = parseFloat(m[1]);
      const unit = m[2].toLowerCase();
      return unit === 'mg' ? val / 1000 : val;
    }
    return 1.0; // default 1g serving
  }

  function extractServingSizeText(text) {
    const m = text.match(/serving\s+size[:\s]+([^\n\r.]{2,30})/i);
    return m ? m[1].trim() : null;
  }

  function extractLab(text) {
    const m = text.match(/(?:testing\s+lab(?:oratory)?|accredited\s+lab|issued\s+by|laboratory)[:\s]+([^\n\r.]{5,60})/i);
    return m ? m[1].trim() : null;
  }

  function extractReportNumber(text) {
    const m = text.match(/report\s+(?:no\.?|number)[:\s]+([A-Z0-9\-/]+)/i);
    return m ? m[1].trim() : null;
  }

  function extractBatchNumber(text) {
    const m = text.match(/(?:batch|lot)\s+(?:no\.?|number)[:\s]+([A-Z0-9\-/]+)/i);
    return m ? m[1].trim() : null;
  }

  function extractDate(text, type) {
    const patterns = type === 'manufacture'
      ? [/mfg\.?\s+date[:\s]+([^\n\r.]{5,20})/i, /manufacture\s+date[:\s]+([^\n\r.]{5,20})/i, /date\s+of\s+manufacture[:\s]+([^\n\r.]{5,20})/i]
      : [/exp(?:iry)?\s+date[:\s]+([^\n\r.]{5,20})/i, /best\s+before[:\s]+([^\n\r.]{5,20})/i, /use\s+by[:\s]+([^\n\r.]{5,20})/i];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return m[1].trim();
    }
    return null;
  }

  // ==========================================================================
  // 14. FRS SCORE ENGINE
  // ==========================================================================
  // Demo / offline docs may still compute locally. AI / pipeline reports MUST
  // prefer server `_meta` (readinessScore / band / pipelineReady) — client math
  // is not pipeline truth (Task T3 / Audit #6).
  const PILLAR_WEIGHTS = {
    product_classification: 0.15,
    labeling_compliance: 0.25,
    ingredient_safety: 0.25,
    manufacturing_compliance: 0.20,
    import_admissibility: 0.15
  };
  const SEVERITY_DEDUCTIONS = { CRITICAL: 1.00, HIGH: 0.60, MEDIUM: 0.30, LOW: 0.10 };
  const BAND_COLORS = {
    EXPORT_READY: 'var(--clr-success-50)',
    CONDITIONAL_READY: 'var(--clr-warning-50)',
    SIGNIFICANT_REMEDIATION: 'orange',
    NOT_EXPORT_READY: 'var(--clr-danger-50)',
  };

  /** Prefer server `_meta` readiness; fall back to local calc for demo theater only. */
  function scoreReportFromMetaOrLocal(violations, meta) {
    if (meta && typeof meta.readinessScore === 'number' && meta.band) {
      return {
        score: meta.readinessScore,
        band: {
          key: meta.band,
          label: meta.bandLabel || meta.band,
          color: BAND_COLORS[meta.band] || 'var(--clr-warning-50)',
          desc: meta.bandDesc || '',
        },
        pillarScores: meta.pillarScores || {},
        fromServer: true,
        pipelineReady: meta.pipelineReady === true,
        exportAuthorized: meta.exportAuthorized === true,
        released: meta.released === true || meta.exportAuthorized === true,
        humanReviewRequired: meta.humanReviewRequired === true,
        humanReview: meta.humanReview || null,
        truncated: !!(meta.truncation && meta.truncation.truncated),
      };
    }
    const local = calculateFDAReadinessScore(violations);
    return { ...local, fromServer: false, pipelineReady: false };
  }

  function calculateFDAReadinessScore(violations) {
    const pillarScores = { product_classification: 100, labeling_compliance: 100, ingredient_safety: 100, manufacturing_compliance: 100, import_admissibility: 100 };
    violations.forEach(v => {
      const d = SEVERITY_DEDUCTIONS[v.severity] || 0;
      pillarScores[v.pillar] = Math.max(0, pillarScores[v.pillar] - 100 * d);
    });
    let totalScore = 0;
    Object.keys(PILLAR_WEIGHTS).forEach(p => { totalScore += pillarScores[p] * PILLAR_WEIGHTS[p]; });
    totalScore = Math.round(totalScore);
    let band;
    if (totalScore >= 85) band = { key: 'EXPORT_READY', label: "EXPORT READY", color: "var(--clr-success-50)", desc: "Minor documentation gaps only. Proceed with FDA registration." };
    else if (totalScore >= 65) band = { key: 'CONDITIONAL_READY', label: "CONDITIONAL READY", color: "var(--clr-warning-50)", desc: "Moderate gaps. Resolve HIGH items before shipping." };
    else if (totalScore >= 40) band = { key: 'SIGNIFICANT_REMEDIATION', label: "SIGNIFICANT REMEDIATION REQUIRED", color: "orange", desc: "Major labeling/ingredient/cGMP gaps. 3–6 month remediation timeline required." };
    else band = { key: 'NOT_EXPORT_READY', label: "NOT EXPORT READY", color: "var(--clr-danger-50)", desc: "Critical violations present. Extremely high risk of customs detention or seizure." };
    return { score: totalScore, band, pillarScores };
  }

  function pillarColor(score) {
    return score >= 70 ? "var(--clr-success-50)" : score >= 40 ? "var(--clr-warning-50)" : "var(--clr-danger-50)";
  }

  function updateDashboardScores(scoreReport, violations) {
    const radius = 60, circumference = 2 * Math.PI * radius;
    DOM.dashboardScoreCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    DOM.dashboardScoreCircle.style.stroke = scoreReport.band.color;
    DOM.dashboardScoreCircle.style.strokeDashoffset = circumference - (scoreReport.score / 100) * circumference;
    DOM.dashboardScoreNumber.textContent = scoreReport.score;
    DOM.dashboardScoreBand.textContent = scoreReport.band.label;
    DOM.dashboardScoreBand.style.color = scoreReport.band.color;
    DOM.dashboardScoreDesc.textContent = scoreReport.band.desc;

    const ps = scoreReport.pillarScores;
    [[DOM.dashboardPillarClassification, ps.product_classification],
     [DOM.dashboardPillarLabeling, ps.labeling_compliance],
     [DOM.dashboardPillarSafety, ps.ingredient_safety],
     [DOM.dashboardPillarGMP, ps.manufacturing_compliance],
     [DOM.dashboardPillarImport, ps.import_admissibility]
    ].forEach(([el, score]) => { el.textContent = `${score}/100`; el.style.color = pillarColor(score); });

    DOM.dashboardViolationsCount.textContent = violations.length;
    DOM.dashboardRemediationList.innerHTML = '';
    const sorted = [...violations].sort((a, b) => ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[b.severity] - { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[a.severity]));

    if (sorted.length === 0) {
      DOM.dashboardRemediationList.innerHTML = `<div class="glass-card" style="text-align:center;color:var(--clr-success-50)">✅ No compliance gaps detected. Product appears fully compliant.</div>`;
      return;
    }
    sorted.forEach(v => {
      const card = document.createElement('div');
      card.className = `remediation-card ${v.severity.toLowerCase()}`;
      const icon = { CRITICAL: '🛑', HIGH: '⚠️', MEDIUM: 'ℹ️', LOW: '💡' }[v.severity] || 'ℹ️';
      card.innerHTML = `
        <div class="remediation-icon">${icon}</div>
        <div class="remediation-details">
          <div class="remediation-title"><span class="badge badge-${v.severity.toLowerCase()}" style="margin-right:0.5rem">${v.severity}</span>${v.finding}</div>
          <div class="remediation-text">${v.remediation}</div>
          <div class="remediation-meta">
            <span class="remediation-citation">Regulation: ${v.citation}</span>
            ${v.calculation ? `<span class="remediation-calculation">${v.calculation}</span>` : ''}
          </div>
        </div>`;
      DOM.dashboardRemediationList.appendChild(card);
    });
  }

  // ==========================================================================
  // 15. MOCK DOCUMENT PARSER (unchanged flow for demo docs)
  // ==========================================================================
  function setupDocumentParserListeners() {
    DOM.docSelectors.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.docSelectors.forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
        btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
        loadMockDoc(btn.getAttribute('data-doc'), true);
      });
    });

    DOM.docTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.selectedDocument && state.selectedDocument.isLive) return; // live doc handles its own tabs
        DOM.docTabButtons.forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
        btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
        state.activeDocTab = btn.getAttribute('data-tab');
        renderDocTab();
      });
    });
  }

  function loadMockDoc(docType, triggerAnimation = true) {
    const docData = db.mockDocuments[docType];
    if (!docData) return;
    state.lastReport = null; // selecting a demo doc supersedes any prior AI report
    state.selectedDocument = { ...docData, isLive: false };

    if (docData.extractedData.ingredients) DOM.classInputIngredients.value = docData.extractedData.ingredients.map(i => i.name).join(', ');
    if (docData.productName) DOM.classInputName.value = docData.productName;
    if (docData.extractedData.claims && docData.extractedData.claims.length) DOM.classInputClaims.value = docData.extractedData.claims.join(' ');
    const dosageMap = { 'Paste / Jam': 'paste', 'Fermented Liquid (Arishta)': 'beverage' };
    if (docData.dosageForm && dosageMap[docData.dosageForm]) DOM.classInputDosage.value = dosageMap[docData.dosageForm];

    if (triggerAnimation) {
      state.ocrScanning = true;
      if (DOM.dropZone) DOM.dropZone.classList.add('scanning');
      DOM.parsingDetailsCard.style.opacity = '0.3';
      setTimeout(() => {
        state.ocrScanning = false;
        if (DOM.dropZone) DOM.dropZone.classList.remove('scanning');
        DOM.parsingDetailsCard.style.opacity = '1';
        displayDocumentAnalysis();
      }, 2000);
    } else {
      displayDocumentAnalysis();
    }
  }

  function displayDocumentAnalysis() {
    const doc = state.selectedDocument;
    if (!doc) return;
    DOM.parsingDocName.textContent = doc.fileName;
    DOM.parsingDocType.textContent = doc.documentType;
    DOM.parsingDocSize.textContent = doc.id;
    if (DOM.dashboardProductName) DOM.dashboardProductName.textContent = doc.productName;
    const scoreReport = calculateFDAReadinessScore(doc.gapAnalysis.violations);
    updateDashboardScores(scoreReport, doc.gapAnalysis.violations);
    renderDocTab();
  }

  function renderDocTab() {
    const doc = state.selectedDocument;
    if (!doc || doc.isLive) return;
    [DOM.docTabContentRaw, DOM.docTabContentSchema, DOM.docTabContentGaps].forEach(p => p.style.display = 'none');
    if (state.activeDocTab === 'raw') { DOM.docTabContentRaw.style.display = 'block'; renderRawText(doc); }
    else if (state.activeDocTab === 'schema') {
      DOM.docTabContentSchema.style.display = 'block';
      DOM.docTabContentSchema.innerHTML = `<pre style="font-size:var(--fs-xs);line-height:1.4;color:var(--text-muted);overflow-x:auto;white-space:pre-wrap">${JSON.stringify(doc.extractedData, null, 2)}</pre>`;
    } else if (state.activeDocTab === 'gaps') { DOM.docTabContentGaps.style.display = 'block'; renderGapAnalysis(doc); }
  }

  function renderRawText(doc) {
    DOM.docTabContentRaw.innerHTML = '';
    const block = document.createElement('div');
    block.style.cssText = 'display:flex;flex-direction:column;gap:1rem';

    if (doc.documentType.includes('Label')) {
      const claimsHtml = doc.extractedData.claims.map(c => {
        const isDisease = /cures|treats|prevents|immunity|infection|asthma|menstrual|debility/i.test(c);
        return `• "<span class="${isDisease ? 'highlight-error' : 'highlight-match'}">${c}</span>"`;
      }).join('<br>');
      block.innerHTML = `
        <h3>PDP Statement of Identity</h3>
        <p>Brand Name: <strong>${doc.extractedData.brandName || '—'}</strong></p>
        <p>Product: <strong>${doc.productName}</strong></p>
        <p>Dosage Form: <strong>${doc.dosageForm || '—'} (${doc.servingSize})</strong></p>
        <hr style="border:0;border-top:1px solid var(--border-color)">
        <h3>Ingredient Declaration</h3>
        <p>${doc.extractedData.ingredients.map(i => {
          const isBad = ['PROHIBITED_METAL','REQUIRES_TTB_PERMIT'].includes(i.fdaStatus);
          const isNdi = i.fdaStatus === 'NDI_REQUIRED';
          const style = isBad ? 'color:var(--clr-danger-50);font-weight:700' : isNdi ? 'color:var(--clr-warning-50)' : '';
          return `<span style="${style}">${i.name} (${i.amount}) — [${i.fdaStatus}]</span>`;
        }).join('<br>')}</p>
        <hr style="border:0;border-top:1px solid var(--border-color)">
        <h3>Extracted Claims</h3>
        <p style="line-height:2">${claimsHtml}</p>
        <p>DSHEA Disclaimer: <strong style="color:${doc.extractedData.fdaDisclaimerPresent ? 'var(--clr-success-50)' : 'var(--clr-danger-50)'}">${doc.extractedData.fdaDisclaimerPresent ? 'Present ✅' : 'MISSING ❌'}</strong></p>`;
    } else if (doc.documentType.includes('CoA')) {
      const tableRows = Object.values(doc.extractedData.parameters).map(p => {
        const isMetal = /Lead|Arsenic|Mercury|Cadmium/.test(p.name);
        return `<tr><td>${p.name}</td><td ${isMetal ? 'style="color:var(--clr-warning-50);font-weight:600"' : ''}>${p.result}</td><td>${p.specLimit}</td><td><span class="badge badge-ready">${p.status}</span></td></tr>`;
      }).join('');
      block.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:var(--fs-sm)"><span>Lab: <strong>${doc.extractedData.issuingLab}</strong></span><span>Report: <strong>${doc.extractedData.reportNumber}</strong></span></div>
        <p>Lot: <strong>${doc.extractedData.batchLotNumber}</strong> | Mfg: <strong>${doc.extractedData.manufactureDate}</strong> | Exp: <strong>${doc.extractedData.expiryDate}</strong></p>
        <div class="table-container" style="margin-top:1rem"><table class="custom-table"><thead><tr><th>Parameter</th><th>Result</th><th>Spec Limit</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
    } else if (doc.documentType.includes('Master')) {
      block.innerHTML = `
        <p>Formula Version: <strong>${doc.extractedData.formulaHeader.version}</strong> | Effective: <strong>${doc.extractedData.formulaHeader.effectiveDate}</strong></p>
        <p>Formulator: <strong>${doc.extractedData.formulaHeader.formulatorSignature}</strong></p>
        <div class="table-container" style="margin-top:1rem"><table class="custom-table"><thead><tr><th>Ingredient</th><th>Concentration</th><th>Role</th></tr></thead><tbody>${doc.extractedData.ingredients.map(i => `<tr><td><strong>${i.name}</strong></td><td>${i.percentage}</td><td>${i.role}</td></tr>`).join('')}</tbody></table></div>`;
    }
    DOM.docTabContentRaw.appendChild(block);
  }

  function renderGapAnalysis(doc) {
    DOM.docTabContentGaps.innerHTML = '';
    if (doc.gapAnalysis.violations.length === 0) {
      DOM.docTabContentGaps.innerHTML = `<div class="badge badge-ready">✅ No gaps found.</div>`; return;
    }
    doc.gapAnalysis.violations.forEach(v => {
      const card = document.createElement('div');
      card.className = `remediation-card ${v.severity.toLowerCase()}`;
      card.innerHTML = `<div class="remediation-icon">⚠️</div><div class="remediation-details"><div class="remediation-title"><span class="badge badge-${v.severity.toLowerCase()}">${v.severity}</span> ${v.finding}</div><div class="remediation-text">${v.remediation}</div><div class="remediation-meta"><span class="remediation-citation">${v.citation}</span></div></div>`;
      DOM.docTabContentGaps.appendChild(card);
    });
  }

  // ==========================================================================
  // 16. PRODUCT CLASSIFICATION ENGINE
  // ==========================================================================
  function setupClassificationListeners() {
    DOM.classBtnRun.addEventListener('click', runClassificationGate);
  }

  function clearFieldErrors() {
    [DOM.errClassName, DOM.errClassIngredients, DOM.errClassClaims].forEach(el => { if (el) el.textContent = ''; });
    [DOM.classInputName, DOM.classInputIngredients, DOM.classInputClaims].forEach(el => el.classList.remove('input-error'));
  }

  function runClassificationGate() {
    clearFieldErrors();
    const name = DOM.classInputName.value.trim();
    const ingredientsText = DOM.classInputIngredients.value.trim();
    const claimsText = DOM.classInputClaims.value.trim();
    const dosageForm = DOM.classInputDosage.value;
    let hasError = false;
    if (!name) { DOM.errClassName.textContent = 'Product name is required.'; DOM.classInputName.classList.add('input-error'); hasError = true; }
    if (!ingredientsText) { DOM.errClassIngredients.textContent = 'At least one ingredient is required.'; DOM.classInputIngredients.classList.add('input-error'); hasError = true; }
    if (!claimsText) { DOM.errClassClaims.textContent = 'Please enter at least one marketing claim.'; DOM.classInputClaims.classList.add('input-error'); hasError = true; }
    if (hasError) return;

    DOM.classBtnText.style.display = 'none';
    DOM.classBtnSpinner.style.display = 'inline-block';
    DOM.classBtnRun.disabled = true;
    setTimeout(() => {
      DOM.classBtnText.style.display = 'inline';
      DOM.classBtnSpinner.style.display = 'none';
      DOM.classBtnRun.disabled = false;
      executeClassification(ingredientsText, claimsText, dosageForm);
    }, 600);
  }

  function executeClassification(ingredientsText, claimsText, dosageForm) {
    const ingredientsList = ingredientsText.split(',').map(i => i.trim());
    let classification = "DIETARY SUPPLEMENT", citation = "21 CFR §101.36 (DSHEA 1994)",
      desc = "Product eligibility matches US Dietary Supplement definitions. Only structure/function health assertions are permitted.",
      law = "DSHEA Act 1994 / 21 CFR §101.36", badgeClass = "badge-ready";
    let step1 = "✅ Permissible (No disease names detected)", step2 = "✅ Clear (All ingredients appear eligible)",
      step3 = "✅ Approved (Dosage form matches dietary supplement)", step4 = "✅ Checked (No Ayurvedic override triggers)";

    const prohibited = ["cure", "cures", "treat", "treats", "prevent", "prevents", "diabetes", "arthritis", "cancer", "cholesterol", "asthma", "infection", "depression", "hypothyroidism", "infertility", "hypertension", "laxation", "laxative", "detoxif"];
    if (prohibited.some(term => new RegExp(`\\b${term}\\b`, 'i').test(claimsText))) {
      classification = "UNAPPROVED NEW DRUG"; law = "21 USC §321(g)(1)(B), 21 CFR §310";
      citation = "FDCA §201(g)(1)(B)"; badgeClass = "badge-critical";
      desc = "Product makes explicit disease statements. Without an approved NDA, this is an unapproved new drug subject to immediate import seizure.";
      step1 = "❌ FAILED (Contains unapproved disease/drug claims)";
    }

    const forbidden = ["Swarna Bhasma", "Abhraka Bhasma", "Tamra Bhasma", "Naga Bhasma", "Lead", "Mercury", "Ephedra", "Aristolochia"];
    const detected = forbidden.filter(f => ingredientsList.some(i => i.toLowerCase().includes(f.toLowerCase())));
    if (detected.length > 0) {
      classification = "UNAPPROVED NEW DRUG"; law = "FDCA §402(a)(1)"; citation = "FDA Import Alert 54-15"; badgeClass = "badge-critical";
      desc = `Contains prohibited material(s): ${[...new Set(detected)].join(', ')}. Triggers DWPE at US ports.`;
      step2 = `❌ FAILED (Prohibited ingredient(s): ${[...new Set(detected)].join(', ')})`;
    }

    if (["beverage", "food_bar"].includes(dosageForm) && classification === "DIETARY SUPPLEMENT") {
      classification = "CONVENTIONAL FOOD"; law = "21 CFR Part 101"; citation = "21 CFR §101 (Nutrition Facts)"; badgeClass = "badge-high";
      desc = "Beverage/bar dosage form requires Nutrition Facts (not Supplement Facts) panel. Structure/function claims are invalid.";
      step3 = "⚠️ OVERRULED (Conventional food dosage form — Nutrition Facts panel required)";
    }

    if (/bhasma/i.test(ingredientsText)) step4 = "❌ FAILED (Metallic Bhasma — prohibited under FDCA §402)";
    else if (/asava|arishta/i.test(ingredientsText)) step4 = "⚠️ WARNING (Fermented liquid — TTB alcohol permit required)";
    else if (/shilajit/i.test(ingredientsText)) step4 = "⚠️ WARNING (Shilajit — NDI notification required 75 days before US launch)";

    DOM.classResultBadge.textContent = classification; DOM.classResultBadge.className = `badge ${badgeClass}`;
    DOM.classResultTitle.textContent = classification; DOM.classResultLaw.textContent = `Governing Law: ${law}`;
    DOM.classResultDesc.textContent = desc;
    DOM.classResultTreeStep1.innerHTML = `Gate 1 — Intended Use Claim Extraction: <strong>${step1}</strong>`;
    DOM.classResultTreeStep2.innerHTML = `Gate 2 — Ingredient Status Lookup: <strong>${step2}</strong>`;
    DOM.classResultTreeStep3.innerHTML = `Gate 3 — Dosage Form Validation: <strong>${step3}</strong>`;
    DOM.classResultTreeStep4.innerHTML = `Gate 4 — Ayurvedic Specific Override Rules: <strong>${step4}</strong>`;
  }

  // ==========================================================================
  // 17. CLAIM TRANSLATOR & RDA CONVERTER
  // ==========================================================================
  function setupTranslationListeners() {
    DOM.transBtnRun.addEventListener('click', runClaimTranslator);
    DOM.transUnitBtn.addEventListener('click', recalculateRDA);
  }

  function runClaimTranslator() {
    const claims = DOM.transClaimsInput.value.trim();
    if (!claims) { alert("Please enter a claim statement."); return; }
    DOM.transResultsContainer.innerHTML = '';
    let matchFound = false;

    db.claimsDatabase.forEach(item => {
      const hits = item.detectedEntities.filter(ent => claims.toLowerCase().includes(ent.toLowerCase())).length;
      if (hits > 0) {
        matchFound = true;
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.borderLeft = item.riskLevel === 'CRITICAL' ? '4px solid var(--clr-danger-50)' : '4px solid var(--clr-warning-50)';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <strong style="color:var(--clr-danger-50)">${item.classification.replace(/_/g, ' ')}</strong>
            <span class="badge badge-${item.riskLevel.toLowerCase()}">${item.riskLevel} RISK</span>
          </div>
          <p style="font-size:var(--fs-sm);margin-bottom:0.5rem">Detected: <em>"${claims}"</em></p>
          <p style="font-size:var(--fs-sm);color:var(--text);margin-bottom:0.75rem"><strong>FDA Reason:</strong> ${item.reason}</p>
          <div style="background:rgba(20,184,166,0.08);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid rgba(20,184,166,0.2);margin-bottom:0.5rem">
            <span style="color:var(--accent);font-weight:700;font-size:var(--fs-xs);text-transform:uppercase;display:block">FDA-Permissible Reframe:</span>
            <strong style="color:var(--text);font-size:var(--fs-sm)">"${item.suggestedReframing}"</strong>
          </div>
          <span style="font-size:var(--fs-xs);color:var(--text-muted)">Citation: ${item.citation}</span>`;
        DOM.transResultsContainer.appendChild(card);
      }
    });

    if (!matchFound) {
      let rewritten = claims, flagged = false;
      const reframings = [
        { regex: /cure[sd]?|treat[sd]?/i, replace: "supports the natural maintenance of" },
        { regex: /prevent[sd]?/i, replace: "helps maintain healthy" },
        { regex: /immunity/i, replace: "immune function" },
        { regex: /cough|cold|asthma/i, replace: "respiratory wellness" },
        { regex: /joint pain|arthritis/i, replace: "joint mobility and comfort" },
        { regex: /detox(ifie[sd])?/i, replace: "supports natural cleansing of" },
        { regex: /laxati(ve|on)/i, replace: "supports digestive comfort and regularity" },
        { regex: /bowel clean|colon clean/i, replace: "supports healthy digestive elimination" },
        { regex: /cancer/i, replace: "cellular health" },
        { regex: /depression|anxiety/i, replace: "everyday mental well-being" },
      ];
      reframings.forEach(rf => { if (rf.regex.test(claims)) { rewritten = rewritten.replace(rf.regex, rf.replace); flagged = true; } });
      const card = document.createElement('div');
      card.className = 'glass-card';
      card.style.borderLeft = flagged ? '4px solid var(--clr-warning-50)' : '4px solid var(--clr-success-50)';
      if (flagged) {
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem"><strong style="color:var(--clr-warning-50)">PROHIBITED BIOMARKER INTERVENTION (AUTO-DETECTED)</strong><span class="badge badge-high">HIGH RISK</span></div>
          <p style="font-size:var(--fs-sm);margin-bottom:0.5rem">Detected: <em>"${claims}"</em></p>
          <div style="background:rgba(20,184,166,0.08);padding:0.75rem;border-radius:var(--radius-sm);border:1px solid rgba(20,184,166,0.2);margin-bottom:0.5rem">
            <span style="color:var(--accent);font-weight:700;font-size:var(--fs-xs);text-transform:uppercase;display:block">Dynamic Reframe:</span>
            <strong style="color:var(--text);font-size:var(--fs-sm)">"${rewritten}"</strong>
          </div>
          <span style="font-size:var(--fs-xs);color:var(--text-muted)">Citation: 21 CFR §101.93 Structure/Function safe harbors.</span>`;
      } else {
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem"><strong style="color:var(--clr-success-50)">PERMISSIBLE GENERAL WELLNESS CLAIM</strong><span class="badge badge-ready">LOW RISK</span></div>
          <p style="font-size:var(--fs-sm)">Verified: <em>"${claims}"</em></p>
          <p style="font-size:var(--fs-sm);color:var(--text-muted)">No prohibited keywords detected. Eligible as FDA structure/function claim provided it is substantiated and paired with a DSHEA disclaimer.</p>`;
      }
      DOM.transResultsContainer.appendChild(card);
    }
  }

  const US_DAILY_VALUES = {
    vitamin_c:   { name: "Vitamin C",   dv: 90,    unit: "mg",  note: "21 CFR §101.9(c)(8)(iv)" },
    vitamin_d:   { name: "Vitamin D",   dv: 20,    unit: "mcg", note: "21 CFR §101.9(c)(8)(iv) — 20mcg = 800 IU" },
    calcium:     { name: "Calcium",     dv: 1300,  unit: "mg",  note: "21 CFR §101.9(c)(8)(iv)" },
    zinc:        { name: "Zinc",        dv: 11,    unit: "mg",  note: "21 CFR §101.9(c)(8)(iv)" },
    iron:        { name: "Iron",        dv: 18,    unit: "mg",  note: "21 CFR §101.9(c)(8)(iv)" },
    vitamin_b12: { name: "Vitamin B12", dv: 2.4,   unit: "mcg", note: "21 CFR §101.9(c)(8)(iv)" },
  };

  function recalculateRDA() {
    const inputRda = parseFloat(DOM.transUnitRdaInput.value);
    const amount = parseFloat(DOM.transUnitAmtInput.value);
    const key = DOM.transUnitLabel.value;
    if (isNaN(inputRda) || isNaN(amount) || amount <= 0) {
      DOM.transUnitOutput.innerHTML = `<p style="color:var(--clr-danger-50);font-size:var(--fs-sm)">Please enter valid positive numbers.</p>`; return;
    }
    const dv = US_DAILY_VALUES[key];
    if (!dv) return;
    const usDvPercent = Math.round((amount / dv.dv) * 100);
    const diff = Math.abs(usDvPercent - inputRda);
    DOM.transUnitOutput.innerHTML = `
      <div style="background:light-dark(rgba(0,0,0,0.02),rgba(255,255,255,0.02));padding:1.25rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);font-size:var(--fs-sm);display:flex;flex-direction:column;gap:0.5rem">
        <p><strong>${dv.name}</strong> — US FDA DV baseline: <strong>${dv.dv} ${dv.unit}</strong></p>
        <p>Amount: <strong>${amount} ${dv.unit}</strong> | Indian FSSAI RDA declared: <strong>${inputRda}%</strong></p>
        <hr style="border:0;border-top:1px solid var(--border-color)">
        <p style="color:var(--accent);font-weight:700;font-size:var(--fs-md)">Recalculated US FDA % Daily Value: <strong>${usDvPercent}%</strong></p>
        <p style="font-size:var(--fs-xs);color:var(--text-muted)">${dv.note}. Must be declared on Supplement Facts panel.</p>
        ${diff > 10 ? `<p style="color:var(--clr-warning-50);font-size:var(--fs-xs)">⚠️ Significant gap: FSSAI RDA (${inputRda}%) vs US DV (${usDvPercent}%). Current label value cannot be used as-is on US packaging.</p>`
                    : `<p style="color:var(--clr-success-50);font-size:var(--fs-xs)">✅ Minor difference. US DV figure must still replace FSSAI RDA on the Supplement Facts panel.</p>`}
      </div>`;
  }

  // ==========================================================================
  // 18. CROSSWALK VIEW
  // ==========================================================================
  function setupCrosswalkListeners() {
    document.querySelectorAll('.crosswalk-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.crosswalk-filter-btn').forEach(b => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');
        renderCrosswalkView(btn.getAttribute('data-filter'));
      });
    });
  }

  function renderCrosswalkView(filter = 'all') {
    if (!DOM.crosswalkTableContainer) return;
    const items = db.terminologyCrosswalk.filter(item => filter === 'all' || item.riskLevel.toUpperCase().includes(filter.toUpperCase()));
    if (items.length === 0) { DOM.crosswalkTableContainer.innerHTML = `<p style="color:var(--text-muted)">No entries match this filter.</p>`; return; }
    const riskBadge = r => r.includes('CRITICAL') ? 'badge-critical' : r.includes('HIGH') ? 'badge-high' : r.includes('MODERATE') ? 'badge-moderate' : 'badge-ready';
    const riskCard = r => r.includes('CRITICAL') ? 'risk-critical' : r.includes('HIGH') ? 'risk-high' : r.includes('MODERATE') ? 'risk-moderate' : 'risk-low';
    DOM.crosswalkTableContainer.innerHTML = `<div class="crosswalk-grid">${items.map(item => `
      <div class="crosswalk-card ${riskCard(item.riskLevel)}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.75rem">
          <h4 style="color:var(--text);font-size:var(--fs-sm)">${item.indianTerm}</h4>
          <span class="badge ${riskBadge(item.riskLevel)}" style="flex-shrink:0">${item.riskLevel}</span>
        </div>
        <p style="font-size:var(--fs-xs);margin-bottom:0.5rem"><strong style="color:var(--text-muted)">Indian Context:</strong> ${item.indianContext}</p>
        <p style="font-size:var(--fs-xs);margin-bottom:0.5rem"><strong style="color:var(--accent)">US FDA Equivalent:</strong> ${item.fdaEquivalent}</p>
        <p style="font-size:var(--fs-xs);margin-bottom:0.5rem"><strong style="color:var(--text-muted)">Governing Law:</strong> ${item.governingLaw}</p>
        <p style="font-size:var(--fs-xs);color:var(--text-muted);line-height:1.5">${item.notes}</p>
        <div class="risk-bar"></div>
      </div>`).join('')}</div>`;
  }

  // ==========================================================================
  // 19. EU & GULF MARKETS VIEW
  // ==========================================================================
  const MARKET_META = {
    US:   { icon: '🇺🇸', label: 'United States (FDA)' },
    EU:   { icon: '🇪🇺', label: 'European Union (EFSA / DG SANTE)' },
    UK:   { icon: '🇬🇧', label: 'United Kingdom — GB (MHRA / FSA)' },
    GULF: { icon: '🕌', label: 'Gulf / Oman (GSO / Oman MoH)' },
    NZ:   { icon: '🇳🇿', label: 'New Zealand (FSANZ / Medsafe)' },
  };
  const INDIA_CHECKLIST_RE = /India Export Requirements/i;

  // Return the framework cards for one destination market.
  function marketRegsFor(key) {
    const eg = db.euGulfRegulations || { eu: [], gulf: [] };
    const gulfNoIndia = (eg.gulf || []).filter(c => !INDIA_CHECKLIST_RE.test(c.framework));
    return ({
      US: db.usRegulations || [],
      EU: eg.eu || [],
      UK: db.ukRegulations || [],
      GULF: gulfNoIndia,
      NZ: db.nzRegulations || [],
    })[key] || [];
  }

  function regCardHTML(item) {
    const riskBadge = r => ({ CRITICAL: 'badge-critical', HIGH: 'badge-high', MODERATE: 'badge-moderate' }[r] || 'badge-ready');
    return `
      <div class="market-reg-card">
        <div class="reg-header">
          <div><h4 style="color:var(--text);margin-bottom:0.25rem">${item.framework}</h4><span style="font-size:var(--fs-xs);color:var(--text-muted)">${item.regulation}</span></div>
          <span class="badge ${riskBadge(item.riskLevel)}" style="flex-shrink:0">${item.riskLevel} RISK</span>
        </div>
        <p style="font-size:var(--fs-xs);margin-bottom:0.35rem"><strong style="color:var(--text)">Applies to:</strong> ${Array.isArray(item.applicableTo) ? item.applicableTo.join(', ') : item.applicableTo}</p>
        <p style="font-size:var(--fs-sm)">${item.summary}</p>
        <div class="reg-action"><strong>Required Action:</strong> ${item.actionRequired}</div>
        <p style="font-size:var(--fs-xs);color:var(--text-muted)"><strong>Key Authority:</strong> ${item.keyAuthority}</p>
      </div>`;
  }

  function renderMarketsView(marketKey) {
    if (!DOM.marketRegulationsContainer || !db.euGulfRegulations) return;
    const key = marketKey || state.selectedMarket || 'US';
    state.selectedMarket = key;
    const meta = MARKET_META[key] || MARKET_META.US;

    if (DOM.marketRegulationsHeading) DOM.marketRegulationsHeading.textContent = `${meta.icon} ${meta.label} Frameworks`;

    const cards = marketRegsFor(key);
    DOM.marketRegulationsContainer.innerHTML = cards.length
      ? cards.map(regCardHTML).join('')
      : '<p style="font-size:var(--fs-sm);color:var(--text-muted)">No frameworks listed for this market yet.</p>';

    // India pre-export checklist — the same for every destination, rendered once.
    if (DOM.indiaRegulationsContainer) {
      const india = (db.euGulfRegulations.gulf || []).filter(c => INDIA_CHECKLIST_RE.test(c.framework));
      DOM.indiaRegulationsContainer.innerHTML = india.map(regCardHTML).join('');
    }

    // Active-tab styling.
    if (DOM.marketTabs) {
      DOM.marketTabs.querySelectorAll('.market-tab').forEach(btn => {
        const active = btn.getAttribute('data-market') === key;
        btn.classList.toggle('btn-primary', active);
        btn.classList.toggle('btn-secondary', !active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
  }

  function setupMarketTabs() {
    if (!DOM.marketTabs) return;
    DOM.marketTabs.querySelectorAll('.market-tab').forEach(btn => {
      btn.addEventListener('click', () => renderMarketsView(btn.getAttribute('data-market')));
    });
  }

  // ==========================================================================
  // 20. RAG SEARCH
  // ==========================================================================
  function setupRagListeners() {
    DOM.ragSearchBtn.addEventListener('click', runRagSearch);
    DOM.ragSearchInput.addEventListener('keypress', e => { if (e.key === 'Enter') runRagSearch(); });
    document.querySelectorAll('.rag-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => { DOM.ragSearchInput.value = btn.getAttribute('data-query'); runRagSearch(); });
    });
  }

  function runRagSearch() {
    const query = DOM.ragSearchInput.value.trim().toLowerCase();
    if (!query) { alert("Please enter a search query."); return; }
    DOM.ragResultsContainer.innerHTML = '';
    let count = 0;
    db.enforcementPrecedents.forEach(p => {
      const isMatch = p.warningTextSnippet.toLowerCase().includes(query) || p.exporter.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query) || p.violationsCited.some(v => v.toLowerCase().includes(query));
      if (isMatch) {
        count++;
        const card = document.createElement('div');
        card.className = 'glass-card'; card.style.marginBottom = '1rem';
        const typeClass = p.type.includes('Warning') ? 'badge-critical' : 'badge-high';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">
            <span class="badge ${typeClass}">${p.type}</span>
            <span style="font-size:var(--fs-xs);color:var(--text-muted);font-weight:600">Date: ${p.date}</span>
          </div>
          <h4 style="margin-bottom:0.5rem;color:var(--text)">Exporter: ${p.exporter}</h4>
          <div style="font-size:var(--fs-sm);margin-bottom:0.75rem">
            <strong>Violations Cited:</strong>
            <ul style="list-style:disc;padding-left:1.25rem;margin-top:0.25rem;color:var(--text-muted)">${p.violationsCited.map(v => `<li>${v}</li>`).join('')}</ul>
          </div>
          <blockquote style="background:light-dark(rgba(0,0,0,0.03),rgba(0,0,0,0.3));padding:0.75rem;border-left:3px solid var(--accent);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:var(--fs-xs);font-style:italic;color:var(--text-muted);line-height:1.4">"${p.warningTextSnippet}"</blockquote>`;
        DOM.ragResultsContainer.appendChild(card);
      }
    });
    if (count === 0) {
      DOM.ragResultsContainer.innerHTML = `
        <div class="glass-card" style="text-align:center">🔍 No matches for "<strong>${query}</strong>".
          <div style="text-align:left;margin-top:1rem;padding:0.75rem;background:rgba(0,0,0,0.02);border-radius:var(--radius-sm);font-size:var(--fs-sm)">
            <strong>CFR Reference:</strong> 21 CFR §111.75(a)(1) — Identity testing required for all botanical ingredients.<br><br>Try: <em>lead, identity, unapproved, ndi, asava, dwpe, clinically proven, gmp, shilajit</em>
          </div>
        </div>`;
    }
    renderLetterDrafts(query);
  }

  function renderLetterDrafts(query) {
    DOM.ragRemediationDrafts.innerHTML = '';
    let draftTitle = "NDI Notification Cover Letter", draftCitation = "21 CFR §190.6";
    let draftTemplate = `[EXPORTER LETTERHEAD]
Date: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}

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

    if (/heavy|lead|metal|prop.?65|arsenic/.test(query)) {
      draftTitle = "California Prop 65 Safe Harbor Warning Label Plan";
      draftCitation = "Title 27 CCR §25603";
      draftTemplate = `[PACKAGING DESIGN SPECIFICATIONS — PROP 65 WARNING]

MANDATORY for California sales:

⚠️ WARNING: This product can expose you to chemicals including Lead, known to the State of California to cause cancer and birth defects or other reproductive harm. For more information go to www.P65Warnings.ca.gov.

PRINT REQUIREMENTS (27 CCR §25601–25603):
1. Font Size: ≥6pt, no smaller than other safety warnings on label
2. Icon: Bold black exclamation triangle, yellow background
3. Placement: Visible on Principal Display Panel before purchase

INTERNAL REMEDIATION:
Target raw material Lead < 0.5 ppm to avoid warning requirement.
Commission Prop 65-standard batch testing from ISO 17025 US lab.`;
    } else if (/identity|gmp|111/.test(query)) {
      draftTitle = "FDA Form 483 Response — Raw Material Identity Testing";
      draftCitation = "21 CFR §111.75(a)(1)(i)";
      draftTemplate = `[OFFICIAL RESPONSE TO FDA FORM 483 OBSERVATION]
Date: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}

FDA CFSAN Compliance Branch
RE: Observation — Failure to verify botanical ingredient identity

CORRECTIVE ACTION PLAN:

1. IMMEDIATE (30 days): Established SOP-QC-743 requiring HPTLC identity testing for 100% of incoming botanical raw materials, signed by independent QC Unit.

2. SUPPLIER QUALIFICATION (60 days): All botanical suppliers will undergo formal qualification audit per 21 CFR §111.70.

3. DOCUMENTATION (90 days): All batch records updated with in-house identity test result attached and QC independent sign-off prior to production release.

Sincerely,
[Head of Quality Control Unit]
[FEI Registration Number: XXXXXXXXX]`;
    } else if (/ndi|shilajit|novel/.test(query)) {
      draftTitle = "NDI Pre-Submission Meeting Request";
      draftCitation = "FDCA §413; FDA ODSP NDI Guidance (2022)";
      draftTemplate = `[EXPORTER LETTERHEAD]
Date: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}

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
3. Fulvic Acid standardization characterization requirements

Respectfully,
[Regulatory Affairs Director]`;
    }

    const block = document.createElement('div');
    block.className = 'glass-card';
    block.style.cssText = 'background:rgba(20,184,166,0.03);border:1px solid rgba(20,184,166,0.2)';
    block.innerHTML = `
      <h4 style="color:var(--accent);margin-bottom:0.5rem">📝 Editable Draft: ${draftTitle}</h4>
      <span style="font-size:var(--fs-xs);color:var(--text-muted);display:block;margin-bottom:0.75rem">Citation: ${draftCitation}</span>
      <textarea id="draft-letter-textarea" class="draft-textarea" spellcheck="false">${draftTemplate.trim()}</textarea>
      <div style="display:flex;gap:0.75rem;margin-top:0.75rem;flex-wrap:wrap">
        <button id="btn-copy-draft" class="btn btn-secondary" style="min-block-size:40px;padding:0 1rem;font-size:var(--fs-xs)">📋 Copy to Clipboard</button>
        <button id="btn-reset-draft" class="btn btn-secondary" style="min-block-size:40px;padding:0 1rem;font-size:var(--fs-xs)">↩️ Reset</button>
      </div>`;
    DOM.ragRemediationDrafts.appendChild(block);
    const orig = draftTemplate.trim();
    document.getElementById('btn-copy-draft').addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('draft-letter-textarea').value).then(() => {
        const btn = document.getElementById('btn-copy-draft'); btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy to Clipboard'; }, 2000);
      });
    });
    document.getElementById('btn-reset-draft').addEventListener('click', () => {
      document.getElementById('draft-letter-textarea').value = orig;
    });
  }

  // ==========================================================================
  // 21. DOWNLOAD REPORT
  // ==========================================================================
  function setupDownloadReport() {
    DOM.btnDownloadReport.addEventListener('click', downloadReport);
  }

  const REPORT_CSS = `body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:2rem;color:#1e293b;background:white;line-height:1.55}h1{font-size:1.6rem;color:#0f172a;margin-bottom:0.25rem}.subtitle{color:#64748b;font-size:0.85rem;margin-bottom:1.5rem}.summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:0.92rem}.score-box{display:inline-block;padding:1.25rem 2rem;border-radius:12px;background:#f8fafc;text-align:center;margin-bottom:1.5rem;vertical-align:top}.score-num{font-size:2.6rem;font-weight:800;line-height:1}.verdict-box{display:inline-block;padding:1rem 1.5rem;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;margin:0 0 1.5rem 1rem;vertical-align:top;max-width:60%}.pillars{display:grid;grid-template-columns:repeat(5,1fr);gap:0.6rem;margin-bottom:1.5rem}.pillar{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.6rem;text-align:center}.pillar-name{font-size:10px;color:#64748b;margin-bottom:0.25rem}.pillar-score{font-size:1.1rem;font-weight:700}h2{font-size:1.1rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.5rem;margin:1.75rem 0 1rem}.card{border-left:4px solid #888;padding:0.85rem 1rem;margin-bottom:0.85rem;background:#f9fafb;border-radius:0 8px 8px 0}.badge{display:inline-block;padding:0.2rem 0.6rem;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;margin-right:0.5rem}.gate{font-size:13px;margin:0.2rem 0;color:#334155}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:1rem}td,th{border:1px solid #e2e8f0;padding:0.4rem 0.6rem;text-align:left;vertical-align:top}th{background:#f1f5f9}.orig{color:#b91c1c}.reframe{color:#15803d}footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}@media print{body{padding:1rem}}`;
  const SEV_COLOR = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#ca8a04', LOW: '#3b82f6' };
  const RISK_COLOR = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MODERATE: '#ca8a04', LOW: '#3b82f6', COMPLIANT: '#16a34a' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function triggerDownload(html, name) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function downloadReport() {
    // Prefer the rich AI report when one exists.
    if (state.lastReport) { downloadAiReport(); return; }

    const doc = state.selectedDocument;
    if (!doc || !doc.gapAnalysis) { alert("Run an analysis first (upload a dossier or select a document)."); return; }
    const scoreReport = calculateFDAReadinessScore(doc.gapAnalysis.violations);
    const sorted = [...doc.gapAnalysis.violations].sort((a, b) =>
      ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[b.severity] - { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[a.severity]));
    const sc = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#ca8a04', LOW: '#3b82f6' };
    const bandColor = scoreReport.score >= 85 ? '#16a34a' : scoreReport.score >= 65 ? '#f59e0b' : scoreReport.score >= 40 ? '#f97316' : '#ef4444';

    const reportHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>APEX Compliance Report — ${doc.productName}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:2rem;color:#1e293b;background:white}h1{font-size:1.6rem;color:#0f172a;margin-bottom:0.25rem}.subtitle{color:#64748b;font-size:0.85rem;margin-bottom:2rem}.score-box{display:inline-block;padding:1.5rem 2.5rem;border-radius:12px;background:#f8fafc;border:2px solid ${bandColor};text-align:center;margin-bottom:2rem}.score-num{font-size:3rem;font-weight:800;color:${bandColor};line-height:1}.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:2rem}.pillar{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;text-align:center}.pillar-name{font-size:11px;color:#64748b;margin-bottom:0.25rem}.pillar-score{font-size:1.2rem;font-weight:700}h2{font-size:1.1rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.5rem;margin:1.5rem 0 1rem}.violation-card{border-left:4px solid #888;padding:1rem;margin-bottom:1rem;background:#f9fafb;border-radius:0 8px 8px 0}.badge{display:inline-block;padding:0.2rem 0.6rem;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;margin-right:0.5rem}footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}@media print{body{padding:1rem}}</style>
</head><body>
<h1>APEX Compliance Report${doc.isLive ? ' <span style="font-size:0.8rem;color:#16a34a;font-weight:400">[LIVE DOCUMENT ANALYSIS]</span>' : ''}</h1>
<p class="subtitle">Product: <strong>${doc.productName}</strong> &nbsp;|&nbsp; File: ${doc.fileName} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
<div class="score-box"><div class="score-num">${scoreReport.score}</div><div style="font-size:0.7rem;color:#888;margin:0.25rem 0">Readiness Index</div><div style="font-size:0.8rem;font-weight:700;color:${bandColor}">${scoreReport.band.label}</div></div>
<div class="pillars">
${[['Product Classification (15%)', scoreReport.pillarScores.product_classification], ['Labeling Compliance (25%)', scoreReport.pillarScores.labeling_compliance], ['Ingredient Safety (25%)', scoreReport.pillarScores.ingredient_safety], ['Manufacturing cGMP (20%)', scoreReport.pillarScores.manufacturing_compliance], ['Import Admissibility (15%)', scoreReport.pillarScores.import_admissibility]].map(([n, s]) =>
  `<div class="pillar"><div class="pillar-name">${n}</div><div class="pillar-score" style="color:${s >= 70 ? '#16a34a' : s >= 40 ? '#f59e0b' : '#ef4444'}">${s}/100</div></div>`).join('')}
</div>
<h2>Priority Remediation Actions (${sorted.length} gap${sorted.length !== 1 ? 's' : ''} found)</h2>
${sorted.length ? sorted.map(v => `<div class="violation-card" style="border-left-color:${sc[v.severity] || '#888'}">
  <div style="margin-bottom:0.5rem"><span class="badge" style="background:${sc[v.severity]}20;color:${sc[v.severity]}">${v.severity}</span><strong style="font-size:14px">${v.finding}</strong></div>
  <p style="font-size:13px;color:#555;margin-bottom:0.4rem">${v.remediation}</p>
  <p style="font-size:11px;color:#888">${v.citation}</p>
  ${v.calculation ? `<p style="font-size:11px;color:#888;font-family:monospace;margin-top:0.25rem">${v.calculation}</p>` : ''}
</div>`).join('') : '<p style="color:#16a34a">✅ No compliance gaps detected.</p>'}
<footer>APEX Compliance Platform &nbsp;|&nbsp; Regulatory data current as of January 2026 &nbsp;|&nbsp; NOT a substitute for licensed regulatory or legal counsel.</footer>
</body></html>`;

    triggerDownload(reportHtml, `APEX_Report_${doc.productName.replace(/\s+/g, '_')}.html`);
  }

  // Full export of the Claude analysis: summary, classification, every
  // violation, claim reframing, ingredient findings, and documents assessed.
  function downloadAiReport() {
    const r = state.lastReport;
    const c = r.classification || {};
    const violations = r.violations || [];
    const scoreReport = scoreReportFromMetaOrLocal(violations, r._meta);
    const sorted = [...violations].sort((a, b) =>
      ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[b.severity] - { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[a.severity]));
    const bandColor = scoreReport.score >= 85 ? '#16a34a' : scoreReport.score >= 65 ? '#f59e0b' : scoreReport.score >= 40 ? '#f97316' : '#ef4444';
    const gateIcon = { PASS: '✅', FAIL: '❌', REVIEW: '⚠️' };

    const pillars = [
      ['Product Classification (15%)', scoreReport.pillarScores.product_classification],
      ['Labeling Compliance (25%)', scoreReport.pillarScores.labeling_compliance],
      ['Ingredient Safety (25%)', scoreReport.pillarScores.ingredient_safety],
      ['Manufacturing cGMP (20%)', scoreReport.pillarScores.manufacturing_compliance],
      ['Import Admissibility (15%)', scoreReport.pillarScores.import_admissibility],
    ].map(([n, s]) => `<div class="pillar"><div class="pillar-name">${n}</div><div class="pillar-score" style="color:${s >= 70 ? '#16a34a' : s >= 40 ? '#f59e0b' : '#ef4444'}">${s}/100</div></div>`).join('');

    const docsTable = (r.documentsAssessed || []).length
      ? `<table><thead><tr><th>Document</th><th>Type</th><th>Summary</th></tr></thead><tbody>${r.documentsAssessed.map(d =>
          `<tr><td><strong>${esc(d.name)}</strong></td><td>${esc(d.type)}</td><td>${esc(d.summary)}</td></tr>`).join('')}</tbody></table>`
      : '<p style="color:#94a3b8;font-size:13px">No documents recorded.</p>';

    const decisionGates = (c.decisionSteps || []).map(s =>
      `<div class="gate">${gateIcon[s.status] || ''} <strong>${esc(s.gate)}:</strong> ${esc(s.detail)}</div>`).join('');

    const violationCards = sorted.length ? sorted.map(v => `<div class="card" style="border-left-color:${SEV_COLOR[v.severity] || '#888'}">
  <div style="margin-bottom:0.4rem"><span class="badge" style="background:${SEV_COLOR[v.severity]}20;color:${SEV_COLOR[v.severity]}">${esc(v.severity)}</span><strong style="font-size:14px">${esc(v.finding)}</strong></div>
  <p style="font-size:13px;color:#555;margin-bottom:0.3rem"><strong>Remediation:</strong> ${esc(v.remediation)}</p>
  <p style="font-size:11px;color:#888">${esc(v.citation)}</p>
</div>`).join('') : '<p style="color:#16a34a">✅ No compliance gaps detected.</p>';

    const claimRows = (r.claimAnalysis || []).length
      ? `<table><thead><tr><th>Risk</th><th>Original Claim</th><th>Issue</th><th>Compliant Reframing</th><th>Citation</th></tr></thead><tbody>${r.claimAnalysis.map(cl =>
          `<tr><td><span class="badge" style="background:${RISK_COLOR[cl.risk]}20;color:${RISK_COLOR[cl.risk]}">${esc(cl.risk)}</span></td><td class="orig">"${esc(cl.originalClaim)}"</td><td>${esc(cl.issue)}</td><td class="reframe">"${esc(cl.reframedClaim)}"</td><td style="font-size:11px;color:#888">${esc(cl.citation)}</td></tr>`).join('')}</tbody></table>`
      : '<p style="color:#94a3b8;font-size:13px">No marketing claims detected.</p>';

    const ingredientRows = (r.ingredientFindings || []).length
      ? `<table><thead><tr><th>Ingredient</th><th>Regulatory Status</th><th>Note</th></tr></thead><tbody>${r.ingredientFindings.map(i =>
          `<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.fdaStatus)}</td><td>${esc(i.note)}</td></tr>`).join('')}</tbody></table>`
      : '<p style="color:#94a3b8;font-size:13px">No ingredient findings.</p>';

    const docNames = (state.lastReportDocs || []).map(d => d.name).join(', ') || '—';
    const PROVIDER_LABELS = { anthropic: 'Claude (Anthropic)', nvidia: 'NVIDIA Nemotron' };
    const providerLabel = (r._meta && PROVIDER_LABELS[r._meta.provider]) || 'AI engine';
    const model = r._meta && r._meta.model ? `${providerLabel} — ${r._meta.model}` : providerLabel;
    const marketLabel = (r._meta && r._meta.marketLabel) || 'Export';
    const categoryLabel = (r._meta && r._meta.categoryLabel) || '';
    const metaBits = [];
    if (r._meta && r._meta.pipelineReady) metaBits.push('pipelineReady');
    if (r._meta && r._meta.humanReviewRequired) metaBits.push('human review required');
    if (r._meta && r._meta.truncation && r._meta.truncation.truncated) metaBits.push('dossier truncated');
    const metaNote = metaBits.length ? ` &nbsp;|&nbsp; ${metaBits.join(' · ')}` : '';

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>APEX Compliance Report — ${esc(r.productName)}</title>
<style>${REPORT_CSS}</style></head><body>
<h1>APEX Compliance Report <span style="font-size:0.8rem;color:#0ea5e9;font-weight:400">[AI ANALYSIS]</span></h1>
<p class="subtitle">Product: <strong>${esc(r.productName)}</strong> &nbsp;|&nbsp; Market: <strong>${esc(marketLabel)}</strong>${categoryLabel ? ` &nbsp;|&nbsp; Category: ${esc(categoryLabel)}` : ''} &nbsp;|&nbsp; Documents: ${esc(docNames)} &nbsp;|&nbsp; Engine: ${esc(model)} &nbsp;|&nbsp; Score source: ${scoreReport.fromServer ? 'server _meta' : 'local demo'} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}${metaNote}</p>

<div class="summary"><strong>Executive Summary</strong><br>${esc(r.productSummary)}</div>

<div class="score-box" style="border:2px solid ${bandColor}"><div class="score-num" style="color:${bandColor}">${scoreReport.score}</div><div style="font-size:0.7rem;color:#888;margin:0.25rem 0">Readiness Index</div><div style="font-size:0.8rem;font-weight:700;color:${bandColor}">${scoreReport.band.label}</div></div>
<div class="verdict-box"><div style="font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Classification Verdict</div><div style="font-size:1.05rem;font-weight:800;color:#0f172a;margin:0.2rem 0">${esc(c.title)}</div><div style="font-size:11px;color:#64748b">${esc(c.governingLaw)}</div></div>

<div class="pillars">${pillars}</div>

<h2>Classification Rationale</h2>
<p style="font-size:13px">${esc(c.rationale)}</p>
${decisionGates ? `<div style="margin-top:0.75rem">${decisionGates}</div>` : ''}

<h2>Priority Remediation Actions (${sorted.length} gap${sorted.length !== 1 ? 's' : ''} found)</h2>
${violationCards}

<h2>Claim Analysis &amp; Compliant Reframing</h2>
${claimRows}

<h2>Ingredient Findings</h2>
${ingredientRows}

<h2>Documents Assessed</h2>
${docsTable}

<footer>APEX Compliance Platform &nbsp;|&nbsp; AI-generated analysis via ${esc(model)} &nbsp;|&nbsp; Informational research tool only — NOT a substitute for licensed regulatory or legal counsel.</footer>
</body></html>`;

    triggerDownload(html, `APEX_Report_${String(r.productName || 'dossier').replace(/[^\w]+/g, '_').slice(0, 60)}.html`);
  }

  // Run!
  init();
});
