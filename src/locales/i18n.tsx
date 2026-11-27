'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta';

export const translations = {
  en: {
    appName: 'HearthShift AI',
    appSubtitle: 'Home energy & tariff assistant',
    appDescription: 'Local-first household energy insights stored only in your browser.',
    privacyBadge: '100% On-Device · IndexedDB',
    privacyBadgeShort: 'On-Device',
    offlineStatus: 'Local storage only',

    // Region & Tariff Selector
    selectTariffRegion: 'Tariff schedule',
    supportedRegionsNote:
      'Supported schedules: Tamil Nadu TNPDCL LT-1A (May 2026, 2025–2026, 2024–2025) plus illustrative Flat and Time-of-Use references. Other utilities are not modeled yet.',
    tariffVerificationNote:
      'Always compare against your printed utility receipt. Regulatory slabs, mid-cycle proration, fixed charges, and subsidy eligibility rules may change.',

    // Safe Demo Mode
    loadDemoBtn: 'Try sample data',
    clearDemoBtn: 'Exit sample data',
    demoModeBannerTitle: 'Sample household data active',
    demoModeBannerDesc:
      'Showing 3 synthetic bills (historical 2025 rates for Jan–Apr; May 2026 rates for May–Jun) and 192 hourly readings. Modeled simulations use May 2026 rates; savings ledger stays empty.',

    // Alpha Scope & Public Alpha Presentation
    alphaDisclaimerTitle: 'Research alpha scope & model limits',
    alphaDisclaimerDesc:
      'HearthShift AI provides advisory modeled estimates—not utility-certified bills, guaranteed savings, or IPMVP Option C verified outcomes. It never controls physical appliances.',
    howItWorksTitle: 'How this works',
    howItWorksStep1:
      '1. Local storage first: Bills and smart-meter CSV logs stay strictly inside your browser IndexedDB with zero telemetry uploads.',
    howItWorksStep2:
      '2. Honest mode gating: Monthly bills track slab thresholds only. Importing interval CSV logs unlocks time-series charts and personalized actions.',
    howItWorksStep3:
      '3. Conservative estimates & provenance: Actions report both modeled estimates and conservative bounds (5th percentile Q0.05), keeping Simulated, User-Reported, Meter-Observed, and formal M&V records separate.',
    howItWorksBoundaries:
      'Note: manifest.json provides metadata only—Service Worker offline page caching is not implemented yet in v0.1.0-alpha.',
    openChangelogBtn: 'Changelog',
    changelogTitle: 'Release notes & current scope',
    changelogSubtitle: 'HearthShift AI · v0.1.0-alpha',
    openFeedbackBtn: 'Feedback',
    feedbackModalTitle: 'Send product feedback',
    feedbackPrivacyBanner:
      'Privacy notice: This draft builder never reads IndexedDB bills, interval CSVs, or consumer numbers automatically. Free-text notes are not auto-redacted—remove any names, phone numbers, or meter IDs before sharing.',
    feedbackCategoryLabel: 'Topic',
    feedbackNotesPlaceholder: 'Share clarity feedback, tariff requests, or bugs (no personal details)...',
    feedbackPreviewLabel: 'Draft JSON preview (0 database records attached)',
    feedbackCopyBtn: 'Copy draft',
    feedbackCopiedMsg: 'Copied!',
    feedbackDownloadBtn: 'Download JSON',
    feedbackExternalLabel:
      'Sharing externally is manual. Confirm you removed personal details below to unlock GitHub or email links.',
    feedbackConsentLabel:
      'I reviewed my comment to ensure no personal or meter details remain (database records attached: 0) and consent to opening an external draft.',
    feedbackGithubBtn: 'GitHub issue',
    feedbackMailtoBtn: 'Email draft',
    closeModalBtn: 'Close',

    // Navigation Tabs
    tabOverview: 'Overview',
    tabBills: 'Bills',
    tabImport: 'Import CSV',
    tabIntervals: 'Usage',
    tabSimulator: 'Simulator',
    tabRecommendations: 'Smart recommendations',
    tabSavings: 'Savings ledger',
    tabPrivacy: 'Privacy & data',

    // Home Overview
    overviewTitle: 'Home overview',
    overviewSampleTag: 'Sample data',
    overviewNoBillTitle: 'No electricity bill added yet',
    overviewNoBillDesc:
      'Add a recent bill to track your tariff limit and estimated cost, or explore with realistic synthetic sample data.',
    overviewAddBillCta: 'Add a bill',
    overviewUsageLabel: 'Electricity usage',
    overviewEstimatedBillLabel: 'Estimated bill',
    overviewModelEstimate: 'Model-based estimate',
    overviewThresholdTitle: 'Your electricity usage',
    overviewSuggestedActionTitle: 'Suggested action',
    overviewActionSummarySuffix: 'Explore a simulated adjustment to your household electricity usage.',
    overviewOpenSimulator: 'Try in simulator',
    overviewOpenRecommendations: 'View recommendation',
    overviewImportUnlockCta: 'Import CSV readings',
    overviewNeedMoreDataTitle: 'Unlock tailored action ideas',
    overviewNeedMoreDataDesc:
      'Add a bill, import at least 7 days of smart-meter readings, and confirm your household comfort limits to receive comfort-checked suggestions.',
    overviewNeedComfortTitle: 'Confirm comfort preferences to unlock suggestions',
    overviewNeedComfortDesc:
      'Your meter data is ready. HearthShift never assumes your comfort limits—confirm which adjustments feel practical for your household first.',
    overviewSetComfortCta: 'Set comfort preferences',
    overviewFooterNote:
      'Model-based estimates using your active tariff. Not a utility receipt or guaranteed savings.',
    viewDetails: 'View details',
    hideDetails: 'Hide details',
    calculationDetails: 'Calculation details',

    // Headroom Card
    activeTariff: 'Active tariff',
    tariffDescription: 'Tamil Nadu Domestic LT-1A (Bi-monthly)',
    currentCycleUnits: 'Current cycle usage',
    subsidyStatus: '200 Free Units Subsidy (Effective May 10, 2026)',
    subsidyEligibility: '200 free units apply when cycle usage stays ≤ 500 kWh',
    cliffWarningTitle: 'Crossed 500 kWh billing threshold',
    cliffWarningText:
      'Going above 500 units removes the 200 free units subsidy, adding ₹478.40 immediately (₹1,570.00 → ₹2,048.40 at 501 units).',
    safeHeadroom: 'Threshold headroom',
    unitsRemaining: 'kWh under threshold',

    // Capabilities
    capabilityStatus: 'Readiness status',
    modeBasicLabel: 'Bills only',
    modeIntervalLabel: 'Meter readings active',
    modeReadyLabel: 'Ready for recommendations',
    modeBasicDesc: 'Tracking bills and tariff limits. Hourly usage curves require smart-meter readings.',
    modeIntervalDesc: 'Smart-meter usage charts unlocked. 7+ days unlocks personalized actions.',
    modeReadyDesc: 'Interval history and comfort bounds ready for conservative recommendations.',

    // Bill Form
    addBillTitle: 'Add electricity bill',
    addBillSubtitle: 'Enter totals from your utility receipt. Saved strictly on this device.',
    periodStart: 'Billing start date',
    periodEnd: 'Billing end date',
    unitsBilled: 'Electricity used (kWh)',
    amountBilled: 'Amount paid (optional)',
    tariffSelection: 'Tariff schedule',
    billReferenceLabel: 'Bill reference (optional)',
    billReferencePlaceholder: 'e.g. CA-04-129 (kept on device)',
    verifyBillBtn: 'Preview breakdown',
    saveBillBtn: 'Save bill',
    savingBillBtn: 'Saving...',
    billSavedSuccess: 'Bill saved locally in IndexedDB.',

    // Bill Table
    historyTitle: 'Bill history',
    noBillsYet: 'No electricity bills recorded yet. Add your first bill to view slab breakdown and threshold distance.',
    colPeriod: 'Billing period',
    colUnits: 'Usage',
    colGross: 'Energy charge',
    colSubsidy: 'Subsidy',
    colDuty: 'Duty',
    colNet: 'Net bill',
    colActions: 'Remove',
    deleteBtn: 'Delete',
    boundaryCrossedBadge: 'Crosses May 10, 2026 policy date (mid-cycle rule unverified)',
    boundaryCrossedNote:
      'Billing cycles crossing May 10, 2026 apply the meter-reading cutoff schedule without automatic proration; utility mid-cycle billing rules are unverified—verify against your printed TNPDCL bill.',

    // Interval Chart
    intervalChartTitle: 'Hourly usage curve',
    intervalChartSubtitle: 'Smart-meter energy readings stored locally in IndexedDB.',
    intervalDisabledTitle: 'Usage curve requires interval readings',
    intervalDisabledMsg:
      'Monthly utility bills do not contain hour-by-hour timing. HearthShift AI never fabricates synthetic hourly curves—import a smart-meter CSV to view empirical usage.',
    totalReadingsCount: 'Readings stored:',
    totalEnergyIntegrated: 'Total energy:',
    timeAxis: 'Timestamp',
    energyAxis: 'Energy (kWh)',
    powerAxis: 'Active Power (W)',

    // CSV Dropzone
    csvTitle: 'Import smart-meter CSV',
    csvSubtitle: 'Supports 15m, 30m, or 1-hour interval files up to 25 MB. Parsed strictly on your device.',
    csvDropTitle: 'Drop a CSV file here, or click to browse',
    csvDropHint: 'Supports Low Carbon London, REFIT, or timestamp + kWh CSVs (up to 500,000 rows).',

    // Privacy & Storage Limitations
    privacyTitle: 'On-device privacy & storage',
    privacyDescription:
      'All bills, CSV readings, and recommendations live exclusively in your browser IndexedDB. Zero accounts, cloud sync, or third-party analytics.',
    storageLimitationsTitle: 'Browser storage limits & security notes',
    storageLimitationsDesc:
      'Data stays inside this browser profile across restarts, with three limits: (1) browsers may evict site data under severe disk shortage; (2) Private/Incognito windows erase IndexedDB on close; (3) local records and exported JSON backups are unencrypted at rest—delete your data if using a shared device.',
    exportBtn: 'Export all data (JSON)',
    exportDesc: 'Download your complete IndexedDB backup (all 10 tables and every reading) as readable JSON.',
    deleteBtnTitle: 'Delete all data',
    deleteBtnDesc: 'Permanently erase all stored bills, CSV readings, actions, and preferences from IndexedDB.',
    deleteConfirmMsg: 'Delete every local record permanently? This cannot be undone.',
    deleteConfirmBtn: 'Yes, delete everything',
    cancelBtn: 'Cancel',
    deleteSuccessMsg: 'All household data was permanently wiped from IndexedDB.',
    networkAuditTitle: 'Network audit',
    networkAuditPassing: '0 external telemetry requests made. All math runs locally in browser memory and IndexedDB.',

    // Simulator
    simulatorTitle: 'Scenario simulator',
    simulatorSubtitle: 'Explore how practical habit adjustments affect your estimated bill.',
    baselineConsumption: 'Current usage',
    counterfactualConsumption: 'Projected usage',
    totalUnitsSaved: 'Usage reduced',
    estimatedSavings: 'Estimated savings',
    baselineBill: 'Current bill',
    proposedBill: 'Projected bill',
    acThermostat: 'AC thermostat increase',
    acRuntimeCurtail: 'Switch AC off 1h early',
    waterHeaterTimer: 'Trim water heater timer (15–20m)',
    standbyPower: 'Power down entertainment standby',
    laundryShift: 'Shift laundry to morning (₹0 under flat/slab tariff)',
    laundryShiftTou: 'Shift laundry from evening peak (19:00) to morning (07:00)',
    cliffAvoidedAlert: 'Threshold cliff avoided — subsidy protected',
    assumptionsTitle: 'How this is modeled',

    // Comfort Preferences Input (Explicit Consent)
    comfortSetupTitle: 'Confirm your comfort preferences',
    comfortSetupSubtitle:
      'HearthShift never assumes comfort tolerances from meter readings alone. Select only adjustments that are realistic for your home.',
    comfortAcOption: 'Modest AC temperature adjustment (+0.5°C to +2°C) or 1h earlier shutoff',
    comfortAcFlexibilityLabel: 'AC flexibility',
    comfortFlexLow: 'Low (+0.5°C)',
    comfortFlexMedium: 'Moderate (+1°C to +2°C)',
    comfortFlexHigh: 'Flexible',
    comfortWaterHeaterOption: 'Trim water heater timer duration by 15–20 minutes',
    comfortLaundryOption: 'Shift washing machine cycle to morning hours',
    comfortStandbyOption: 'Power down entertainment standby power overnight',
    comfortConfirmBtn: 'Confirm comfort preferences',
    comfortSavingBtn: 'Saving...',
    comfortSelectPrompt: 'Select at least one option above before confirming.',
    comfortActiveUserBadge: 'User-confirmed comfort limits',
    comfortActiveSampleBadge: 'Sample comfort limits',
    comfortClearBtn: 'Reset comfort limits',
    comfortSavedToast: 'Comfort preferences saved on this device.',

    // Recommendations
    recommendationsTitle: 'Smart recommendations',
    recommendationsSubtitle: 'Practical energy actions filtered by your tariff and 95% comfort safety bound.',
    noRecommendations: 'No recommendation met our minimum benefit and comfort safety criteria.',
    abstentionTitle: 'No change recommended right now',
    abstentionReason:
      'None of the candidate adjustments cleared the ₹30.00 benefit minimum while staying within your 95% comfort bound.',
    modeledEstimateBadge: 'Model-based estimate',
    conservativeLowerBoundBadge: '95% comfort bound',
    expectedSavingsLabel: 'Estimated savings',
    lowerBoundLabel: 'Conservative estimate',
    lowerBoundHelp: '5th-percentile modeled bound (Q0.05) accounting for consumption volatility.',
    whyThisHelpsTitle: 'Why this helps',
    effortLabel: 'Effort',
    feedbackUseful: 'Useful',
    feedbackImpractical: 'Not practical',
    feedbackTriedIt: 'Mark as tried',
    feedbackRecorded: 'Feedback saved locally. Comfort preferences updated.',
    actionCompleted: 'Action logged as unverified user-reported entry in Savings ledger.',
    provenanceSimulated: 'Simulated',
    provenanceUserReported: 'User Reported',
    provenanceMeterObserved: 'Meter Observed',
    provenanceMeasurementVerified: 'Measurement Verified',
    provenanceMeterVerified: 'Meter Verified',

    // Adaptive Question
    adaptiveQuestionTitle: 'Quick comfort check',
    adaptiveQuestionSubtitle:
      'Optional 1-tap question (EVSI check) so we only suggest actions that fit your home.',
    btnFlexible: 'Yes, comfortable',
    btnSensitive: 'No, prefer not to',
    btnSkip: 'Skip for now',

    // Savings Ledger
    savingsLedgerTitle: 'Savings ledger',
    savingsLedgerSubtitle: 'Track logged actions with transparent evidence tiers.',
    totalVerifiedSavings: 'Formally verified savings',
    trackedSavingsImpact: 'Tracked modeled & reported',
    totalCompletedActions: 'Logged actions',
    verifiedSavingsBreakdown: 'Measurement Verified',
    estimatedSavingsBreakdown: 'Estimated / User Reported',
    meterObservedBreakdown: 'Meter Observed',
    breakdownVerifiedSubtitle: 'Requires whole-home M&V baseline controls (not IPMVP-certified)',
    breakdownEstimatedSubtitle: 'Modeled calculations and self-reported entries',
    mvRequiredNote: 'Requires formal M&V baseline (not IPMVP-certified)',
    counterfactualNoticeTitle: 'About verification tiers (Not IPMVP Option C certified)',
    counterfactualNotice:
      '"User Reported" and "Meter Observed" entries are unadjusted observations, not verified causal savings. Formal verification requires multi-cycle baselines, weather normalization, and uncertainty controls.',
    noSavingsYet:
      'No actions logged yet. Marking a recommendation as tried records an unverified entry here.',
    recordDate: 'Date',
    recordAction: 'Action',
    recordSavings: 'Estimated amount',
    recordBasis: 'Evidence tier',
    counterfactualMethod: 'Method',
    uncertaintyBound: 'Uncertainty',
  },
  ta: {
    appName: 'ஹார்த்ஷிஃப்ட் AI',
    appSubtitle: 'வீட்டு மின்சாரம் & கட்டண உதவியாளர்',
    appDescription: 'உங்கள் உலாவியிலேயே செயல்படும் பாதுகாப்பான மின்சார வழிகாட்டி.',
    privacyBadge: '100% உங்கள் சாதனத்தில் · IndexedDB',
    privacyBadgeShort: 'உள்ளூர்',
    offlineStatus: 'உள்ளூர் சேமிப்பு மட்டும்',

    // Region & Tariff Selector
    selectTariffRegion: 'மின்கட்டண அட்டவணை',
    supportedRegionsNote:
      'ஆதரிக்கப்படுபவை: தமிழ்நாடு TNPDCL LT-1A (மே 2026, 2025–2026, 2024–2025) மற்றும் பொது மாதிரி கட்டணங்கள். பிற மாநிலங்கள் இன்னும் இணைக்கப்படவில்லை.',
    tariffVerificationNote:
      'செயல்படும் முன் உங்கள் அச்சிடப்பட்ட மின் கட்டண ரசீதைச் சரிபார்க்கவும். அரசு ஆணைகளுக்கு ஏற்ப அடுக்கு மற்றும் மானிய விதிகள் மாறக்கூடும்.',

    // Safe Demo Mode
    loadDemoBtn: 'மாதிரித் தரவைப் பார்',
    clearDemoBtn: 'மாதிரித் தரவை நீக்கு',
    demoModeBannerTitle: 'மாதிரி வீட்டுத் தரவு காட்டப்படுகிறது',
    demoModeBannerDesc:
      '3 மாதிரி பில்கள் (ஜன–ஏப் பழைய 2025 கட்டணம்; மே–ஜூன் மே 2026 கட்டணம்) மற்றும் 192 மணிநேர அளவீடுகள் காட்டப்படுகின்றன. சேமிப்புப் பதிவேடு காலியாக உள்ளது.',

    // Alpha Scope & Public Alpha Presentation
    alphaDisclaimerTitle: 'சோதனை ஆல்ஃபா வரம்புகள்',
    alphaDisclaimerDesc:
      'HearthShift AI மாதிரி மதிப்பீடுகளை மட்டுமே வழங்குகிறது—அதிகாரப்பூர்வ மின் கட்டண ரசீதோ உறுதியளிக்கப்பட்ட சேமிப்போ IPMVP Option C சான்றிதழோ அல்ல.',
    howItWorksTitle: 'இது எப்படி செயல்படுகிறது',
    howItWorksStep1:
      '1. உள்ளூர் சேமிப்பு: உங்கள் பில் மற்றும் CSV தகவல்கள் உங்கள் உலாவி IndexedDB-யிலேயே இருக்கும்.',
    howItWorksStep2:
      '2. நேர்மையான நிலைகள்: பில்கள் மட்டும் உள்ளபோது கட்டண எல்லை கண்காணிக்கப்படும். CSV அளவீடுகள் பரிந்துரைகளைத் திறக்கும்.',
    howItWorksStep3:
      '3. பாதுகாப்பு வரம்புகள்: மதிப்பிடப்பட்ட சேமிப்புடன் குறைந்தபட்ச பாதுகாப்பு மதிப்பீடும் (Q0.05) சான்று நிலையும் காட்டப்படும்.',
    howItWorksBoundaries:
      'குறிப்பு: manifest.json மெட்டாடேட்டா மட்டுமே—Service Worker ஆஃப்லைன் கேச்சிங் v0.1.0-alpha-வில் இன்னும் இல்லை.',
    openChangelogBtn: 'மாற்றங்கள்',
    changelogTitle: 'வெளியீட்டுக் குறிப்புகள் & வரம்புகள்',
    changelogSubtitle: 'HearthShift AI · v0.1.0-alpha',
    openFeedbackBtn: 'கருத்து',
    feedbackModalTitle: 'தயாரிப்பு கருத்து அனுப்பவும்',
    feedbackPrivacyBanner:
      'அந்தரங்க அறிவிப்பு: இந்தப் படிவம் உங்கள் IndexedDB பில்கள் அல்லது மீட்டர் அளவீடுகளைப் படிக்காது. பகிரும் முன் பெயர், தொலைபேசி எண் அல்லது மின் எண்களை நீங்களே நீக்கவும்.',
    feedbackCategoryLabel: 'தலைப்பு',
    feedbackNotesPlaceholder: 'கருத்துகள் அல்லது பிழைகளை எழுதவும் (தனிப்பட்ட தகவல்கள் இன்றி)...',
    feedbackPreviewLabel: 'மாதிரி JSON முன்னோட்டம் (0 தரவுத்தளப் பதிவுகள்)',
    feedbackCopyBtn: 'வரைவை நகலெடு',
    feedbackCopiedMsg: 'நகலெடுக்கப்பட்டது!',
    feedbackDownloadBtn: 'JSON பதிவிறக்கு',
    feedbackExternalLabel:
      'வெளியே பகிர்வது உங்கள் விருப்பம். தனிப்பட்ட தகவல்கள் இல்லை என உறுதிப்படுத்திய பின் இணைப்புகள் திறக்கப்படும்.',
    feedbackConsentLabel:
      'தனிப்பட்ட அல்லது மீட்டர் தகவல்கள் இல்லை எனச் சரிபார்த்தேன் (0 பதிவுகள்); வெளி வரைவைத் திறக்கச் சம்மதிக்கிறேன்.',
    feedbackGithubBtn: 'GitHub Issue',
    feedbackMailtoBtn: 'மின்னஞ்சல்',
    closeModalBtn: 'மூடு',

    // Tabs
    tabOverview: 'முகப்பு',
    tabBills: 'பில்கள்',
    tabImport: 'CSV பதிவேற்றம்',
    tabIntervals: 'பயன்பாடு',
    tabSimulator: 'ஒப்பீட்டுக் கணிப்பு',
    tabRecommendations: 'சிறந்த பரிந்துரைகள்',
    tabSavings: 'சேமிப்புப் பதிவேடு',
    tabPrivacy: 'அந்தரங்கம்',

    // Home Overview
    overviewTitle: 'வீட்டு மின்சார சுருக்கம்',
    overviewSampleTag: 'மாதிரித் தரவு',
    overviewNoBillTitle: 'இன்னும் மின் கட்டண பில் சேர்க்கப்படவில்லை',
    overviewNoBillDesc:
      'உங்கள் கட்டண எல்லையையும் மதிப்பிடப்பட்ட தொகையையும் அறிய ஒரு பில்லைச் சேர்க்கவும், அல்லது மாதிரித் தரவைப் பார்க்கவும்.',
    overviewAddBillCta: 'பில் சேர்க்க',
    overviewUsageLabel: 'மின் பயன்பாடு',
    overviewEstimatedBillLabel: 'மதிப்பிடப்பட்ட பில்',
    overviewModelEstimate: 'மாதிரி அடிப்படையிலான மதிப்பீடு',
    overviewThresholdTitle: 'உங்கள் மின் பயன்பாடு',
    overviewSuggestedActionTitle: 'பரிந்துரைக்கப்படும் நடவடிக்கை',
    overviewActionSummarySuffix: 'உங்கள் மின் பயன்பாட்டில் எளிய மாற்றத்தை முயற்சித்துப் பாருங்கள்.',
    overviewOpenSimulator: 'கணிப்பானில் பார்',
    overviewOpenRecommendations: 'பரிந்துரையைப் பார்',
    overviewImportUnlockCta: 'CSV பதிவேற்றுக',
    overviewNeedMoreDataTitle: 'தனிப்பயன் பரிந்துரைகளைப் பெறுங்கள்',
    overviewNeedMoreDataDesc:
      'உங்கள் வீட்டிற்கு ஏற்ற பரிந்துரைகளைப் பெற பில் விவரம், 7+ நாட்கள் ஸ்மார்ட் மீட்டர் அளவீடுகள் மற்றும் உங்கள் வசதி வரம்புகளை உறுதிப்படுத்தவும்.',
    overviewNeedComfortTitle: 'பரிந்துரைகளைப் பெற வசதி வரம்புகளை உறுதிப்படுத்தவும்',
    overviewNeedComfortDesc:
      'உங்கள் மீட்டர் அளவீடுகள் தயாராக உள்ளன. HearthShift உங்கள் வசதி வரம்புகளைத் தானாக யூகிக்காது—எந்த மாற்றங்கள் ஏற்புடையவை என்பதை முதலில் உறுதிப்படுத்தவும்.',
    overviewSetComfortCta: 'வசதி வரம்புகளை அமைக்கவும்',
    overviewFooterNote:
      'செயலில் உள்ள கட்டணத் திட்டத்தின் மாதிரி மதிப்பீடு மட்டுமே; உறுதியளிக்கப்பட்ட சேமிப்பு அல்ல.',
    viewDetails: 'விவரங்களைப் பார்',
    hideDetails: 'விவரங்களை மறை',
    calculationDetails: 'கணக்கீட்டு விவரங்கள்',

    // Headroom Card
    activeTariff: 'தற்போதைய திட்டம்',
    tariffDescription: 'தமிழ்நாடு வீட்டு உபயோகம் LT-1A',
    currentCycleUnits: 'நடப்பு பயன்பாடு',
    subsidyStatus: '200 இலவச யூனிட் மானியம் (மே 10, 2026 முதல்)',
    subsidyEligibility: '500 யூனிட்டுக்குள் இருந்தால் 200 இலவச யூனிட் மானியம் கிடைக்கும்',
    cliffWarningTitle: '500 யூனிட் கட்டண எல்லையைத் தாண்டியுள்ளீர்கள்',
    cliffWarningText:
      '500 யூனிட்டைத் தாண்டினால் 200 இலவச யூனிட் மானியம் நீங்கி கட்டணம் உடனடியாக ₹478.40 உயரும் (₹1,570.00 → ₹2,048.40).',
    safeHeadroom: 'பாதுகாப்பான இடைவெளி',
    unitsRemaining: 'யூனிட்கள் எல்லைக்குள் உள்ளன',

    // Capabilities
    capabilityStatus: 'தயார் நிலை',
    modeBasicLabel: 'பில் முறைமை மட்டும்',
    modeIntervalLabel: 'மீட்டர் அளவீடுகள் செயலில்',
    modeReadyLabel: 'பரிந்துரைகளுக்குத் தயார்',
    modeBasicDesc: 'பில் மற்றும் கட்டண எல்லை கண்காணிக்கப்படுகிறது. நேரடி வரைபடத்திற்கு CSV தேவை.',
    modeIntervalDesc: 'ஸ்மார்ட் மீட்டர் வரைபடம் திறக்கப்பட்டது. 7+ நாட்களில் பரிந்துரைகள் கிடைக்கும்.',
    modeReadyDesc: 'பயன்பாட்டுத் தரவு மற்றும் வசதி வரம்புகள் பரிந்துரைகளுக்குத் தயாராக உள்ளன.',

    // Bill Form
    addBillTitle: 'மின் கட்டண பில் சேர்க்க',
    addBillSubtitle: 'உங்கள் மின்வாரிய ரசீது விவரங்களை உள்ளிடுங்கள். உங்கள் சாதனத்தில் மட்டுமே சேமிக்கப்படும்.',
    periodStart: 'தொடக்க தேதி',
    periodEnd: 'முடிவு தேதி',
    unitsBilled: 'பயன்படுத்திய யூனிட்கள் (kWh)',
    amountBilled: 'செலுத்திய தொகை (விருப்பம்)',
    tariffSelection: 'கட்டண அட்டவணை',
    billReferenceLabel: 'குறிப்பு எண் (விருப்பம்)',
    billReferencePlaceholder: 'எ.கா. CA-04-129 (சாதனத்தில் மட்டும்)',
    verifyBillBtn: 'கணக்கீட்டைப் பார்',
    saveBillBtn: 'பில்லைச் சேமி',
    savingBillBtn: 'சேமிக்கிறது...',
    billSavedSuccess: 'மின் கட்டண பில் உங்கள் சாதனத்தின் IndexedDB-யில் சேமிக்கப்பட்டது.',

    // Bill Table
    historyTitle: 'முந்தைய பில்கள்',
    noBillsYet: 'இன்னும் பில்கள் எதுவும் சேர்க்கப்படவில்லை. கட்டண விவரத்தைப் பார்க்க முதலில் ஒரு பில்லைச் சேர்க்கவும்.',
    colPeriod: 'காலம்',
    colUnits: 'யூனிட்கள்',
    colGross: 'மொத்த கட்டணம்',
    colSubsidy: 'மானியம்',
    colDuty: 'மின்வரி',
    colNet: 'நிகரத் தொகை',
    colActions: 'நீக்கு',
    deleteBtn: 'நீக்கு',
    boundaryCrossedBadge: 'மே 10, 2026 கொள்கை எல்லையைக் கடக்கிறது (இடைக்கால விதி உறுதிப்படுத்தப்படவில்லை)',
    boundaryCrossedNote:
      'மே 10, 2026-ஐக் கடக்கும் காலங்களுக்கு இறுதி தேதி விதி பயன்படுத்தப்படுகிறது; உங்கள் அச்சிடப்பட்ட TNPDCL ரசீதைச் சரிபார்க்கவும்.',

    // Interval Chart
    intervalChartTitle: 'நேரடி பயன்பாட்டு வரைபடம்',
    intervalChartSubtitle: 'உங்கள் சாதனத்தில் சேமிக்கப்பட்ட ஸ்மார்ட் மீட்டர் அளவீடுகள்.',
    intervalDisabledTitle: 'பயன்பாட்டு வரைபடத்திற்கு மீட்டர் அளவீடுகள் தேவை',
    intervalDisabledMsg:
      'பில் மொத்தத் தொகையிலிருந்து நேரடி மணிநேரப் பயன்பாட்டைக் கணிக்க முடியாது. போலியான வரைபடங்கள் காட்டப்படாது—ஸ்மார்ட் மீட்டர் CSV-ஐப் பதிவேற்றுங்கள்.',
    totalReadingsCount: 'சேமிக்கப்பட்ட அளவீடுகள்:',
    totalEnergyIntegrated: 'மொத்த ஆற்றல்:',
    timeAxis: 'நேரம்',
    energyAxis: 'ஆற்றல் (kWh)',
    powerAxis: 'மின்திறன் (W)',

    // CSV Dropzone
    csvTitle: 'ஸ்மார்ட் மீட்டர் CSV பதிவேற்றம்',
    csvSubtitle: '15 நிமிடம், 30 நிமிடம் அல்லது 1 மணி நேர அளவீடுகள் (25 MB வரை). சாதனத்திற்குள்ளேயே செயலாக்கப்படும்.',
    csvDropTitle: 'CSV கோப்பை இங்கே விடவும் அல்லது கிளிக் செய்து தேர்ந்தெடுக்கவும்',
    csvDropHint: 'Low Carbon London, REFIT அல்லது timestamp + kWh வடிவங்கள் (500,000 வரிகள் வரை).',

    // Privacy & Storage Limitations
    privacyTitle: 'உள்ளூர் அந்தரங்கம் & தரவு கட்டுப்பாடு',
    privacyDescription:
      'உங்கள் பில்கள் மற்றும் மீட்டர் தரவுகள் உங்கள் உலாவி IndexedDB-யிலேயே இருக்கும். கிளவுட் ஒத்திசைவு அல்லது வெளித் தொடர்பு இல்லை.',
    storageLimitationsTitle: 'சேமிப்பக வரம்புகள் & பாதுகாப்புக் குறிப்புகள்',
    storageLimitationsDesc:
      'உலாவி மூடிய பின்னும் தரவு இதில் தங்கும்: (1) வட்டு இடக் குறைவில் உலாவி தரவை நீக்கலாம்; (2) Private சாளரத்தில் தரவு அழியும்; (3) உள்ளூர் தரவும் JSON கோப்புகளும் குறியாக்கம் இன்றி சேமிக்கப்படுகின்றன—பகிர்ந்த சாதனங்களில் பயன்படுத்திய பின் தரவை நீக்கவும்.',
    exportBtn: 'அனைத்துத் தரவையும் பதிவிறக்கு (JSON)',
    exportDesc: 'அனைத்து 10 IndexedDB அட்டவணைகளையும் முழு அளவீடுகளையும் JSON கோப்பாகப் பெறுங்கள்.',
    deleteBtnTitle: 'அனைத்துத் தரவையும் அழி',
    deleteBtnDesc: 'சேமிக்கப்பட்ட அனைத்து பில்கள், அளவீடுகள் மற்றும் விருப்பங்களை நிரந்தரமாக நீக்கவும்.',
    deleteConfirmMsg: 'அனைத்து உள்ளூர் தரவையும் நிரந்தரமாக அழிக்கவா? இதை மீட்டெடுக்க முடியாது.',
    deleteConfirmBtn: 'ஆம், அனைத்தையும் அழி',
    cancelBtn: 'ரத்து',
    deleteSuccessMsg: 'அனைத்துத் தரவுகளும் IndexedDB-யிலிருந்து நிரந்தரமாக அழிக்கப்பட்டன.',
    networkAuditTitle: 'தொலைத்தொடர்பு தணிக்கை',
    networkAuditPassing: 'வெளி சேவையகங்களுக்கு 0 கோரிக்கைகள் அனுப்பப்பட்டன. அனைத்துக் கணக்கீடுகளும் சாதனத்திற்குள்ளேயே நடக்கின்றன.',

    // Simulator
    simulatorTitle: 'சேமிப்பு ஒப்பீட்டுக் கணிப்பான்',
    simulatorSubtitle: 'தினசரி மின் பயன்பாட்டு மாற்றங்கள் உங்கள் பில்லை எவ்வாறு குறைக்கும் எனப் பாருங்கள்.',
    baselineConsumption: 'தற்போதைய பயன்பாடு',
    counterfactualConsumption: 'புதிய பயன்பாடு',
    totalUnitsSaved: 'குறைந்த யூனிட்கள்',
    estimatedSavings: 'மதிப்பிடப்பட்ட சேமிப்பு',
    baselineBill: 'தற்போதைய பில்',
    proposedBill: 'புதிய பில்',
    acThermostat: 'ஏசி வெப்பநிலையை உயர்த்தல்',
    acRuntimeCurtail: 'ஏசியை 1 மணி நேரம் முன்னதாக அணைத்தல்',
    waterHeaterTimer: 'வாட்டர் ஹீட்டர் நேரத்தைக் குறைத்தல் (15–20 நிமி)',
    standbyPower: 'இரவில் டிவி ஸ்டாண்ட்பை சுவிட்சை அணைத்தல்',
    laundryShift: 'துவைக்கும் நேரத்தை காலைக்கு மாற்றுதல் (நேரடி பண சேமிப்பு ₹0)',
    laundryShiftTou: 'துவைப்பதை மாலையிலிருந்து (19:00) காலைக்கு (07:00) மாற்றுதல்',
    cliffAvoidedAlert: 'கட்டண எல்லை உயர்வு தவிர்க்கப்பட்டது — மானியம் பாதுகாக்கப்பட்டது',
    assumptionsTitle: 'கணக்கீட்டு அனுமானங்கள்',

    // Comfort Preferences Input (Explicit Consent)
    comfortSetupTitle: 'உங்கள் வசதி வரம்புகளை உறுதிப்படுத்தவும்',
    comfortSetupSubtitle:
      'மீட்டர் அளவீடுகளை மட்டும் வைத்து HearthShift உங்கள் வசதியைத் தானாக யூகிக்காது. உங்கள் வீட்டிற்குப் பொருத்தமானவற்றை மட்டும் தேர்ந்தெடுக்கவும்.',
    comfortAcOption: 'ஏசி வெப்பநிலை சிறிய அளவு (+0.5°C முதல் +2°C) அல்லது 1 மணி முன் நிறுத்தம்',
    comfortAcFlexibilityLabel: 'ஏசி நெகிழ்வுத்தன்மை',
    comfortFlexLow: 'குறைவு (+0.5°C)',
    comfortFlexMedium: 'மிதமானது (+1°C–2°C)',
    comfortFlexHigh: 'எளிதானது',
    comfortWaterHeaterOption: 'வாட்டர் ஹீட்டர் நேரத்தை 15–20 நிமிடங்கள் குறைத்தல்',
    comfortLaundryOption: 'துணி துவைப்பதை காலை நேரத்திற்கு மாற்றுதல்',
    comfortStandbyOption: 'இரவில் டிவி ஸ்டாண்ட்பை மின்சாரத்தை அணைத்தல்',
    comfortConfirmBtn: 'வசதி வரம்புகளை உறுதிப்படுத்து',
    comfortSavingBtn: 'சேமிக்கிறது...',
    comfortSelectPrompt: 'உறுதிப்படுத்த குறைந்தது ஒரு விருப்பத்தையாவது தேர்ந்தெடுக்கவும்.',
    comfortActiveUserBadge: 'பயனர் உறுதிப்படுத்திய வரம்புகள்',
    comfortActiveSampleBadge: 'மாதிரி வசதி வரம்புகள்',
    comfortClearBtn: 'வசதி வரம்புகளை மீட்டமை',
    comfortSavedToast: 'உங்கள் வசதி வரம்புகள் இந்த சாதனத்தில் சேமிக்கப்பட்டன.',

    // Recommendations
    recommendationsTitle: 'சிறந்த பரிந்துரைகள்',
    recommendationsSubtitle: 'உங்கள் கட்டணம் மற்றும் 95% வசதிப் பாதுகாப்பு வரம்பிற்குட்பட்ட பரிந்துரைகள்.',
    noRecommendations: 'வசதி மற்றும் சேமிப்பு வரம்புகளுக்குட்பட்ட பரிந்துரைகள் தற்போது இல்லை.',
    abstentionTitle: 'தற்போது மாற்றம் தேவையில்லை',
    abstentionReason:
      'உங்கள் 95% வசதி வரம்பைப் பாதுகாத்து ₹30.00-க்கு மேல் சேமிப்பைத் தரும் பரிந்துரை தற்போது இல்லை.',
    modeledEstimateBadge: 'மாதிரி மதிப்பீடு',
    conservativeLowerBoundBadge: '95% வசதி வரம்பு',
    expectedSavingsLabel: 'மதிப்பிடப்பட்ட சேமிப்பு',
    lowerBoundLabel: 'குறைந்தபட்ச பாதுகாப்பு மதிப்பீடு',
    lowerBoundHelp: 'நுகர்வு மாறுபாட்டைக் கருத்தில் கொண்ட 5-வது சதவீத வரம்பு (Q0.05).',
    whyThisHelpsTitle: 'இது ஏன் உதவுகிறது',
    effortLabel: 'முயற்சி',
    feedbackUseful: 'பயனுள்ளது',
    feedbackImpractical: 'நடைமுறைக்கு ஒத்துவராது',
    feedbackTriedIt: 'முயற்சித்தேன்',
    feedbackRecorded: 'உங்கள் கருத்து உள்ளூரில் சேமிக்கப்பட்டது.',
    actionCompleted: 'சரிபார்க்கப்படாத பயனர் பதிவாக சேமிப்புப் பதிவேட்டில் சேர்க்கப்பட்டது.',
    provenanceSimulated: 'மாதிரி கணிப்பு',
    provenanceUserReported: 'பயனர் குறிப்பிட்டது',
    provenanceMeterObserved: 'மீட்டர் அளவீடு',
    provenanceMeasurementVerified: 'அளவீட்டு சரிபார்ப்பு',
    provenanceMeterVerified: 'மீட்டர் சரிபார்ப்பு',

    // Adaptive Question
    adaptiveQuestionTitle: 'சிறு விருப்பத்தேர்வு கேள்வி',
    adaptiveQuestionSubtitle:
      'உங்கள் வீட்டிற்குப் பொருத்தமான பரிந்துரையைத் தேர்ந்தெடுக்க உதவும் விருப்பக் கேள்வி.',
    btnFlexible: 'ஆம், சம்மதம்',
    btnSensitive: 'இல்லை, மாற்ற இயலாது',
    btnSkip: 'இப்போது வேண்டாம்',

    // Savings Ledger
    savingsLedgerTitle: 'சேமிப்புப் பதிவேடு',
    savingsLedgerSubtitle: 'முயற்சித்த நடவடிக்கைகளைச் சான்று நிலைகளுடன் கண்காணியுங்கள்.',
    totalVerifiedSavings: 'அதிகாரப்பூர்வ M&V சேமிப்பு',
    trackedSavingsImpact: 'பதிவு செய்யப்பட்ட மதிப்பீடு',
    totalCompletedActions: 'பதிவு செய்த நடவடிக்கைகள்',
    verifiedSavingsBreakdown: 'அளவீட்டு சரிபார்ப்பு',
    estimatedSavingsBreakdown: 'மாதிரி / பயனர் குறிப்பிட்டது',
    meterObservedBreakdown: 'மீட்டர் அளவீடு',
    breakdownVerifiedSubtitle: 'முழு-வீட்டு M&V சரிபார்ப்பு தேவை (IPMVP சான்றிதழ் இல்லை)',
    breakdownEstimatedSubtitle: 'மாதிரி கணிப்புகள் மற்றும் பயனர் பதிவுகள்',
    mvRequiredNote: 'முறையான M&V தேவை (IPMVP சான்றிதழ் இல்லை)',
    counterfactualNoticeTitle: 'சான்று நிலைகள் பற்றி (IPMVP Option C சான்றிதழ் இல்லை)',
    counterfactualNotice:
      '"பயனர் குறிப்பிட்டது" மற்றும் "மீட்டர் அளவீடு" ஆகியவை உறுதிப்படுத்தப்பட்ட சேமிப்பு அல்ல; முறையான M&V-க்கு பல-சுழற்சி மற்றும் வானிலை சரிசெய்தல்கள் தேவை.',
    noSavingsYet:
      'இன்னும் நடவடிக்கைகள் பதிவு செய்யப்படவில்லை. பரிந்துரையை முயற்சித்ததாகக் குறித்தால் இங்கு தோன்றும்.',
    recordDate: 'தேதி',
    recordAction: 'நடவடிக்கை',
    recordSavings: 'மதிப்பிடப்பட்ட சேமிப்பு',
    recordBasis: 'சான்று நிலை',
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
