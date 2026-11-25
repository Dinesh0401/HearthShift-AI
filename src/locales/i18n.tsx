'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta';

export const translations = {
  en: {
    appName: 'HearthShift AI',
    appSubtitle: 'Privacy-First Home Energy Intelligence',
    appDescription: 'Decision-Aware, Privacy-Minimal Household Assistant · 100% Local IndexedDB Processing',
    privacyBadge: '100% On-Device · Zero External Telemetry · IndexedDB',
    offlineStatus: 'Local Execution Safe',

    // Region & Tariff Selector
    selectTariffRegion: 'Supported Tariff Region & Schedule',
    supportedRegionsNote: 'Supported schedules: Tamil Nadu TNPDCL LT-1A (May 2026, 2025–2026, 2024–2025 ref) plus illustrative India Flat and Pilot Time-of-Use references. Other states/utilities are not yet modeled.',
    tariffVerificationNote: 'Verify against your printed utility receipt before acting: statutory slabs, mid-cycle proration, fixed charges, and welfare eligibility rules may change by regulatory order.',

    // Safe Demo Mode
    loadDemoBtn: 'Load Safe Demo Dataset (Synthetic)',
    clearDemoBtn: 'Exit & Clear Demo Data',
    demoModeBannerTitle: 'SYNTHETIC DEMO MODE — Simulated Sample Household (Not Real Utility Data)',
    demoModeBannerDesc: 'Displaying 3 synthetic bi-monthly bills (445 / 492 / 508 kWh) and 192 hourly intervals (8 days) for exploration. Savings ledger remains empty so zero fake actual savings are invented.',

    // Alpha Disclaimer & Public Alpha Presentation
    alphaDisclaimerTitle: 'Experimental Research Alpha — Advisory Models Only',
    alphaDisclaimerDesc: 'HearthShift AI is an experimental research alpha. Outputs are modeled estimates—not utility-certified billing statements, guaranteed physical savings, or IPMVP Option C verified outcomes. It does not automate or control physical appliances.',
    howItWorksTitle: 'How HearthShift Works · Local-First & Mode-Gated Decisions',
    howItWorksStep1: '1. Ingest on-device: Enter utility bills (or optional CSV smart-meter logs). Raw data remains strictly inside your browser IndexedDB.',
    howItWorksStep2: '2. Capability gating: Bills-only mode tracks deterministic slab headroom and avoids fabricating intra-day schedules. Importing interval logs unlocks TR-VOI modeling.',
    howItWorksStep3: '3. Conservative bounds & provenance: Actions show modeled expected INR vs 5th-percentile bounds (Q0.05) and separate Simulated, User-Reported, Meter-Observed, and formal M&V records.',
    howItWorksBoundaries: 'Note: manifest.json provides metadata only—Service Worker offline page caching is not implemented yet in v0.1.0-alpha.',
    openChangelogBtn: 'v0.1.0-alpha Changelog',
    changelogTitle: 'Release Changelog & Known Scope',
    changelogSubtitle: 'HearthShift AI Public Alpha Release Notes',
    openFeedbackBtn: 'Alpha Feedback (Zero-Telemetry)',
    feedbackModalTitle: 'Send Alpha Feedback (Zero Household Data)',
    feedbackPrivacyBanner: 'Privacy Lock: This draft generator NEVER reads IndexedDB bills, interval CSVs, or consumer references. Nothing is sent automatically over the network.',
    feedbackCategoryLabel: 'Feedback Topic',
    feedbackNotesPlaceholder: 'Describe clarity issues, tariff requests, or UI bugs (never enter meter/account numbers)...',
    feedbackPreviewLabel: 'Scrubbed JSON Draft Preview (0 Household Records Included)',
    feedbackCopyBtn: 'Copy Scrubbed Draft',
    feedbackCopiedMsg: 'Draft Copied!',
    feedbackDownloadBtn: 'Download Draft (.json)',
    feedbackExternalLabel: 'External submission is strictly manual: copying or downloading stays local. Only clicking Open GitHub Issue opens github.com with this previewed draft.',
    feedbackGithubBtn: 'Open GitHub Issue',
    closeModalBtn: 'Close',

    // Tabs
    tabBills: '📋 Bills & Slab Analysis',
    tabImport: '📥 Smart Meter CSV Import',
    tabIntervals: '📈 Load Curves & Intervals',
    tabSimulator: '🎮 Scenario Simulator',
    tabRecommendations: '💡 Smart Recommendations',
    tabSavings: '📊 Savings Ledger',
    tabPrivacy: '🛡️ Privacy & Storage',

    // Headroom Card
    activeTariff: 'Active Tariff Plan',
    tariffDescription: 'Tamil Nadu Domestic LT-1A (Bi-monthly)',
    currentCycleUnits: 'Current Cycle Consumption',
    subsidyStatus: '200 Free Units Subsidy (GoTN Scheme, Effective May 10, 2026)',
    subsidyEligibility: 'Eligible for 200 free units when consumption ≤ 500 units bi-monthly',
    cliffWarningTitle: 'CRITICAL TARIFF CLIFF DETECTED',
    cliffWarningText: 'Consuming 501 units instead of 500 units abruptly disqualifies your household from the 200 free units subsidy, jumping your bill by ₹478.40 (₹1,570.00 → ₹2,048.40) for just ONE single extra unit!',
    safeHeadroom: 'Safe Slab Headroom',
    unitsRemaining: 'units remaining before ₹478.40 subsidy cliff',

    // Capabilities
    capabilityStatus: 'System Capability Status',

    // Bill Form
    addBillTitle: 'Manual Electricity Bill Entry',
    addBillSubtitle: 'Enter historical utility bills from your TANGEDCO/TNPDCL receipt. Processed strictly on-device.',
    periodStart: 'Billing Period Start',
    periodEnd: 'Billing Period End',
    unitsBilled: 'Total Units (kWh)',
    amountBilled: 'Billed Amount (₹) (Optional)',
    tariffSelection: 'Tariff Schedule',
    saveBillBtn: 'Save Bill Locally',
    billSavedSuccess: 'Bill successfully recorded to local IndexedDB.',

    // Bill Table
    historyTitle: 'Historical Electricity Bills & Deterministic Breakdown',
    noBillsYet: 'No electricity bills recorded yet. Add a bill above to track your bi-monthly expenditure and slab headroom.',
    colPeriod: 'Billing Period',
    colUnits: 'Units (kWh)',
    colGross: 'Gross Charges',
    colSubsidy: 'GoTN Subsidy',
    colDuty: 'Duty (paise/kWh)',
    colNet: 'Net Payable',
    colActions: 'Actions',
    deleteBtn: 'Delete',

    // Interval Chart
    intervalChartTitle: 'Empirical Interval Load Profile',
    intervalChartSubtitle: 'Interval-by-interval power and energy consumption visualization.',
    intervalDisabledTitle: 'Interval Time-Series Chart Gated (Basic Mode)',
    intervalDisabledMsg: 'Aggregated monthly/bi-monthly utility bills contain zero physical information about intra-day timing. In accordance with HearthShift AI scientific integrity principles, synthetic hourly curves are strictly forbidden. Import a smart-meter CSV file to unlock empirical time-series load analysis.',
    totalReadingsCount: 'Validated interval readings stored:',
    totalEnergyIntegrated: 'Total energy integrated:',
    timeAxis: 'Timestamp',
    energyAxis: 'Energy (kWh)',
    powerAxis: 'Active Power (W)',

    // Privacy & Storage Limitations
    privacyTitle: 'Privacy-First Architecture & Data Sovereign Controls',
    privacyDescription: 'Every byte of your household energy data is stored strictly in your browser IndexedDB. No cloud accounts, no remote database synchronization, and no third-party telemetry.',
    storageLimitationsTitle: 'Browser Storage Limitations & Device Risks',
    storageLimitationsDesc: 'Your records live exclusively in local browser IndexedDB: (1) browsers may evict site data under severe disk pressure unless granted persistent storage; (2) Private/Incognito sessions wipe IndexedDB when closed; (3) local records and JSON exports are stored unencrypted at rest—avoid shared or untrusted devices unless you purge data afterward.',
    exportBtn: 'Export All Data (JSON)',
    exportDesc: 'Download your full IndexedDB database in human-readable JSON format for audit or backup.',
    deleteBtnTitle: 'Delete All My Data',
    deleteBtnDesc: 'Permanently purge all stored bills, interval readings, and preferences from IndexedDB.',
    deleteConfirmMsg: 'Are you sure you want to delete all local energy data? This cannot be undone.',
    deleteSuccessMsg: 'All household data was permanently wiped from IndexedDB.',
    networkAuditTitle: 'Telemetry & Network Audit',
    networkAuditPassing: 'Verified: 0 external telemetry requests made. All calculations executed via local browser JavaScript / TypeScript runtime in IndexedDB.',

    // Simulator
    simulatorTitle: 'Interactive Counterfactual Scenario Simulator',
    simulatorSubtitle: 'Test how adjusting your thermostat, curtailing runtime, or eliminating standby changes your modeled bill.',
    baselineConsumption: 'Baseline Consumption',
    counterfactualConsumption: 'Counterfactual Consumption',
    totalUnitsSaved: 'Units Reduced',
    estimatedSavings: 'Modeled Net Savings',
    baselineBill: 'Baseline Bill',
    proposedBill: 'Proposed Bill',
    acThermostat: 'AC Thermostat Adjustment',
    acRuntimeCurtail: 'Curtail AC Runtime by 1h Daily',
    waterHeaterTimer: 'Trim Water Heater Duration (15-20m)',
    standbyPower: 'Eliminate Entertainment Center Standby',
    laundryShift: 'Shift Laundry to Morning (Non-TOU note: zero direct savings)',
    laundryShiftTou: 'Shift Laundry from Evening Peak (19:00) to Morning Off-Peak (07:00)',
    cliffAvoidedAlert: 'TARIFF CLIFF JUMP AVOIDED! Eligibility Threshold Protected!',
    assumptionsTitle: 'Explicit Model Assumptions',

    // Recommendations
    recommendationsTitle: 'SPARE-HEM Decision-Aware Recommendations',
    recommendationsSubtitle: 'Conservative, chance-constrained modeled recommendations evaluated under your selected tariff.',
    noRecommendations: 'No active recommendations available. The algorithm abstained to protect against comfort violations or insufficient modeled savings.',
    abstentionTitle: 'Conservative Abstention Active',
    abstentionReason: 'TR-VOI evaluated candidate actions and determined that none meet the modeled ₹30.00 benefit hurdle while preserving the 95% modeled comfort bound under consumption volatility.',
    modeledEstimateBadge: 'Modeled Estimate',
    conservativeLowerBoundBadge: '95% Modeled Comfort Bound',
    expectedSavingsLabel: 'Modeled Expected Savings',
    lowerBoundLabel: 'Conservative Model Lower Bound (5th %ile)',
    effortLabel: 'Effort Required',
    feedbackUseful: '👍 Useful',
    feedbackImpractical: '👎 Impractical',
    feedbackTriedIt: '⭐ Tried It!',
    feedbackRecorded: 'Feedback recorded locally. Local preferences updated.',
    actionCompleted: 'Action logged as unverified user-reported entry in Savings Ledger.',
    provenanceSimulated: 'Simulated',
    provenanceUserReported: 'User Reported',
    provenanceMeterObserved: 'Meter Observed',
    provenanceMeasurementVerified: 'Measurement Verified',
    provenanceMeterVerified: 'Meter Verified',

    // Adaptive Question
    adaptiveQuestionTitle: 'Single-Question Preference Check',
    adaptiveQuestionSubtitle: 'Answering this single question reduces preference uncertainty under the modeled EVSI decision gate.',
    btnFlexible: 'Yes / Comfortable',
    btnSensitive: 'No / Inflexible',
    btnSkip: 'Skip for now',

    // Savings Ledger
    savingsLedgerTitle: 'Savings Evidence Ledger',
    savingsLedgerSubtitle: 'Track logged household actions with explicit 4-tier provenance; formal whole-facility M&V is not yet IPMVP-certified.',
    totalVerifiedSavings: 'Formally M&V-Verified Savings',
    trackedSavingsImpact: 'Tracked Modeled & Reported Impact',
    totalCompletedActions: 'Logged Efficiency Actions',
    verifiedSavingsBreakdown: 'Measurement Verified (Formal M&V Req.)',
    estimatedSavingsBreakdown: 'Estimated / User Reported',
    meterObservedBreakdown: 'Meter Observed',
    breakdownVerifiedSubtitle: 'Requires whole-facility M&V & baseline controls (Not IPMVP-certified)',
    breakdownEstimatedSubtitle: 'Simulated models, self-reported actions & unadjusted meter observations',
    mvRequiredNote: 'Requires whole-facility M&V & baseline controls (Not IPMVP-certified)',
    counterfactualNoticeTitle: '4-State Savings Provenance & M&V Scope (Not IPMVP-Certified)',
    counterfactualNotice: '"User Reported" and "Meter Observed" entries are unadjusted observations, not verified causal savings. Formal Measurement Verification requires an approved whole-facility M&V plan, multi-cycle baseline horizon, routine (weather/CDD) + non-routine (occupancy/appliance) adjustments, and uncertainty bounds — this alpha tool is not yet IPMVP Option C certified.',
    noSavingsYet: 'No completed actions logged yet. When you click "Tried It" on a recommendation, it will be tracked here as unverified user-reported activity.',
    recordDate: 'Recorded Date',
    recordAction: 'Action Adopted',
    recordSavings: 'Modeled / Logged Impact',
    recordBasis: 'Verification Basis',
    counterfactualMethod: 'Method',
    uncertaintyBound: 'Uncertainty',
  },
  ta: {
    appName: 'ஹார்த்ஷிஃப்ட் AI (HearthShift)',
    appSubtitle: 'தனிநபர் அந்தரங்க-பாதுகாப்பு வீட்டு மின்சார நுண்ணறிவு',
    appDescription: 'முடிவு-அடிப்படையிலான, குறைவான தகவல் கேட்கும் மின்சார உதவியாளர் · 100% உள்ளூர் IndexedDB இயக்கம்',
    privacyBadge: '100% உங்கள் சாதனத்தில் மட்டும் · வெளி சேவையகங்களுக்கு தகவல் செல்லாது · IndexedDB',
    offlineStatus: 'உள்ளூர் உலாவி இயக்கம்',

    // Region & Tariff Selector
    selectTariffRegion: 'ஆதரிக்கப்படும் மின்கட்டண பகுதி & அட்டவணை',
    supportedRegionsNote: 'ஆதரிக்கப்படும் அட்டவணைகள்: தமிழ்நாடு TNPDCL LT-1A (மே 2026, 2025–2026, 2024–2025) மற்றும் பொது நிலையான / நேர-அடிப்படை (TOU) மாதிரிகள். பிற மாநில மின்வாரியங்கள் இன்னும் இணைக்கப்படவில்லை.',
    tariffVerificationNote: 'செயல்படும் முன் உங்கள் அச்சிடப்பட்ட மின்கட்டண ரசீதைச் சரிபார்க்கவும்: அரசு ஆணைகளுக்கு ஏற்ப அடுக்கு கட்டணம் மற்றும் மானிய விதிகள் மாறக்கூடும்.',

    // Safe Demo Mode
    loadDemoBtn: 'மாதிரி சோதனைத் தரவை ஏற்றுக (செயற்கை)',
    clearDemoBtn: 'வெளியேறி மாதிரித் தரவை அழி',
    demoModeBannerTitle: 'செயற்கை மாதிரி முறைமை — உருவகப்படுத்தப்பட்ட மாதிரி வீடு (உண்மையான மின் தரவு அல்ல)',
    demoModeBannerDesc: 'ஆய்விற்காக 3 செயற்கை இரு-மாத பில்கள் (445 / 492 / 508 kWh) மற்றும் 192 மணிநேர அளவீடுகள் (8 நாட்கள்) காட்டப்படுகின்றன. போலியான சேமிப்பைத் தவிர்க்க சேமிப்புப் பதிவேடு காலியாக உள்ளது.',

    // Alpha Disclaimer & Public Alpha Presentation
    alphaDisclaimerTitle: 'சோதனை ஆய்வு ஆல்ஃபா பதிப்பு — ஆலோசனை மாதிரிகள் மட்டுமே',
    alphaDisclaimerDesc: 'HearthShift AI ஒரு சோதனை ஆய்வு ஆல்ஃபா பதிப்பாகும். இதன் முடிவுகள் மாதிரி மதிப்பீடுகள் மட்டுமே—உறுதியளிக்கப்பட்ட சேமிப்பு அல்லது IPMVP Option C சான்றளிக்கப்பட்ட அளவீடுகள் அல்ல. சாதனங்களைத் தானாகக் கட்டுப்படுத்தாது.',
    howItWorksTitle: 'HearthShift செயல்படும் விதம் · உள்ளூர் & சான்று-அடிப்படை முடிவுகள்',
    howItWorksStep1: '1. சாதனத்திற்குள் தரவு: மின்கட்டண பில் (அல்லது CSV) தரவை உள்ளிடுங்கள். அனைத்துத் தரவும் உங்கள் உலாவி IndexedDB-யிலேயே இருக்கும்.',
    howItWorksStep2: '2. திறன் கட்டுப்பாடு: பில் தரவு மட்டும் உள்ளபோது அடுக்கு எல்லை கண்காணிக்கப்படும்; நேர அட்டவணைகள் போலியாகக் கணிக்கப்படாது.',
    howItWorksStep3: '3. பாதுகாப்பான வரம்புகள்: பரிந்துரைகள் மாதிரி சேமிப்பையும் 5% குறைந்தபட்ச வரம்பையும் (Q0.05) சான்று வகைகளையும் தனித்தனியாகக் காட்டுகின்றன.',
    howItWorksBoundaries: 'குறிப்பு: manifest.json மெட்டாடேட்டா மட்டுமே—Service Worker ஆஃப்லைன் கேச்சிங் v0.1.0-alpha-வில் இன்னும் இல்லை.',
    openChangelogBtn: 'v0.1.0-alpha மாற்றப் பதிவேடு',
    changelogTitle: 'வெளியீட்டு வரலாறு & வரம்புகள்',
    changelogSubtitle: 'HearthShift AI பொது ஆல்ஃபா குறிப்புகள்',
    openFeedbackBtn: 'ஆல்ஃபா கருத்து (தரவு அனுப்பாது)',
    feedbackModalTitle: 'ஆல்ஃபா கருத்துப் படிவம் (தனிநபர் தரவு இன்றி)',
    feedbackPrivacyBanner: 'அந்தரங்கப் பாதுகாப்பு: இந்தப் படிவம் உங்கள் IndexedDB கட்டணங்கள் அல்லது ஸ்மார்ட் மீட்டர் அளவீடுகளைப் படிக்காது. தானாக எதுவும் இணையத்தில் அனுப்பப்படாது.',
    feedbackCategoryLabel: 'கருத்து வகை',
    feedbackNotesPlaceholder: 'கருத்துகள் அல்லது பிழைகளை இங்கே எழுதவும் (கணக்கு எண் வேண்டாம்)...',
    feedbackPreviewLabel: 'தணிக்கை செய்யப்பட்ட JSON மாதிரி (0 வீட்டுப் பதிவுகள்)',
    feedbackCopyBtn: 'நகலெடு (Copy)',
    feedbackCopiedMsg: 'நகலெடுக்கப்பட்டது!',
    feedbackDownloadBtn: 'பதிவிறக்கு (.json)',
    feedbackExternalLabel: 'அனுப்புவது முற்றிலும் உங்கள் விருப்பம் மட்டுமே: நகலெடுத்தல்/பதிவிறக்கம் உள்ளூரிலேயே நிகழும்.',
    feedbackGithubBtn: 'GitHub Issue திறக்க',
    closeModalBtn: 'மூடு',

    // Tabs
    tabBills: '📋 மின்கட்டணங்கள் & அடுக்கு ஆய்வு',
    tabImport: '📥 ஸ்மார்ட் மீட்டர் CSV பதிவேற்றம்',
    tabIntervals: '📈 பயன்பாட்டு வளைவு & கால இடைவெளி',
    tabSimulator: '🎮 பயன்பாட்டு மாதிரி உருவகப்படுத்துதல்',
    tabRecommendations: '💡 நுண்ணறிவு பரிந்துரைகள்',
    tabSavings: '📊 சேமிப்பு விவரப் பதிவேடு',
    tabPrivacy: '🛡️ அந்தரங்கம் & தரவு மேலாண்மை',

    // Headroom Card
    activeTariff: 'செயலில் உள்ள மின்கட்டண திட்டம்',
    tariffDescription: 'தமிழ்நாடு வீட்டு உபயோகம் LT-1A (இரு மாத கட்டணம்)',
    currentCycleUnits: 'நடப்பு சுழற்சி நுகர்வு',
    subsidyStatus: '200 இலவச யூனிட் மானியம் (தமிழக அரசு திட்டம், அமல்: மே 10, 2026)',
    subsidyEligibility: 'இரு மாத நுகர்வு 500 யூனிட்டுகளுக்குள் இருந்தால் 200 யூனிட்டுகள் முற்றிலும் இலவசம்',
    cliffWarningTitle: 'முக்கிய கட்டண எல்லை எச்சரிக்கை (Subsidy Cliff)',
    cliffWarningText: '500 யூனிட்டுக்கு பதிலாக 501 யூனிட் பயன்படுத்தினால், 200 இலவச யூனிட் மானியம் ரத்தாகி, ஒரே ஒரு கூடுதல் யூனிட்டுக்காக கட்டணம் ₹478.40 உயரும் (₹1,570.00 → ₹2,048.40)!',
    safeHeadroom: 'பாதுகாப்பான பயன்பாட்டு இடைவெளி',
    unitsRemaining: 'யூனிட்டுகள் ₹478.40 கட்டண உயர்வுக்கு முன் மீதமுள்ளன',

    // Capabilities
    capabilityStatus: 'கணினி திறன் நிலை',

    // Bill Form
    addBillTitle: 'மின்சார கட்டண கைமுறை உள்ளீடு',
    addBillSubtitle: 'உங்கள் TANGEDCO/TNPDCL மின்கட்டண ரசீதை உள்ளிடுங்கள். முற்றிலும் உங்கள் சாதனத்திலேயே சேமிக்கப்படும்.',
    periodStart: 'கட்டண கால தொடக்கம்',
    periodEnd: 'கட்டண கால முடிவு',
    unitsBilled: 'மொத்த யூனிட்கள் (kWh)',
    amountBilled: 'செலுத்திய தொகை (₹) (விருப்பம்)',
    tariffSelection: 'கட்டண அட்டவணை',
    saveBillBtn: 'உள்ளூரில் சேமி',
    billSavedSuccess: 'மின்கட்டண விவரம் உங்கள் கணினியின் IndexedDB-யில் வெற்றிகரமாக சேமிக்கப்பட்டது.',

    // Bill Table
    historyTitle: 'முந்தைய மின்கட்டணங்கள் & துல்லிய விவரம்',
    noBillsYet: 'இதுவரை மின்கட்டணங்கள் சேமிக்கப்படவில்லை. உங்கள் இரு மாத நுகர்வை அறிய மேலே கட்டணத்தை சேர்க்கவும்.',
    colPeriod: 'கட்டண காலம்',
    colUnits: 'யூனிட்கள் (kWh)',
    colGross: 'மொத்த கட்டணம்',
    colSubsidy: 'தமிழக அரசு மானியம்',
    colDuty: 'மின்வரி (பைசா/kWh)',
    colNet: 'செலுத்த வேண்டிய நிகரத் தொகை',
    colActions: 'செயல்கள்',
    deleteBtn: 'நீக்கு',

    // Interval Chart
    intervalChartTitle: 'உண்மையான கால இடைவெளி பயன்பாட்டு வரைபடம்',
    intervalChartSubtitle: 'ஒவ்வொரு நேர இடைவெளியின் மின்திறன் மற்றும் ஆற்றல் பயன்பாடு.',
    intervalDisabledTitle: 'கால இடைவெளி வரைபடம் முடக்கப்பட்டுள்ளது (அடிப்படை முறைமை)',
    intervalDisabledMsg: 'மாதாந்திர/இரு மாத கட்டண மொத்த யூனிட்டுகளில் பகலில் எந்த நேரத்தில் மின்சாரம் பயன்படுத்தப்பட்டது என்ற தகவல் இருக்காது. ஹார்த்ஷிஃப்ட் AI அறிவியல் நேர்மை விதிகளின்படி போலியான வரைபடங்கள் உருவாக்கப்படாது. ஸ்மார்ட் மீட்டர் CSV-ஐ பதிவேற்றி உண்மையான வரைபடத்தை பெறவும்.',
    totalReadingsCount: 'சேமிக்கப்பட்ட கால அளவீடுகள்:',
    totalEnergyIntegrated: 'கணக்கிடப்பட்ட மொத்த ஆற்றல்:',
    timeAxis: 'நேரம்',
    energyAxis: 'ஆற்றல் (kWh)',
    powerAxis: 'மின்திறன் (W)',

    // Privacy & Storage Limitations
    privacyTitle: 'அந்தரங்க பாதுகாப்பு & பயனர் தரவு உரிமை',
    privacyDescription: 'உங்கள் வீட்டு மின்சாரத் தரவு முழுமையாக உங்கள் உலாவி IndexedDB-யிலேயே இருக்கும். கிளவுட் கணக்குகள் இல்லை, வெளி தொலைத்தொடர்பு இல்லை.',
    storageLimitationsTitle: 'உலாவி சேமிப்பக வரம்புகள் & பகிர்ந்த சாதன அபாயங்கள்',
    storageLimitationsDesc: 'உங்கள் தரவு முழுவதும் உங்கள் உலாவியின் IndexedDB-யில் மட்டுமே உள்ளது: (1) வட்டு இடப் பற்றாக்குறையில் உலாவி தரவை அழிக்கக்கூடும்; (2) Private/Incognito சாளரத்தை மூடும்போது தரவு அழிந்துவிடும்; (3) உள்ளூர் IndexedDB மற்றும் JSON காப்புப் பிரதி குறியாக்கம் (encryption) இன்றி சேமிக்கப்படுகின்றன—பகிர்ந்த சாதனங்களில் பயன்படுத்திய பின் தரவை நீக்கவும்.',
    exportBtn: 'அனைத்து தரவுகளையும் பதிவிறக்கு (JSON)',
    exportDesc: 'உங்கள் IndexedDB தரவுத்தளத்தை JSON வடிவில் முழுமையாக தணிக்கைக்காக பதிவிறக்கவும்.',
    deleteBtnTitle: 'அனைத்து தரவுகளையும் அழி',
    deleteBtnDesc: 'IndexedDB-யில் உள்ள அனைத்து கட்டணங்கள், அளவீடுகள் மற்றும் விருப்பங்களை நிரந்தரமாக அழிக்கவும்.',
    deleteConfirmMsg: 'உங்கள் உள்ளூர் மின்சார தரவுகள் அனைத்தையும் அழிக்க விரும்புகிறீர்களா? இதை மீட்டெடுக்க முடியாது.',
    deleteSuccessMsg: 'அனைத்து தரவுகளும் IndexedDB-யிலிருந்து நிரந்தரமாக அழிக்கப்பட்டன.',
    networkAuditTitle: 'தொலைத்தொடர்பு தணிக்கை',
    networkAuditPassing: 'சரிபார்க்கப்பட்டது: வெளி சேவையகங்களுக்கு 0 தொலைத்தொடர்பு விடுக்கப்பட்டது. அனைத்து கணக்கீடுகளும் உங்கள் சாதனத்திலேயே இயங்கின.',

    // Simulator
    simulatorTitle: 'ஊடாடும் மாதிரி உருவகப்படுத்துதல்',
    simulatorSubtitle: 'ஏசி வெப்பநிலை மாற்றம், இயங்கும் நேரக் குறைப்பு, ஸ்டாண்ட்பை அணைத்தல் ஆகியவை மாதிரி கட்டணத்தை எவ்வாறு மாற்றுகின்றன எனப் பாருங்கள்.',
    baselineConsumption: 'தற்போதைய நுகர்வு',
    counterfactualConsumption: 'திட்டமிடப்பட்ட புதிய நுகர்வு',
    totalUnitsSaved: 'குறைக்கப்பட்ட யூனிட்கள்',
    estimatedSavings: 'மாதிரி பணச்சேமிப்பு',
    baselineBill: 'தற்போதைய கட்டணம்',
    proposedBill: 'புதிய கட்டணம்',
    acThermostat: 'ஏசி வெப்பநிலை மாற்றம்',
    acRuntimeCurtail: 'தினமும் 1 மணி நேரம் ஏசி பயன்பாட்டைக் குறைத்தல்',
    waterHeaterTimer: 'வாட்டர் ஹீட்டர் நேரக் குறைப்பு (15-20 நிமி)',
    standbyPower: 'டிவி மற்றும் சாதனங்களின் இரவு நேர ஸ்டாண்ட்பை அணைத்தல்',
    laundryShift: 'துவைக்கும் நேரத்தை காலைக்கு மாற்றுதல் (நேரடி கட்டண சேமிப்பில்லை)',
    laundryShiftTou: 'துவைக்கும் நேரத்தை மாலையிலிருந்து (19:00) காலைக்கு (07:00) மாற்றுதல்',
    cliffAvoidedAlert: 'கட்டண எல்லை உயர்வு வெற்றிகரமாக தவிர்க்கப்பட்டது! தகுதி எல்லை பாதுகாக்கப்பட்டது!',
    assumptionsTitle: 'வெளிப்படையான மாதிரி அனுமானங்கள்',

    // Recommendations
    recommendationsTitle: 'SPARE-HEM நுண்ணறிவுப் பரிந்துரைகள்',
    recommendationsSubtitle: 'நீங்கள் தேர்ந்தெடுத்த மின்கட்டண விதிகளுக்குட்பட்ட, வசதிக் குறைபாடற்ற மாதிரிப் பரிந்துரைகள்.',
    noRecommendations: 'தற்போது புதிய பரிந்துரைகள் இல்லை. வசதிக் குறைபாட்டைத் தவிர்க்க அல்லது போதிய மாதிரி சேமிப்பு இல்லாததால் அல்காரிதம் பரிந்துரையைத் தவிர்த்துள்ளது.',
    abstentionTitle: 'பாதுகாப்பான தவிர்ப்பு அமலில் உள்ளது',
    abstentionReason: 'TR-VOI அல்காரிதம் அனைத்து நடவடிக்கைகளையும் மதிப்பீடு செய்து, உங்கள் நுகர்வு மாறுபாட்டில் 95% வசதிப் பாதுகாப்பு மாதிரி வரம்புடன் ₹30.00-க்கு மேல் மாதிரி அடிப்படையிலான சேமிப்பு கிடைக்காவிட்டால் பரிந்துரைக்காமல் தவிர்க்கிறது.',
    modeledEstimateBadge: 'மாதிரி மதிப்பீடு',
    conservativeLowerBoundBadge: '95% வசதிப் பாதுகாப்பு மாதிரி வரம்பு',
    expectedSavingsLabel: 'மாதிரி எதிர்பார்க்கப்படும் சேமிப்பு',
    lowerBoundLabel: 'மாதிரி குறைந்தபட்ச சேமிப்பு மதிப்பீடு (5%)',
    effortLabel: 'தேவைப்படும் முயற்சி',
    feedbackUseful: '👍 பயனுள்ளது',
    feedbackImpractical: '👎 நடைமுறைக்கு ஒத்துவராது',
    feedbackTriedIt: '⭐ செய்து பார்த்தேன்!',
    feedbackRecorded: 'உங்கள் கருத்து உள்ளூரில் பதிவு செய்யப்பட்டது. உங்கள் விருப்பத்தேர்வு புதுப்பிக்கப்பட்டது.',
    actionCompleted: 'சரிபார்க்கப்படாத பயனர் பதிவாக சேமிப்புப் பதிவேட்டில் சேர்க்கப்பட்டது.',
    provenanceSimulated: 'மாதிரி கணிப்பு',
    provenanceUserReported: 'பயனர் குறிப்பிட்டது',
    provenanceMeterObserved: 'மீட்டர் அளவீடு',
    provenanceMeasurementVerified: 'அளவீட்டு சரிபார்ப்பு',
    provenanceMeterVerified: 'மீட்டர் மூலம் சரிபார்க்கப்பட்டது',

    // Adaptive Question
    adaptiveQuestionTitle: 'ஒற்றைக் கேள்வி விருப்பத்தேர்வு சோதனை',
    adaptiveQuestionSubtitle: 'இந்த ஒரு கேள்விக்கு பதிலளிப்பதன் மூலம் EVSI மாதிரி முடிவின் நிச்சயமற்ற தன்மையைக் குறைக்கலாம்.',
    btnFlexible: 'ஆம் / சம்மதம்',
    btnSensitive: 'இல்லை / மாற்ற இயலாது',
    btnSkip: 'இப்போது வேண்டாம்',

    // Savings Ledger
    savingsLedgerTitle: 'சேமிப்பு விவரப் பதிவேடு',
    savingsLedgerSubtitle: 'பதிவு செய்யப்பட்ட நடவடிக்கைகளை 4-நிலை சான்றுடன் கண்காணியுங்கள்; முறையான முழு-வீட்டு M&V இன்னும் IPMVP சான்றிதழ் பெறவில்லை.',
    totalVerifiedSavings: 'முறையான M&V சரிபார்க்கப்பட்ட சேமிப்பு',
    trackedSavingsImpact: 'கண்காணிக்கப்படும் மாதிரி & பயனர் சேமிப்பு',
    totalCompletedActions: 'பதிவு செய்யப்பட்ட நடவடிக்கைகள்',
    verifiedSavingsBreakdown: 'அளவீட்டு சரிபார்ப்பு (முறையான M&V தேவை)',
    estimatedSavingsBreakdown: 'மாதிரி / பயனர் குறிப்பிட்டது',
    meterObservedBreakdown: 'மீட்டர் அளவீடு',
    breakdownVerifiedSubtitle: 'முழு-வீட்டு M&V மற்றும் அடிப்படைக் கட்டுப்பாடுகள் தேவை (IPMVP சான்றிதழ் பெறாதது)',
    breakdownEstimatedSubtitle: 'மாதிரி கணிப்புகள், சுய அறிக்கைகள் & சரிசெய்யப்படாத நேரடி அளவீடுகள்',
    mvRequiredNote: 'முழு-வீட்டு M&V மற்றும் அடிப்படைக் கட்டுப்பாடுகள் தேவை (IPMVP சான்றிதழ் பெறாதது)',
    counterfactualNoticeTitle: '4-நிலை சேமிப்பு சான்று & M&V வரம்பு (IPMVP சான்றிதழ் பெறாதது)',
    counterfactualNotice: '"பயனர் குறிப்பிட்டது" மற்றும் "மீட்டர் அளவீடு" ஆகியவை சரிசெய்யப்படாத பதிவுகள் மட்டுமே, உறுதிப்படுத்தப்பட்ட சேமிப்பு அல்ல. முறையான அளவீட்டு சரிபார்ப்புக்கு (Measurement Verification) அங்கீகரிக்கப்பட்ட முழு-வீட்டு M&V திட்டம், பல-சுழற்சி அடிப்படைத் தரவு, வழக்கமான (வானிலை/CDD) + வழக்கத்திற்கு மாறான (ஆட்கள் இருப்பு/சாதன மாற்றம்) சரிசெய்தல்கள் மற்றும் நிச்சயமற்ற வரம்புகள் தேவை — இந்த ஆல்ஃபா பதிப்பு இன்னும் IPMVP Option C சான்றிதழ் பெறவில்லை.',
    noSavingsYet: 'இதுவரை நடவடிக்கைகள் பதிவு செய்யப்படவில்லை. பரிந்துரைகளில் "செய்து பார்த்தேன்" என்பதைக் கிளிக் செய்யும்போது இங்கு சரிபார்க்கப்படாத பயனர் பதிவாக சேர்க்கப்படும்.',
    recordDate: 'பதிவு செய்யப்பட்ட தேதி',
    recordAction: 'மேற்கொள்ளப்பட்ட நடவடிக்கை',
    recordSavings: 'மாதிரி / பதிவு சேமிப்பு',
    recordBasis: 'சான்று அடிப்படை',
    counterfactualMethod: 'முறை',
    uncertaintyBound: 'நிச்சயமற்ற தன்மை',
  },
};

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: TranslationKey) => translations.en[key] ?? key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('hearthshift_lang') as Language;
    if (saved === 'en' || saved === 'ta') {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('hearthshift_lang', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
