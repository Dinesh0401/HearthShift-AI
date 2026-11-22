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
    
    // Tabs
    tabBills: '📋 Bills & Slab Analysis',
    tabImport: '📥 Smart Meter CSV Import',
    tabIntervals: '📈 Load Curves & Intervals',
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
    
    // Privacy
    privacyTitle: 'Privacy-First Architecture & Data Sovereign Controls',
    privacyDescription: 'Every byte of your household energy data is stored strictly in your browser IndexedDB. No cloud accounts, no remote database synchronization, and no third-party telemetry.',
    exportBtn: 'Export All Data (JSON)',
    exportDesc: 'Download your full IndexedDB database in human-readable JSON format for audit or backup.',
    deleteBtnTitle: 'Delete All My Data',
    deleteBtnDesc: 'Permanently purge all stored bills, interval readings, and preferences from IndexedDB.',
    deleteConfirmMsg: 'Are you sure you want to delete all local energy data? This cannot be undone.',
    deleteSuccessMsg: 'All household data was permanently wiped from IndexedDB.',
    networkAuditTitle: 'Telemetry & Network Audit',
    networkAuditPassing: 'Verified: 0 external telemetry requests made. All calculations executed via local WebAssembly / JavaScript runtime.',
  },
  ta: {
    appName: 'ஹார்த்ஷிஃப்ட் AI (HearthShift)',
    appSubtitle: 'தனிநபர் அந்தரங்க-பாதுகாப்பு வீட்டு மின்சார நுண்ணறிவு',
    appDescription: 'முடிவு-அடிப்படையிலான, குறைவான தகவல் கேட்கும் மின்சார உதவியாளர் · 100% உள்ளூர் IndexedDB இயக்கம்',
    privacyBadge: '100% உங்கள் சாதனத்தில் மட்டும் · வெளி சேவையகங்களுக்கு தகவல் செல்லாது · IndexedDB',
    offlineStatus: 'இணையமில்லா இயக்கம் தயார்',
    
    // Tabs
    tabBills: '📋 மின்கட்டணங்கள் & அடுக்கு ஆய்வு',
    tabImport: '📥 ஸ்மார்ட் மீட்டர் CSV பதிவேற்றம்',
    tabIntervals: '📈 பயன்பாட்டு வளைவு & கால இடைவெளி',
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
    
    // Privacy
    privacyTitle: 'அந்தரங்க பாதுகாப்பு & பயனர் தரவு உரிமை',
    privacyDescription: 'உங்கள் வீட்டு மின்சாரத் தரவு முழுமையாக உங்கள் உலாவி IndexedDB-யிலேயே இருக்கும். கிளவுட் கணக்குகள் இல்லை, வெளி தொலைத்தொடர்பு இல்லை.',
    exportBtn: 'அனைத்து தரவுகளையும் பதிவிறக்கு (JSON)',
    exportDesc: 'உங்கள் IndexedDB தரவுத்தளத்தை JSON வடிவில் முழுமையாக தணிக்கைக்காக பதிவிறக்கவும்.',
    deleteBtnTitle: 'அனைத்து தரவுகளையும் அழி',
    deleteBtnDesc: 'IndexedDB-யில் உள்ள அனைத்து கட்டணங்கள், அளவீடுகள் மற்றும் விருப்பங்களை நிரந்தரமாக அழிக்கவும்.',
    deleteConfirmMsg: 'உங்கள் உள்ளூர் மின்சார தரவுகள் அனைத்தையும் அழிக்க விரும்புகிறீர்களா? இதை மீட்டெடுக்க முடியாது.',
    deleteSuccessMsg: 'அனைத்து தரவுகளும் IndexedDB-யிலிருந்து நிரந்தரமாக அழிக்கப்பட்டன.',
    networkAuditTitle: 'தொலைத்தொடர்பு தணிக்கை',
    networkAuditPassing: 'சரிபார்க்கப்பட்டது: வெளி சேவையகங்களுக்கு 0 தொலைத்தொடர்பு விடுக்கப்பட்டது. அனைத்து கணக்கீடுகளும் உங்கள் சாதனத்திலேயே இயங்கின.',
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
