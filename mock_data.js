/**
 * FDA Compliance Platform - Mock Database & Regulatory Crosswalk
 * Contains realistic data structures for Ayurvedic and nutraceutical compliance checking,
 * based on 21 CFR, California Prop 65, EU 2015/2283, and FDA enforcement history.
 */

const COMPLIANCE_DATABASE = {

  // 1. Terminology Crosswalk Database (FSSAI/AYUSH → US FDA)
  terminologyCrosswalk: [
    {
      indianTerm: "Nutraceutical",
      indianContext: "Food Safety & Standards Act (FSSAI) 2006",
      fdaEquivalent: "Dietary Supplement",
      governingLaw: "DSHEA 1994, 21 CFR §101.36",
      riskLevel: "LOW-MODERATE",
      notes: "Not a 1:1 transition. FSSAI nutraceutical categories permit some health claims that are prohibited as disease claims under FDA without an approved NDA/ANDA. Requires an audit of all active claims."
    },
    {
      indianTerm: "Proprietary Ayurvedic Medicine",
      indianContext: "Drugs & Cosmetics Act 1940 (Schedule T)",
      fdaEquivalent: "Unapproved New Drug (Potential)",
      governingLaw: "FDCA §201(g), 21 USC §321(g)",
      riskLevel: "CRITICAL",
      notes: "Extremely high risk of automatic classification as a drug in the US. Standard Ayurvedic proprietary formulas that state therapeutic actions (e.g. 'cures joint inflammation') will be seized by US Customs unless they carry strictly structure/function labeling."
    },
    {
      indianTerm: "Health Supplement",
      indianContext: "FSS (Health Supplement) Regulations 2022",
      fdaEquivalent: "Dietary Supplement",
      governingLaw: "DSHEA 1994, 21 CFR Part 111",
      riskLevel: "LOW",
      notes: "Closest equivalent category. Requires reformulation of the FSSAI nutritional panel into a compliant 'Supplement Facts' panel conforming to 21 CFR §101.36."
    },
    {
      indianTerm: "Bhasma",
      indianContext: "Traditional metallic-mineral herbo-preparations",
      fdaEquivalent: "Prohibited Adulterant / Heavy Metal Risk",
      governingLaw: "FDA Import Alert 54-15, FDCA §402(a)(1)",
      riskLevel: "CRITICAL",
      notes: "Heavy metals assessment is mandatory. Swarna Bhasma (gold), Abhraka Bhasma (mica), and Tamra Bhasma (copper) trigger automatic detention without physical examination (DWPE) at US ports of entry due to adulteration concerns."
    },
    {
      indianTerm: "Asava / Arishta",
      indianContext: "Self-fermented classical liquid preparations",
      fdaEquivalent: "Conventional Food or Dietary Supplement",
      governingLaw: "TTB Regulations (27 CFR), FDA FDCA",
      riskLevel: "HIGH",
      notes: "Contains self-generated alcohol. Fermented liquid preparations exceeding 0.5% ABV are subject to Alcohol and Tobacco Tax and Trade Bureau (TTB) jurisdiction, requiring federal permits and excise taxes, in addition to FDA facility registration."
    },
    {
      indianTerm: "Churna",
      indianContext: "Powdered classical herbal formulation",
      fdaEquivalent: "Dietary Supplement (Botanical Powder)",
      governingLaw: "21 CFR §101.36, NDI (21 CFR §190.6)",
      riskLevel: "LOW-MODERATE",
      notes: "Compliant as a dietary supplement. However, if the churna contains any botanical ingredient not marketed in the US prior to October 15, 1994, a New Dietary Ingredient (NDI) notification must be filed 75 days in advance."
    },
    {
      indianTerm: "Rasayana",
      indianContext: "Rejuvenating, anti-aging, longevity formulation",
      fdaEquivalent: "Dietary Supplement (Structure/Function)",
      governingLaw: "21 CFR §101.93(f)",
      riskLevel: "MODERATE",
      notes: "Traditional Ayurvedic claims about cellular rejuvenation and extending life span ('Rasayana properties') must be reframed. Therapeutic or anti-aging disease claims are prohibited; only structure/function claims are allowed."
    },
    {
      indianTerm: "GMP (Schedule M / Schedule T)",
      indianContext: "Ayush & FSSAI Good Manufacturing Practices",
      fdaEquivalent: "Dietary Supplement cGMP (21 CFR Part 111)",
      governingLaw: "21 CFR Part 111 / Part 117",
      riskLevel: "MODERATE",
      notes: "Indian GMP standards have major gaps compared to US 21 CFR Part 111. Key missing elements include mandatory identity testing of 100% of incoming botanical batches (§111.75) and independent QC unit oversight."
    },
    {
      indianTerm: "Shilajit / Shilajeet",
      indianContext: "Mineral pitch exudate, classified as a mineral supplement",
      fdaEquivalent: "Dietary Supplement (NDI Required)",
      governingLaw: "21 CFR §190.6 (NDI Notification), FDCA §413",
      riskLevel: "HIGH",
      notes: "Shilajit purified extract was not commercially marketed in the US before October 15, 1994 in most standardized forms. A New Dietary Ingredient (NDI) notification must be filed with FDA's ODSP 75 days before market introduction. Heavy metal testing (lead, arsenic, mercury) is critical."
    },
    {
      indianTerm: "Kwath / Kashaya (Herbal Decoction)",
      indianContext: "Water-extracted classical herbal concentrate",
      fdaEquivalent: "Dietary Supplement (Liquid Botanical Extract)",
      governingLaw: "21 CFR §101.36, Part 111",
      riskLevel: "MODERATE",
      notes: "Generally classifiable as a dietary supplement in liquid form. Preservatives used in India (like sodium benzoate) must comply with US GRAS limits. Shelf stability and microbial testing to US standards required."
    },
    {
      indianTerm: "FSSAI Nutritional Information Panel",
      indianContext: "Food Safety & Standards (Labelling) Regulations 2011",
      fdaEquivalent: "Supplement Facts / Nutrition Facts Panel",
      governingLaw: "21 CFR §101.9 (Nutrition Facts), 21 CFR §101.36 (Supplement Facts)",
      riskLevel: "HIGH",
      notes: "Indian FSSAI labels use ICMR-NIN RDA values which differ from US FDA Daily Values. The entire nutritional panel must be rebuilt using US reference amounts. Serving sizes must be declared in US household units. All nutrient amounts must be recalculated using 21 CFR §101.9."
    }
  ],

  // 2. Claim Reframing Database (expanded with Indian-specific claims)
  claimsDatabase: [
    {
      originalClaim: "Improves immunity to fight off winter infections",
      detectedEntities: ["immunity", "winter infections", "fight off infections"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Implies prevention or mitigation of infectious diseases ('winter infections' refers to colds/flu), which is a drug-like disease prevention claim.",
      suggestedReframing: "Supports healthy immune function during seasonal changes",
      citation: "21 CFR §101.93(f), FDA Guidance on Structure/Function Claims"
    },
    {
      originalClaim: "Cures madhumeh and naturally controls blood sugar",
      detectedEntities: ["madhumeh", "diabetes", "controls blood sugar", "blood sugar"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Direct disease treatment claim ('madhumeh' translates to diabetes in Sanskrit). Controlling blood sugar implies treatment of diabetes.",
      suggestedReframing: "Helps maintain healthy blood glucose levels already within the normal range",
      citation: "21 USC §321(g)(1)(B), FDCA Drug Definition"
    },
    {
      originalClaim: "Reduces arterial plaque and lowers high cholesterol",
      detectedEntities: ["arterial plaque", "high cholesterol", "lowers cholesterol"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Direct clinical biomarker intervention. Lowering high cholesterol is considered a therapeutic action reserved for drugs.",
      suggestedReframing: "Supports cardiovascular health and helps maintain normal cholesterol levels",
      citation: "FDA Structure/Function Claims Guidance Section II.B"
    },
    {
      originalClaim: "Naturally relieves arthritis and joint swelling",
      detectedEntities: ["arthritis", "joint swelling"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Relieving arthritis (a recognized chronic disease) and joint swelling (a clinical symptom of inflammation) is a drug claim.",
      suggestedReframing: "Promotes joint comfort, flexibility, and structural integrity",
      citation: "21 CFR §101.93(g), Prohibited Disease Claims"
    },
    {
      originalClaim: "Anti-aging formula that reverses cellular decay and extends life",
      detectedEntities: ["anti-aging", "reverses cellular decay", "extends life"],
      classification: "BORDERLINE_CLAIM",
      riskLevel: "HIGH",
      reason: "Reversing cellular decay and extending life span borders on therapeutic treatment of aging-related pathology. Highly prone to FDA challenge.",
      suggestedReframing: "Supports cellular longevity and youthful vitality",
      citation: "FDA Guidance on Substantiation of Dietary Supplement Claims"
    },
    {
      originalClaim: "Excellent dietary source of Vitamin C to support skin health",
      detectedEntities: ["Vitamin C", "skin health"],
      classification: "PERMISSIBLE_STRUCTURE_FUNCTION",
      riskLevel: "LOW",
      reason: "Simple nutrient content claim paired with a valid structure/function claim of skin maintenance. Allowed.",
      suggestedReframing: "Excellent source of Vitamin C to support healthy skin",
      citation: "21 CFR §101.54, Nutrient Content Claims"
    },
    {
      originalClaim: "Detoxifies liver and kidneys from toxic impurities",
      detectedEntities: ["detoxifies", "detox", "liver", "kidneys", "toxic"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "'Detoxifies liver and kidneys' implies treatment of organ dysfunction. FDA has issued multiple warning letters for detox claims implying disease treatment.",
      suggestedReframing: "Supports healthy liver function and natural cleansing processes",
      citation: "21 CFR §101.93(f); FDA Warning Letters to detox product manufacturers (2019–2024)"
    },
    {
      originalClaim: "Increases sperm motility and treats male infertility",
      detectedEntities: ["sperm motility", "infertility", "treats", "male infertility"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Infertility is a recognized medical condition. Treating it requires drug approval. Sperm motility claims directly reference clinical reproductive endpoints.",
      suggestedReframing: "Supports healthy reproductive function and male vitality",
      citation: "21 USC §321(g)(1)(B); FDCA Drug Definition"
    },
    {
      originalClaim: "Controls thyroid function and treats hypothyroidism",
      detectedEntities: ["thyroid", "hypothyroidism", "controls thyroid"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Hypothyroidism is a recognized medical diagnosis. Any product claiming to treat or control thyroid function is automatically classified as an unapproved drug.",
      suggestedReframing: "Supports healthy metabolism and sustainable energy levels",
      citation: "21 USC §321(g)(1)(B); FDA Compliance Policy Guide §690.100"
    },
    {
      originalClaim: "100% natural and organic, no side effects guaranteed",
      detectedEntities: ["no side effects", "guaranteed", "100% natural"],
      classification: "MISLEADING_CLAIM",
      riskLevel: "HIGH",
      reason: "'No side effects guaranteed' is an unsubstantiated absolute claim. FDA requires all health claims to be truthful, not misleading, and substantiated by competent and reliable scientific evidence.",
      suggestedReframing: "Made with premium natural botanical ingredients. Consult your healthcare provider before use.",
      citation: "21 CFR §101.56; FTC Act Section 5 (Deceptive Claims)"
    },
    {
      originalClaim: "Clinically proven to boost testosterone levels by 40%",
      detectedEntities: ["clinically proven", "testosterone", "boost testosterone"],
      classification: "UNSUBSTANTIATED_CLAIM",
      riskLevel: "HIGH",
      reason: "'Clinically proven' requires robust randomized controlled trial evidence. Quantified testosterone increase implies hormone modulation — a drug-like biomarker endpoint.",
      suggestedReframing: "Formulated to support healthy male vitality, energy, and physical performance",
      citation: "FTC Dietary Supplements Enforcement Policy; 21 CFR §101.93 Structure/Function claim substantiation"
    },
    {
      originalClaim: "Relieves stress, anxiety and clinical depression naturally",
      detectedEntities: ["anxiety", "depression", "clinical depression", "relieves stress"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Anxiety disorders and clinical depression are DSM-5 recognized mental health conditions. Claiming to relieve them classifies the product as an unapproved psychiatric drug.",
      suggestedReframing: "Supports a calm and balanced mind, and helps the body adapt to occasional everyday stress",
      citation: "21 USC §321(g)(1)(B); FDA CFSAN Guidance on Mental Health Claims"
    },
    {
      originalClaim: "Powerful antioxidant that prevents cancer cell growth",
      detectedEntities: ["prevents cancer", "cancer cell", "cancer"],
      classification: "PROHIBITED_DISEASE_CLAIM",
      riskLevel: "CRITICAL",
      reason: "Preventing cancer is an absolute disease prevention claim. Even antioxidant claims cannot be linked to cancer prevention without FDA-authorized health claim approval.",
      suggestedReframing: "Rich in antioxidants that support cellular health and help protect against oxidative stress",
      citation: "21 CFR §101.14 (Authorized health claims); FDA Import Alert 66-41"
    },
    {
      originalClaim: "Reduces Vata-Pitta dosha imbalance and pacifies tridosha",
      detectedEntities: ["dosha", "vata", "pitta", "tridosha"],
      classification: "BORDERLINE_CLAIM",
      riskLevel: "MODERATE",
      reason: "Ayurvedic dosha terminology has no recognized FDA equivalent and implies a therapeutic balancing effect. Combined with symptom language, it can imply disease treatment.",
      suggestedReframing: "Supports overall well-being and holistic mind-body balance",
      citation: "FDA Guidance on Health Claims; 21 CFR §101.14"
    }
  ],

  // 3. Preloaded Exporter Mock Documents
  mockDocuments: {
    label: {
      id: "DOC-LABEL-01",
      fileName: "Chyawanprash_Traditional_Label_v3.pdf",
      documentType: "Label / Packaging Scan",
      productName: "Traditional Ayurvedic Chyawanprash Jam",
      servingSize: "15g (1 tablespoon)",
      servingsPerContainer: "33",
      dosageForm: "Paste / Jam",
      extractedData: {
        brandName: "Patanjali Herbals India",
        productIdentity: "Proprietary Ayurvedic Medicine",
        countryOfOrigin: "India",
        ingredients: [
          { name: "Amalaki (Phyllanthus emblica)", amount: "7.5g", fdaStatus: "GRAS" },
          { name: "Sugar", amount: "5.0g", fdaStatus: "Food Additive" },
          { name: "Honey", amount: "1.2g", fdaStatus: "GRAS" },
          { name: "Swarna Bhasma (Gold Ash)", amount: "15mg", fdaStatus: "PROHIBITED_METAL" },
          { name: "Pippali (Piper longum)", amount: "250mg", fdaStatus: "ODI_COMPLIANT" },
          { name: "Ghee (Clarified Butter)", amount: "800mg", fdaStatus: "GRAS" },
          { name: "Twak (Cinnamomum verum)", amount: "100mg", fdaStatus: "GRAS" }
        ],
        claims: [
          "Cures respiratory disorders and chronic asthma naturally.",
          "Builds 100% immunity against viral infections and seasonal coughs.",
          "Rejuvenates the heart and delays the aging process.",
          "Take 1 tablespoon twice daily with warm milk."
        ],
        warnings: "Do not exceed recommended dose.",
        panelsDetected: ["Front Panel (PDP)", "Ingredients Panel (Indian FSSAI format)"],
        fdaDisclaimerPresent: false
      },
      gapAnalysis: {
        violations: [
          {
            severity: "CRITICAL",
            pillar: "product_classification",
            finding: "Product contains 'Swarna Bhasma' (gold ash). Heavy metal adulteration risk.",
            citation: "FDA Import Alert 54-15 (DWPE Detention for Ayurvedic Heavy Metals); FDCA §402(a)(1)",
            remediation: "Remove Swarna Bhasma from the US export formulation entirely. Bhasmas containing gold, silver, copper, mercury, or lead are deemed adulterated under US law."
          },
          {
            severity: "CRITICAL",
            pillar: "labeling_compliance",
            finding: "Disease claims detected: 'Cures respiratory disorders and chronic asthma' & 'Builds 100% immunity against viral infections'.",
            citation: "21 USC §321(g) (Drug definition); 21 CFR §310",
            remediation: "Rewrite and reframe. Replace with: 'Supports respiratory and seasonal immune health'. Remove all references to curing asthma or preventing viral infections."
          },
          {
            severity: "HIGH",
            pillar: "labeling_compliance",
            finding: "Missing standard US Supplement Facts panel format. Currently uses FSSAI Nutritional Information table.",
            citation: "21 CFR §101.36",
            remediation: "Reformat the ingredient listing into a standard US 'Supplement Facts' panel, declaring active botanicals in metric weights and sugar content in compliance with 21 CFR §101.9."
          },
          {
            severity: "HIGH",
            pillar: "labeling_compliance",
            finding: "Missing mandatory DSHEA FDA disclaimer on front/information panels.",
            citation: "21 CFR §101.93 (Mandatory statement: 'These statements have not been evaluated by the Food and Drug Administration...')",
            remediation: "Add the exact DSHEA double-boxed disclaimer text adjacent to any structure/function claims on the packaging."
          }
        ]
      }
    },

    coa: {
      id: "DOC-COA-02",
      fileName: "Ashwagandha_Root_Extract_COA_ASH-2026.pdf",
      documentType: "Certificate of Analysis (CoA)",
      productName: "Ashwagandha Root Extract 500mg (capsule)",
      servingSize: "2 capsules (1,000mg total)",
      extractedData: {
        issuingLab: "NABL Accredited Bangalore Analytical Labs",
        reportNumber: "BAL-2026-9871A",
        reportDate: "February 12, 2026",
        batchLotNumber: "ASH-2026-09",
        manufactureDate: "October 12, 2025",
        expiryDate: "October 11, 2028",
        parameters: {
          assay: { name: "Withanolides (HPLC)", result: "2.65%", specLimit: "Min 2.5%", status: "PASS" },
          plateCount: { name: "Total Plate Count", result: "1,200 CFU/g", specLimit: "Max 10,000 CFU/g", status: "PASS" },
          yeastMold: { name: "Yeast & Mold", result: "180 CFU/g", specLimit: "Max 1,000 CFU/g", status: "PASS" },
          eColi: { name: "E. Coli", result: "Absent", specLimit: "Absent", status: "PASS" },
          salmonella: { name: "Salmonella", result: "Absent", specLimit: "Absent", status: "PASS" },
          lead: { name: "Lead (Pb)", result: "3.80 ppm (mg/kg)", specLimit: "Max 5.00 ppm", status: "PASS" },
          arsenic: { name: "Arsenic (As)", result: "0.85 ppm (mg/kg)", specLimit: "Max 1.50 ppm", status: "PASS" },
          mercury: { name: "Mercury (Hg)", result: "0.15 ppm (mg/kg)", specLimit: "Max 1.00 ppm", status: "PASS" },
          cadmium: { name: "Cadmium (Cd)", result: "0.05 ppm (mg/kg)", specLimit: "Max 0.30 ppm", status: "PASS" }
        }
      },
      gapAnalysis: {
        violations: [
          {
            severity: "CRITICAL",
            pillar: "import_admissibility",
            finding: "Daily exposure of Lead (Pb) is 3.80 mcg/day, which exceeds California Proposition 65 MADL threshold of 0.5 mcg/day.",
            calculation: "3.8 ppm = 3.8 mcg/g. Daily serving is 1.0g (1,000mg). Daily exposure = 3.8 mcg/g × 1.0g = 3.8 mcg/day. California Prop 65 MADL is 0.5 mcg/day.",
            citation: "California OEHHA Proposition 65 (Safe Harbor MADL Lead); Health and Safety Code §25249.5",
            remediation: "Either source clean raw material with Lead levels below 0.5 ppm, or apply a mandatory California Prop 65 warning label."
          },
          {
            severity: "HIGH",
            pillar: "ingredient_safety",
            finding: "Daily exposure of Arsenic (As) is 0.85 mcg/day, which exceeds California Prop 65 inorganic arsenic MADL of 0.1 mcg/day.",
            calculation: "0.85 ppm × 1.0g = 0.85 mcg/day. California Prop 65 inorganic arsenic MADL is 0.1 mcg/day.",
            citation: "California Prop 65 (Inorganic Arsenic Threshold)",
            remediation: "Perform speciation testing to confirm if the arsenic is organic or inorganic. Source Ashwagandha from low-arsenic soil profiles."
          },
          {
            severity: "LOW",
            pillar: "manufacturing_compliance",
            finding: "CoA is validated against Indian API heavy metal limits (Lead limit 10 ppm), which are highly obsolete compared to US FDA/USP dietary supplement action levels.",
            citation: "21 CFR §111.75, USP Chapter <2232> (Elemental Impurities)",
            remediation: "Update QA release standards to evaluate batches using USP <2232> dietary supplement thresholds instead of Indian API monograph limits."
          }
        ]
      }
    },

    mmf: {
      id: "DOC-MMF-03",
      fileName: "Triphala_Churna_Master_Formula_B21.pdf",
      documentType: "Master Manufacturing Record (MMR / MMF)",
      productName: "Triphala Churna Capsule 500mg",
      extractedData: {
        formulaHeader: {
          productName: "Triphala Capsule",
          version: "v4.2",
          effectiveDate: "March 15, 2024",
          formulatorSignature: "Dr. K. Raghavan, BAMS"
        },
        ingredients: [
          { name: "Haritaki Powder (Terminalia chebula)", percentage: "33.3%", role: "Active" },
          { name: "Vibhitaki Powder (Terminalia bellirica)", percentage: "33.3%", role: "Active" },
          { name: "Amalaki Powder (Phyllanthus emblica)", percentage: "33.3%", role: "Active" },
          { name: "Silicon Dioxide", percentage: "1.5%", role: "Excipient (Anti-caking)" },
          { name: "Magnesium Stearate", percentage: "1.0%", role: "Excipient (Lubricant)" }
        ],
        processControls: {
          dryingTemp: "65°C for 4 hours",
          blendingTime: "45 minutes in V-Blender",
          capsuleShell: "HPMC (Vegetarian), Size 0",
          testingParameters: ["Moisture content", "Weight variation", "Disintegration time"]
        }
      },
      gapAnalysis: {
        violations: [
          {
            severity: "CRITICAL",
            pillar: "manufacturing_compliance",
            finding: "Lacks standard operating procedure (SOP) for 100% identity verification of each incoming botanical ingredient prior to processing.",
            citation: "21 CFR §111.75(a)(1)(i) (Mandatory identity testing of dietary ingredients)",
            remediation: "Implement mandatory HPTLC or macroscopic identity verification for every incoming batch of Haritaki, Vibhitaki, and Amalaki. Signed off by the independent QC unit."
          },
          {
            severity: "HIGH",
            pillar: "manufacturing_compliance",
            finding: "MMR is signed off by the formulator, but contains no separate, independent Quality Control (QC) unit authorization signature.",
            citation: "21 CFR §111.105 (QC operations requirement)",
            remediation: "Establish a structurally independent Quality Control unit. Redraft the MMR header to include separate 'Prepared By' and 'QC Approved By' signatures."
          },
          {
            severity: "MEDIUM",
            pillar: "manufacturing_compliance",
            finding: "Silicon Dioxide at 1.5% is close to GRAS maximum limit without toxicological rationale in batch records.",
            citation: "21 CFR §182.1711 (Silicon Dioxide limitations)",
            remediation: "Revise excipient concentration to 1.0% or below, or document a manufacturing necessity rationale approved by the QC unit."
          }
        ]
      }
    },

    shilajit: {
      id: "DOC-COA-04",
      fileName: "Shilajit_Purified_Extract_COA_SHJ-2026.pdf",
      documentType: "Certificate of Analysis (CoA)",
      productName: "Purified Shilajit Extract 250mg (capsule)",
      servingSize: "2 capsules (500mg total)",
      extractedData: {
        issuingLab: "ISO 17025 Certified Himalayan Labs, Dehradun",
        reportNumber: "HL-2026-SHJ-441",
        reportDate: "January 08, 2026",
        batchLotNumber: "SHJ-2026-03",
        manufactureDate: "November 05, 2025",
        expiryDate: "November 04, 2028",
        parameters: {
          fulvicAcid: { name: "Fulvic Acid (UV-Vis)", result: "62.3%", specLimit: "Min 60%", status: "PASS" },
          dibenzopyrones: { name: "Dibenzo-α-pyrones (HPLC)", result: "0.85%", specLimit: "Min 0.5%", status: "PASS" },
          moisture: { name: "Moisture Content", result: "4.2%", specLimit: "Max 8.0%", status: "PASS" },
          lead: { name: "Lead (Pb)", result: "7.20 ppm (mg/kg)", specLimit: "Max 10.00 ppm (API)", status: "PASS" },
          arsenic: { name: "Arsenic (As)", result: "2.10 ppm (mg/kg)", specLimit: "Max 3.00 ppm (API)", status: "PASS" },
          mercury: { name: "Mercury (Hg)", result: "0.45 ppm (mg/kg)", specLimit: "Max 1.00 ppm", status: "PASS" },
          cadmium: { name: "Cadmium (Cd)", result: "0.12 ppm (mg/kg)", specLimit: "Max 0.30 ppm", status: "PASS" }
        }
      },
      gapAnalysis: {
        violations: [
          {
            severity: "CRITICAL",
            pillar: "ingredient_safety",
            finding: "No NDI (New Dietary Ingredient) notification on file for Purified Shilajit Extract. This ingredient was not commercially marketed in the US before October 15, 1994 in standardized extract form.",
            citation: "21 CFR §190.6; FDCA §413(a)(2) — NDI Notification mandatory 75 days before market introduction",
            remediation: "File an NDI Notification with FDA's Office of Dietary Supplement Programs (ODSP) at least 75 days before US market launch. Include safety data, traditional use history, and human clinical study evidence."
          },
          {
            severity: "CRITICAL",
            pillar: "import_admissibility",
            finding: "Lead (Pb) daily exposure of 3.60 mcg/day far exceeds California Prop 65 MADL of 0.5 mcg/day.",
            calculation: "7.20 ppm × 0.5g serving = 3.60 mcg/day. Prop 65 MADL for lead is 0.5 mcg/day — product exceeds by 7.2×.",
            citation: "California OEHHA Prop 65 (Lead MADL 0.5 mcg/day); Health & Safety Code §25249.5",
            remediation: "Source Himalayan Shilajit purified resin with lead content below 1 ppm, or apply mandatory Prop 65 warning for California sales. Consider partnering with US-side lab for raw material pre-screening."
          },
          {
            severity: "HIGH",
            pillar: "import_admissibility",
            finding: "Arsenic (As) daily exposure of 1.05 mcg/day exceeds California Prop 65 inorganic arsenic MADL of 0.1 mcg/day by 10.5×.",
            calculation: "2.10 ppm × 0.5g = 1.05 mcg/day. Prop 65 MADL for inorganic arsenic is 0.1 mcg/day.",
            citation: "California Prop 65 (Inorganic Arsenic)",
            remediation: "Commission arsenic speciation testing (organic vs inorganic). If inorganic arsenic exceeds threshold, reformulate with alternative Himalayan sourcing from low-arsenic geological zones."
          },
          {
            severity: "HIGH",
            pillar: "labeling_compliance",
            finding: "No DSHEA disclaimer present. Any claims on label about energy, cognitive function, or vitality require the mandatory FDA disclaimer.",
            citation: "21 CFR §101.93(b)",
            remediation: "Add DSHEA disclaimer: 'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.'"
          }
        ]
      }
    },

    asava: {
      id: "DOC-LABEL-05",
      fileName: "Dashamularishta_Liquid_Label_v2.pdf",
      documentType: "Label / Packaging Scan",
      productName: "Dashamularishta Self-Fermented Tonic (450ml)",
      servingSize: "30ml (2 tablespoons)",
      servingsPerContainer: "15",
      dosageForm: "Fermented Liquid (Arishta)",
      extractedData: {
        brandName: "Baidyanath Ayurved",
        productIdentity: "Classical Ayurvedic Arishta Preparation",
        countryOfOrigin: "India",
        ingredients: [
          { name: "Bilva (Aegle marmelos)", amount: "3.0g/100ml", fdaStatus: "NDI_REQUIRED" },
          { name: "Shyonaka (Oroxylum indicum)", amount: "3.0g/100ml", fdaStatus: "NDI_REQUIRED" },
          { name: "Gambhari (Gmelina arborea)", amount: "3.0g/100ml", fdaStatus: "NDI_REQUIRED" },
          { name: "Dhataki (Woodfordia fruticosa)", amount: "1.6g/100ml", fdaStatus: "NDI_REQUIRED" },
          { name: "Self-Generated Alcohol (fermentation)", amount: "5-10% ABV", fdaStatus: "REQUIRES_TTB_PERMIT" },
          { name: "Sugar / Jaggery", amount: "10.0g/100ml", fdaStatus: "Food Additive" }
        ],
        claims: [
          "Strengthens uterine muscles and treats menstrual irregularities.",
          "Relieves Vata disorders and helps in nerve debility.",
          "Rejuvenates the entire body and builds physical stamina.",
          "Take 15-30ml twice daily after meals."
        ],
        warnings: "Not for use during pregnancy.",
        panelsDetected: ["Front Panel (PDP)", "Ingredients Panel (FSSAI format)"],
        fdaDisclaimerPresent: false
      },
      gapAnalysis: {
        violations: [
          {
            severity: "CRITICAL",
            pillar: "product_classification",
            finding: "Product contains self-generated alcohol at 5–10% ABV from fermentation. Products above 0.5% ABV fall under TTB (Alcohol and Tobacco Tax and Trade Bureau) jurisdiction.",
            citation: "27 CFR Part 1 (TTB Basic Permit Requirements); 27 CFR Part 24 (Wine); TTB Industry Circular 2014-3",
            remediation: "Apply for a TTB Basic Permit as an Importer before shipping. Classify product under TTB wine regulations. Pay required federal excise taxes. Product may also be subject to state alcohol distribution laws in all 50 states."
          },
          {
            severity: "CRITICAL",
            pillar: "labeling_compliance",
            finding: "Disease claims detected: 'treats menstrual irregularities', 'nerve debility' — both are prohibited drug claims.",
            citation: "21 USC §321(g)(1)(B); 21 CFR §310 (Unapproved New Drug)",
            remediation: "Completely reframe: Replace 'treats menstrual irregularities' with 'supports healthy menstrual cycle comfort'. Remove 'nerve debility' entirely and replace with 'supports nervous system wellness'."
          },
          {
            severity: "CRITICAL",
            pillar: "ingredient_safety",
            finding: "All 4 primary botanical ingredients (Bilva, Shyonaka, Gambhari, Dhataki) require New Dietary Ingredient (NDI) notifications as none were commercially marketed in the US before October 15, 1994.",
            citation: "21 CFR §190.6; FDCA §413",
            remediation: "File NDI notifications for all 4 botanical ingredients with FDA ODSP at least 75 days before US market introduction. Each NDI must include safety substantiation and history of use data."
          },
          {
            severity: "HIGH",
            pillar: "labeling_compliance",
            finding: "Missing Alcohol content declaration. US law requires all beverages containing >0.5% ABV to declare alcohol percentage on the label.",
            citation: "27 CFR §4.32 (TTB wine labeling — alcohol content declaration)",
            remediation: "Declare exact alcohol content (e.g. 'Contains 7% alcohol by volume') prominently on the label. Add mandatory government health warning for alcoholic beverages per 27 CFR §16.21."
          }
        ]
      }
    }
  },

  // 4. Regulatory Corpus & Warning Letter Precedents
  enforcementPrecedents: [
    {
      id: "WL-2025-01",
      exporter: "Vedic Life Sciences Pvt Ltd, Mumbai",
      date: "September 14, 2025",
      type: "FDA Warning Letter (CFSAN)",
      violationsCited: [
        "Unapproved New Drug Claims: Labeled products 'Joint Cure' claiming to reduce inflammatory markers of rheumatoid arthritis.",
        "Missing FDA Disclaimer under 21 CFR §101.93(f).",
        "Failure to establish raw material specifications for botanical Identity under 21 CFR §111.75(a)(1)."
      ],
      warningTextSnippet: "...We reviewed your website where you promote and sell 'Arthri-Care Capsules' to consumers in the United States. Your labeling contains claims that establish these products are drugs under section 201(g)(1)(B) of the FD&C Act. Examples include 'helps alleviate painful symptoms of arthritis' and 'reduces swelling in joint tissues'. Introducing these unapproved new drugs into interstate commerce is a violation of the Act..."
    },
    {
      id: "IA-54-15",
      exporter: "General Import Alert (India-Wide)",
      date: "Ongoing (Updated May 2026)",
      type: "FDA Import Alert 54-15 — Detention Without Physical Examination",
      violationsCited: [
        "Adulteration: Presence of heavy metals (Lead, Mercury, Arsenic) in Ayurvedic herbal products.",
        "DWPE listing covers over 140 Indian herbal manufacturers."
      ],
      warningTextSnippet: "...Districts may detain, without physical examination, all Ayurvedic herbal and herbo-mineral products from the manufacturers listed in the Green List of this Import Alert. Analysis of these products has shown significant concentration of elemental impurities including lead up to 25 ppm, mercury up to 10 ppm, and arsenic, which pose a severe public health hazard of chronic toxicity..."
    },
    {
      id: "WL-2024-11",
      exporter: "AyurHerb Exports, Haridwar",
      date: "November 08, 2024",
      type: "FDA 483 Observation & Warning Letter",
      violationsCited: [
        "Failure to conduct at least one appropriate test to verify the identity of a dietary ingredient prior to use.",
        "Reliance on Supplier Certificates of Analysis (CoA) without establishing supplier validation procedures."
      ],
      warningTextSnippet: "...Your firm failed to conduct at least one appropriate test or examination to verify the identity of any dietary ingredient that is a component of a dietary supplement, as required by 21 CFR 111.75(a)(1)(i). Specifically, you accepted supplier Certificates of Analysis for Ashwagandha Powder and Shatavari Root Extract without performing macroscopic, microscopic, or chemical identity tests, and you have not validated your suppliers..."
    },
    {
      id: "WL-2023-07",
      exporter: "NaturalAyur Pvt Ltd, Pune",
      date: "July 22, 2023",
      type: "FDA Warning Letter (CFSAN)",
      violationsCited: [
        "Unsubstantiated 'Clinically Proven' claims on Ashwagandha capsules website.",
        "Missing 21 CFR §101.93 disclaimer adjacent to structure/function claims.",
        "Consumer testimonials on website implying disease treatment outcomes."
      ],
      warningTextSnippet: "...Your website states 'Clinically proven to reduce cortisol by 28%' for your Stress-Away capsules. This claim requires adequate substantiation via competent and reliable scientific evidence. Additionally, consumer testimonials stating 'completely cured my anxiety' establish the product as an unapproved drug under 21 USC §321(g)(1)(B)..."
    },
    {
      id: "WL-2022-03",
      exporter: "HimalayanHerbs Corp, Delhi",
      date: "March 14, 2022",
      type: "FDA Warning Letter (CFSAN)",
      violationsCited: [
        "Product name 'DiabeCare' itself implies treatment of diabetes.",
        "Website claims 'lowers blood sugar by 30%' — a quantified biomarker disease claim.",
        "No NDI notification filed for Gymnema sylvestre extract used in the formula."
      ],
      warningTextSnippet: "...The product name 'DiabeCare', combined with label claims including 'reduces fasting blood glucose' and 'manages insulin resistance', establishes this product as an unapproved new drug. Your firm has not obtained approval for a New Drug Application (NDA) for this product. Furthermore, Gymnema sylvestre extract was not commercially marketed in the US before October 15, 1994; no NDI notification has been received by this office..."
    },
    {
      id: "DWPE-2024-AG",
      exporter: "AgroHerb Exports Ltd, Hyderabad",
      date: "February 05, 2024",
      type: "FDA Import Detention (DWPE)",
      violationsCited: [
        "Lead detected at 18 ppm in Triphala Churna — exceeds FDA/USP action level of 5 ppm.",
        "Product listed on Import Alert 54-15 Green List.",
        "Facility not registered under FSMA Foreign Supplier Verification Program (FSVP)."
      ],
      warningTextSnippet: "...Detained without physical examination per Import Alert 54-15. Laboratory analysis at the Port of Los Angeles revealed lead concentration of 18 ppm in lot TRIP-2024-011, far exceeding the USP <2232> dietary supplement action level. The importing facility has also failed to establish adequate Foreign Supplier Verification Program (FSVP) procedures as required by 21 CFR Part 1, Subpart L. Product is refused admission..."
    },
    {
      id: "WL-2021-09",
      exporter: "VedaOrganics Pvt Ltd, Bengaluru",
      date: "September 03, 2021",
      type: "FDA Warning Letter (CFSAN)",
      violationsCited: [
        "Liquid Asava product imported without TTB Basic Permit (alcohol >0.5% ABV).",
        "Website claims 'detoxifies kidneys and liver' — drug claim under FDCA §201(g).",
        "No FDA facility registration under FSMA Bioterrorism Act prior facility registration."
      ],
      warningTextSnippet: "...Your fermented Asava preparations containing 6–8% ABV alcohol were imported without the required TTB Basic Importer Permit. Additionally, your product website makes claims including 'detoxifies the liver', 'cleanses kidneys of toxins' and 'cures UTI infections' — these are drug claims that require NDA approval under 21 USC §321(g)(1)(B). You must immediately cease distribution of these products in the United States..."
    }
  ],

  // 5. EU & Gulf Market Regulatory Framework
  euGulfRegulations: {
    eu: [
      {
        framework: "EU Novel Food Regulation",
        regulation: "EU 2015/2283",
        applicableTo: ["Shilajit", "Moringa leaf powder", "Ashwagandha (some extract forms)", "Ayurvedic proprietary blends not traditionally consumed in EU"],
        riskLevel: "HIGH",
        summary: "Botanical ingredients not traditionally consumed significantly in the EU before May 15, 1997 require Novel Food authorization from EFSA before commercialization. The authorization process typically takes 18–36 months.",
        actionRequired: "Check EFSA Novel Food Catalogue online. File a Novel Food Application if your ingredient is listed as requiring authorization. Traditional use dossier from a third country can be used as a simplified notification route.",
        keyAuthority: "European Food Safety Authority (EFSA)"
      },
      {
        framework: "EU Health Claims Regulation",
        regulation: "EC 1924/2006",
        applicableTo: ["All nutraceuticals", "Herbal supplements", "Functional foods entering EU market"],
        riskLevel: "HIGH",
        summary: "Only health claims on the EU Register of authorized claims (Article 13 & 14) are permitted on food product labels. Traditional Ayurvedic wellness claims have no EU authorization and must be completely removed.",
        actionRequired: "Cross-reference every product claim against the EFSA EU Register of Authorized Health Claims. All unauthorized claims must be deleted. Do not replace FDA-style structure/function claims with EU-style claims without checking authorization status.",
        keyAuthority: "EFSA / European Commission DG SANTE"
      },
      {
        framework: "EU Maximum Levels for Heavy Metals in Food Supplements",
        regulation: "EC 1881/2006 (as amended by EU 2021/1323)",
        applicableTo: ["All botanical food supplements", "Herbal teas", "Dried botanicals"],
        riskLevel: "CRITICAL",
        summary: "EU maximum levels: Cadmium 3.0 mg/kg, Lead 3.0 mg/kg in food supplements. However, botanical-specific limits are stricter in many categories. These are tighter than Indian API standards.",
        actionRequired: "Test all EU-bound export batches against EU MRL thresholds using ISO 17025 accredited labs. Cadmium is frequently the binding constraint for Ayurvedic herbs grown in certain Indian states. Source from certified low-metal farms.",
        keyAuthority: "EFSA / EU Commission RASFF (Rapid Alert System for Food and Feed)"
      },
      {
        framework: "EU Directive on Traditional Herbal Medicinal Products (THMPD)",
        regulation: "Directive 2004/24/EC",
        applicableTo: ["Traditional medicinal preparations (Churna, Kadha, Bhasma-free formulations)"],
        riskLevel: "MODERATE",
        summary: "Herbal products intended to treat disease may qualify for simplified THMPD registration if they can demonstrate 30 years of traditional use (including 15 years in the EU). This provides a legal marketing route without full clinical trials.",
        actionRequired: "Assess if product qualifies for THMPD route. Requires minimum 30-year traditional use evidence, quality dossier, and registration in each EU member state. Process takes 12–18 months per country.",
        keyAuthority: "European Medicines Agency (EMA) Committee on Herbal Medicinal Products (HMPC)"
      }
    ],
    gulf: [
      {
        framework: "Saudi Food & Drug Authority (SFDA) Food Supplements Registration",
        regulation: "SFDA FoodRegNo/SD/2020",
        applicableTo: ["All dietary/food supplements entering KSA (Saudi Arabia)"],
        riskLevel: "HIGH",
        summary: "All food supplements must be registered with SFDA before import. Registration requires a complete product dossier, CoA from ISO 17025 lab, Arabic bilingual label, and GMP certificate (WHO-GMP or equivalent).",
        actionRequired: "Submit SFDA registration via the Saudi Arabia GS1 registry portal. Expect 3–6 month processing time. Arabic label is mandatory. Registration is valid for 5 years. Renewal must start 6 months before expiry.",
        keyAuthority: "Saudi Food & Drug Authority (SFDA)"
      },
      {
        framework: "UAE Ministry of Health — Health Products Registration",
        regulation: "UAE MoHAP Health Products Regulation 2021",
        applicableTo: ["Vitamins", "Minerals", "Herbal supplements entering UAE and wider GCC"],
        riskLevel: "MODERATE",
        summary: "Supplements must be registered with UAE MoHAP before import/sale. Products containing any alcohol (including Asava/Arishta preparations >0.5% ABV) face strict restrictions under UAE federal law.",
        actionRequired: "Register via UAE MoHAP online portal. Ensure Halal certification from an ESMA-recognized body. Strictly avoid all alcohol-containing formulations for UAE/GCC markets. Certificate of Free Sale from Indian authority (FSSAI/AYUSH) is required.",
        keyAuthority: "UAE Ministry of Health & Prevention (MoHAP)"
      },
      {
        framework: "GCC Halal Standards for Food Supplements",
        regulation: "GSO 2055-1:2021 (GCC Halal Standard for Food)",
        applicableTo: ["All nutraceuticals and herbals entering GCC countries (UAE, KSA, Kuwait, Bahrain, Oman, Qatar)"],
        riskLevel: "HIGH",
        summary: "All supplements must be Halal-certified by a recognized Halal certification body. Any ingredient of animal origin (gelatin capsule shells, magnesium stearate from pork-derived stearic acid) must be from Halal-slaughtered animals or replaced with plant-based alternatives.",
        actionRequired: "Switch all capsule shells to HPMC (Hydroxypropyl Methylcellulose — vegetarian). Verify all excipients (stearates, gelatin) are plant-based or Halal-certified bovine. Obtain Halal certificate from ESMA, SASO, or JAKIM. Display recognized Halal mark prominently on packaging.",
        keyAuthority: "Emirates Authority for Standardization (ESMA); SASO (Saudi Arabia); JAKIM (Malaysia — widely accepted)"
      },
      {
        framework: "India Export Requirements (Pre-Export Checklist)",
        regulation: "AYUSH Export Policy 2023 / FSSAI / APEDA",
        applicableTo: ["All Indian exporters of nutraceuticals, Ayurvedic products, and agri-value-added goods"],
        riskLevel: "MODERATE",
        summary: "Before targeting any export market, Indian exporters must complete domestic registrations: FSSAI Central License (for food/supplement exports), AYUSH Premium Mark or AYUSH GMP Certificate (for Ayurvedic products), APEDA Registration (for agri-product exporters), and IEC (Importer Exporter Code) from DGFT.",
        actionRequired: "1. Obtain FSSAI Central License (mandatory for export). 2. Register with APEDA if exporting agri-value-added products. 3. Get AYUSH GMP Certificate for Ayurvedic formulations. 4. Obtain IEC Code from DGFT. 5. Get a Certificate of Free Sale (CFS) from FSSAI or State Licensing Authority — required by almost all importing countries.",
        keyAuthority: "FSSAI (Food Safety and Standards Authority of India); AYUSH Ministry; APEDA (Agricultural and Processed Food Products Export Development Authority); DGFT (Directorate General of Foreign Trade)"
      }
    ]
  },

  // Per-country regulatory frameworks for the Market Regulations selector.
  // EU and GULF reuse euGulfRegulations above; US / UK / NZ are defined here.
  usRegulations: [
    {
      framework: "FDA Dietary Supplement Classification & DSHEA",
      regulation: "21 USC §321(g)(1); 21 CFR §101.93",
      applicableTo: ["All Ayurvedic churnas, vatis, and herbal supplements", "Any product bearing wellness or disease claims"],
      riskLevel: "CRITICAL",
      summary: "A product intended to diagnose, treat, cure, or prevent disease is regulated as an unapproved new drug — regardless of botanical origin. Only structure/function claims with the mandatory DSHEA disclaimer are permitted on a dietary supplement.",
      actionRequired: "Remove all disease/treatment claims. Reframe into lawful structure/function language and add the DSHEA disclaimer: 'This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.'",
      keyAuthority: "US FDA — Center for Food Safety and Applied Nutrition (CFSAN)"
    },
    {
      framework: "New Dietary Ingredient (NDI) Notification",
      regulation: "21 USC §350b; 21 CFR §190.6",
      applicableTo: ["Botanicals not marketed in the US before Oct 15, 1994", "Concentrated/standardized novel extracts"],
      riskLevel: "HIGH",
      summary: "Ingredients without documented pre-1994 US marketing history require an NDI notification to FDA with safety substantiation at least 75 days before marketing.",
      actionRequired: "Establish grandfathered (pre-1994) status with evidence, or file an NDI notification with safety data 75 days before launch.",
      keyAuthority: "US FDA — Office of Dietary Supplement Programs"
    },
    {
      framework: "Heavy Metals & Import Alert 54-15 (DWPE)",
      regulation: "USP <2232>; FDA Import Alert 54-15",
      applicableTo: ["All Ayurvedic churnas and mineral-containing formulations"],
      riskLevel: "CRITICAL",
      summary: "Ayurvedic products are a primary target for Detention Without Physical Examination for lead, arsenic, and mercury. USP <2232> limits: Lead 5 ppm, Arsenic 1.5 ppm, Mercury 1 ppm, Cadmium 0.3 ppm.",
      actionRequired: "Obtain lot-specific ICP-MS heavy-metal testing from an ISO 17025 lab; retain CoAs to rebut DWPE detention at the border.",
      keyAuthority: "US FDA — Division of Import Operations"
    },
    {
      framework: "cGMP for Dietary Supplements",
      regulation: "21 CFR Part 111",
      applicableTo: ["All finished dietary supplement products"],
      riskLevel: "HIGH",
      summary: "Requires a Master Manufacturing Record, batch records, ingredient identity testing, finished-product specifications, and documented independent QC release for each lot.",
      actionRequired: "Generate and retain an MMR, batch production records, identity test methods/results, and written specifications with independent QC sign-off.",
      keyAuthority: "US FDA (21 CFR §111.70, §111.75, §111.123, §111.255)"
    },
    {
      framework: "California Proposition 65",
      regulation: "Cal. Health & Safety Code §25249.6; 27 CCR §25705",
      applicableTo: ["Products sold into California"],
      riskLevel: "MODERATE",
      summary: "Lead exposure above the 0.5 µg/day safe-harbor threshold triggers a mandatory Prop 65 warning for California distribution.",
      actionRequired: "Confirm lead exposure is below 0.5 µg/day via testing; if not, apply the compliant Prop 65 warning label.",
      keyAuthority: "California OEHHA (Office of Environmental Health Hazard Assessment)"
    }
  ],

  ukRegulations: [
    {
      framework: "GB Food Supplements Regulations",
      regulation: "The Food Supplements (England) Regulations 2003 (+ devolved equivalents)",
      applicableTo: ["Food-type Ayurvedic supplements sold in England, Wales, Scotland"],
      riskLevel: "HIGH",
      summary: "Post-Brexit, Great Britain runs its OWN regime — EU approvals do NOT carry over. Supplements are governed by the assimilated Food Supplements Regulations 2003. Northern Ireland still follows EU rules under the Windsor Framework.",
      actionRequired: "Comply with GB food-supplement labelling and composition rules; do not assume an EU authorisation is valid in GB. Assess GB-vs-NI routing separately.",
      keyAuthority: "Food Standards Agency (FSA) / Food Standards Scotland"
    },
    {
      framework: "MHRA Traditional Herbal Registration (THR)",
      regulation: "Human Medicines Regulations 2012",
      applicableTo: ["Herbal products bearing any medicinal/therapeutic claim"],
      riskLevel: "HIGH",
      summary: "A product presented for treating disease is a medicine in the UK and requires MHRA registration. The Traditional Herbal Registration scheme is the route for traditional herbal medicines (30 years' traditional use, 15 in the EU/UK).",
      actionRequired: "Either strip all medicinal claims and market as a food supplement, or pursue MHRA THR registration for the herbal product.",
      keyAuthority: "Medicines and Healthcare products Regulatory Agency (MHRA)"
    },
    {
      framework: "GB Novel Food Authorisation",
      regulation: "Assimilated Regulation (EU) 2015/2283 (GB)",
      applicableTo: ["Botanicals without significant GB/EU consumption history before 15 May 1997"],
      riskLevel: "HIGH",
      summary: "Great Britain operates a SEPARATE novel food authorisation via the FSA. An EU novel food authorisation is not automatically recognised in GB — a distinct GB application is required.",
      actionRequired: "Check the GB novel food status of each botanical; file a separate GB application via the FSA where required.",
      keyAuthority: "Food Standards Agency (FSA) — Novel Foods"
    },
    {
      framework: "GB Contaminants & Health Claims",
      regulation: "Assimilated Reg (EC) 1881/2006; assimilated Reg (EC) 1924/2006",
      applicableTo: ["All botanical supplements marketed in GB"],
      riskLevel: "CRITICAL",
      summary: "Heavy-metal limits follow assimilated Regulation 1881/2006. Only claims on the GB Nutrition & Health Claims Register are permitted; no disease treatment/prevention claims on foods.",
      actionRequired: "Test against GB contaminant limits; cross-check every claim against the GB register and remove unauthorised claims.",
      keyAuthority: "Food Standards Agency (FSA)"
    },
    {
      framework: "GB Labelling & Responsible Business Operator",
      regulation: "Food Information Regulations 2014 (+ assimilated 1169/2011)",
      applicableTo: ["All prepacked supplements sold in GB"],
      riskLevel: "MODERATE",
      summary: "Mandatory allergen declaration, legibility, and a UK/GB-based responsible food business operator address are required post-Brexit.",
      actionRequired: "Add a GB-based FBO address; ensure allergen and mandatory particulars comply with FIR 2014.",
      keyAuthority: "Food Standards Agency (FSA) / local Trading Standards"
    }
  ],

  nzRegulations: [
    {
      framework: "NZ Dietary Supplements Regulations",
      regulation: "Dietary Supplements Regulations 1985",
      applicableTo: ["Food-type Ayurvedic supplements entering New Zealand"],
      riskLevel: "HIGH",
      summary: "Food-type supplements are governed by the Dietary Supplements Regulations 1985, currently transitioning under the Natural Health and Supplementary Products regime / Therapeutic Products Act 2023.",
      actionRequired: "Comply with the Dietary Supplements Regulations 1985 composition and labelling rules; monitor the transition to the new regime.",
      keyAuthority: "NZ Ministry for Primary Industries (MPI)"
    },
    {
      framework: "Therapeutic Products Act 2023 (Medsafe)",
      regulation: "Therapeutic Products Act 2023 (prev. Medicines Act 1981)",
      applicableTo: ["Any product bearing a therapeutic (treat/prevent/cure) claim"],
      riskLevel: "HIGH",
      summary: "A therapeutic claim moves the product into the therapeutic-product category regulated by Medsafe — it cannot be sold on a dietary-supplement basis.",
      actionRequired: "Remove therapeutic claims to remain a dietary supplement, or pursue Medsafe therapeutic-product regulation.",
      keyAuthority: "Medsafe — NZ Medicines and Medical Devices Safety Authority"
    },
    {
      framework: "FSANZ Food Standards Code — Contaminants",
      regulation: "Australia NZ Food Standards Code, Standard 1.4.1",
      applicableTo: ["All botanical supplements and food-type products"],
      riskLevel: "CRITICAL",
      summary: "Heavy-metal and natural-toxicant limits are set by Standard 1.4.1 (Contaminants and Natural Toxicants).",
      actionRequired: "Test export batches against Standard 1.4.1 limits using accredited labs; retain CoAs.",
      keyAuthority: "Food Standards Australia New Zealand (FSANZ)"
    },
    {
      framework: "Nutrition & Health Claims",
      regulation: "Australia NZ Food Standards Code, Standard 1.2.7",
      applicableTo: ["All food-type supplements making health claims"],
      riskLevel: "MODERATE",
      summary: "Only permitted or self-substantiated food-health relationships are allowed; therapeutic claims are not permitted on a food/supplement basis.",
      actionRequired: "Restrict claims to permitted/self-substantiated relationships under Standard 1.2.7; document substantiation.",
      keyAuthority: "Food Standards Australia New Zealand (FSANZ)"
    },
    {
      framework: "Labelling & Country of Origin",
      regulation: "Australia NZ Food Standards Code, Standard 1.2.x",
      applicableTo: ["All prepacked supplements sold in NZ"],
      riskLevel: "MODERATE",
      summary: "Mandatory allergen declaration, nutrition information panel, and country-of-origin labelling apply.",
      actionRequired: "Ensure allergen declaration, NIP, and country-of-origin statements comply with the Food Standards Code.",
      keyAuthority: "NZ Ministry for Primary Industries (MPI)"
    }
  ]
};

// Expose database globally for index.html / app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = COMPLIANCE_DATABASE;
} else {
  window.COMPLIANCE_DATABASE = COMPLIANCE_DATABASE;
}
