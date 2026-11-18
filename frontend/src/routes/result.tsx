import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  RotateCcw,
  Search,
  XCircle,
  ListChecks,
  ExternalLink,
  Building2,
  MapPin,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import { btn, card } from "@/components/site/Layout";
import { RequireAuth } from "@/components/site/AuthGate";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";

const searchSchema = z.object({
  status: z.string().optional(),
  schemeId: z.string().optional(),
  category: z.string().catch(""),
  land: z.string().catch(""),
  crop: z.string().catch(""),
  documents: z.string().catch(""),
  state: z.string().catch(""),
});

export const Route = createFileRoute("/result")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Eligibility Evaluation Results – KisanSarthi" },
      { name: "description", content: "Your personalized government scheme eligibility evaluation results and verification criteria." },
      { property: "og:title", content: "Eligibility Evaluation Results – KisanSarthi" },
      { property: "og:description", content: "Official scheme eligibility evaluation powered by KisanSarthi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Result,
});

export interface CriterionEvaluated {
  criterion: string;
  status: "PASS" | "NEEDS_VERIFICATION" | "FAIL" | string;
  reason?: string;
  details?: string;
}

export interface RequiredDocumentItem {
  name: string;
  doc_type?: string;
  mandatory?: boolean;
  purpose?: string;
}

export interface EvaluatedScheme {
  scheme_id: string;
  scheme_name: string;
  description: string;
  department: string;
  benefits: string;
  state: string;
  official_source_url: string;
  eligibility_status: "eligible" | "needs_verification" | "not_eligible" | "not_evaluated";
  eligibility_reasons: {
    summary: string;
    criteria_evaluated?: CriterionEvaluated[];
    missing_information?: string[];
    required_documents_needed?: (RequiredDocumentItem | string)[];
  };
  evaluated_at?: string | null;
  application?: {
    id: string;
    status: string;
    submitted_at?: string;
  } | null;
}

function formatCriterionName(key: string, lang: "en" | "hi"): string {
  const map: Record<string, { en: string; hi: string }> = {
    location_jurisdiction: { en: "Location & State Jurisdiction", hi: "स्थान और राज्य क्षेत्राधिकार" },
    cultivable_land_ownership: { en: "Cultivable Land Ownership", hi: "कृषि भूमि स्वामित्व" },
    land_cutoff_date: { en: "Land Cut-off Date Verification", hi: "भूमि कट-ऑफ तिथि सत्यापन" },
    statutory_exclusions: { en: "Statutory Exclusion Criteria", hi: "वैधानिक बहिष्करण मानदंड" },
    dbt_aadhaar_seeding: { en: "Aadhaar DBT Bank Account Seeding", hi: "आधार डीबीटी बैंक खाता सीडिंग" },
    revenue_record_verification: { en: "Digitized Revenue Record Verification", hi: "डिजिटाइज़्ड भू-अभिलेख सत्यापन" },
    crop_eligibility: { en: "Notified Crop Coverage", hi: "अधिसूचित फसल पात्रता" },
    scheme_eligibility_rules: { en: "Automated Scheme Rules", hi: "योजना नियम सत्यापन" },
  };
  return map[key] ? (lang === "hi" ? map[key].hi : map[key].en) : key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Result() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  useDocumentTitle(t.meta.resultTitle);

  const [schemes, setSchemes] = useState<EvaluatedScheme[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(search.schemeId || "");
  const [activeFilter, setActiveFilter] = useState<string>(search.status || "all");

  // Keep selectedSchemeId synchronized if search.schemeId changes
  useEffect(() => {
    if (search.schemeId) {
      setSelectedSchemeId(search.schemeId);
    }
  }, [search.schemeId]);

  const loadEvaluations = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch evaluated personalized schemes from backend
      const res = await api.get<{
        success?: boolean;
        data?: EvaluatedScheme[];
        count?: number;
      }>("/personalized-schemes");

      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setSchemes(res.data);
      } else {
        // Fallback: evaluate schemes if personalized list is empty
        const evalRes = await api.get<{
          success?: boolean;
          data?: EvaluatedScheme[];
        }>("/eligibility");
        if (evalRes?.data && Array.isArray(evalRes.data)) {
          setSchemes(evalRes.data);
        } else {
          setSchemes([]);
        }
      }
    } catch (err) {
      console.error("Failed to load personalized scheme evaluations:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load eligibility results from backend. Please verify your connection.";
      setError(msg);
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvaluations();
  }, []);

  // Filter schemes based on active status filter
  const filteredSchemes = useMemo(() => {
    if (activeFilter === "all") return schemes;
    if (activeFilter === "match" || activeFilter === "eligible") {
      return schemes.filter((s) => s.eligibility_status === "eligible");
    }
    if (activeFilter === "more-info" || activeFilter === "needs_verification") {
      return schemes.filter((s) => s.eligibility_status === "needs_verification");
    }
    if (activeFilter === "insufficient" || activeFilter === "not_eligible") {
      return schemes.filter((s) => s.eligibility_status === "not_eligible");
    }
    return schemes;
  }, [schemes, activeFilter]);

  // Active scheme to inspect
  const activeScheme = useMemo(() => {
    if (selectedSchemeId) {
      const found = schemes.find(
        (s) =>
          s.scheme_id === selectedSchemeId ||
          s.scheme_name.toLowerCase().includes(selectedSchemeId.toLowerCase())
      );
      if (found) return found;
    }
    if (filteredSchemes.length > 0) {
      return filteredSchemes[0];
    }
    return schemes[0] || null;
  }, [schemes, filteredSchemes, selectedSchemeId]);

  const isSingleScheme = Boolean(
    selectedSchemeId &&
      schemes.some(
        (s) =>
          s.scheme_id === selectedSchemeId ||
          s.scheme_name.toLowerCase().includes(selectedSchemeId.toLowerCase())
      )
  );

  return (
    <RequireAuth>
      <div className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <div className="mx-auto max-w-xl py-20 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Evaluating Scheme Qualification...</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Retrieving verified government rules, your registered profile, and confirmed land records.
            </p>
          </div>
        ) : error ? (
          <div className={`${card} mx-auto max-w-xl p-8 text-center border-destructive/30 bg-destructive/5`}>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Unable to Retrieve Evaluation Results</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => void loadEvaluations()} className={btn.primary}>
                <RefreshCw className="h-4 w-4" /> Retry Evaluation
              </button>
              <Link to="/eligibility" className={btn.outline}>
                <RotateCcw className="h-4 w-4" /> Back to Questionnaire
              </Link>
            </div>
          </div>
        ) : schemes.length === 0 ? (
          <div className={`${card} mx-auto max-w-xl p-8 text-center`}>
            <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">No Schemes Evaluated Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Answer the questionnaire to evaluate your eligibility across all verified government agricultural schemes.
            </p>
            <div className="mt-6">
              <Link to="/eligibility" className={btn.primary}>
                <ListChecks className="h-4 w-4" /> Start Eligibility Check
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* When a specific scheme is chosen, show focused single-scheme view (no clutter of other schemes above) */}
            {isSingleScheme && activeScheme ? (
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {lang === "hi" ? "योजना पात्रता परिणाम" : "Scheme Eligibility Evaluation"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {lang === "hi"
                        ? "चयनित सरकारी योजना के लिए आधिकारिक नियमों और आपके भू-अभिलेखों के आधार पर परिणाम।"
                        : "Evaluated dynamically for this chosen scheme against official statutory criteria and verified land records."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchemeId("");
                        void navigate({
                          to: "/result",
                          search: { ...search, schemeId: undefined },
                        });
                      }}
                      className={`${btn.outline} text-xs`}
                    >
                      {lang === "hi" ? `सभी योजनाएं देखें (${schemes.length})` : `View All Schemes (${schemes.length})`}
                    </button>
                    <Link
                      to="/eligibility"
                      search={{ schemeId: activeScheme.scheme_id }}
                      className={`${btn.primary} text-xs`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> {t.resultPage.checkAgain}
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-secondary/40 p-4 ring-1 ring-border">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                          {lang === "hi" ? "चयनित सरकारी योजना" : "Selected Official Scheme"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                          {activeScheme.state || "Central / All India"}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-foreground">
                        {t.schemesData[activeScheme.scheme_id]?.name || activeScheme.scheme_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchemeId("");
                        void navigate({
                          to: "/result",
                          search: { ...search, schemeId: undefined },
                        });
                      }}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {lang === "hi" ? "अन्य सभी योजनाएं देखें →" : "View All Other Schemes →"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* All Schemes view: status tabs & scheme selector pills */
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {lang === "hi" ? "आपकी योजना पात्रता परिणाम" : "Scheme Eligibility Evaluation"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {lang === "hi"
                        ? "आधिकारिक सरकारी नियमों और आपके सत्यापित भू-अभिलेखों के आधार पर परिणाम।"
                        : "Evaluated dynamically against official statutory criteria and verified land records."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/eligibility" className={`${btn.outline} text-xs`}>
                      <RotateCcw className="h-3.5 w-3.5" /> {t.resultPage.checkAgain}
                    </Link>
                    <Link to="/schemes" className={`${btn.primary} text-xs`}>
                      <Search className="h-3.5 w-3.5" /> {t.resultPage.exploreOther}
                    </Link>
                  </div>
                </div>

                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`rounded-full border px-3.5 py-1 text-xs font-medium transition ${
                      activeFilter === "all" ? "border-primary bg-secondary text-primary font-semibold" : "text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {lang === "hi" ? `सभी योजनाएं (${schemes.length})` : `All Schemes (${schemes.length})`}
                  </button>
                  <button
                    onClick={() => setActiveFilter("eligible")}
                    className={`rounded-full border px-3.5 py-1 text-xs font-medium transition ${
                      activeFilter === "eligible" || activeFilter === "match"
                        ? "border-success bg-success-soft text-success font-semibold"
                        : "text-muted-foreground hover:border-success/40"
                    }`}
                  >
                    {lang === "hi"
                      ? `पात्र (${schemes.filter((s) => s.eligibility_status === "eligible").length})`
                      : `Eligible (${schemes.filter((s) => s.eligibility_status === "eligible").length})`}
                  </button>
                  <button
                    onClick={() => setActiveFilter("needs_verification")}
                    className={`rounded-full border px-3.5 py-1 text-xs font-medium transition ${
                      activeFilter === "needs_verification" || activeFilter === "more-info"
                        ? "border-gold bg-gold-soft text-gold-foreground font-semibold"
                        : "text-muted-foreground hover:border-gold/40"
                    }`}
                  >
                    {lang === "hi"
                      ? `सत्यापन आवश्यक (${schemes.filter((s) => s.eligibility_status === "needs_verification").length})`
                      : `Needs Verification (${schemes.filter((s) => s.eligibility_status === "needs_verification").length})`}
                  </button>
                  <button
                    onClick={() => setActiveFilter("not_eligible")}
                    className={`rounded-full border px-3.5 py-1 text-xs font-medium transition ${
                      activeFilter === "not_eligible" || activeFilter === "insufficient"
                        ? "border-destructive bg-destructive/10 text-destructive font-semibold"
                        : "text-muted-foreground hover:border-destructive/40"
                    }`}
                  >
                    {lang === "hi"
                      ? `पात्र नहीं (${schemes.filter((s) => s.eligibility_status === "not_eligible").length})`
                      : `Not Eligible (${schemes.filter((s) => s.eligibility_status === "not_eligible").length})`}
                  </button>
                </div>

                {/* Scheme Selector Pills */}
                <div className="flex flex-wrap gap-2 pt-1 border-t">
                  {filteredSchemes.map((s) => {
                    const isSelected = activeScheme?.scheme_id === s.scheme_id;
                    const localizedName = t.schemesData[s.scheme_id]?.name || s.scheme_name;
                    return (
                      <button
                        key={s.scheme_id}
                        onClick={() => {
                          setSelectedSchemeId(s.scheme_id);
                          void navigate({
                            to: "/result",
                            search: { ...search, schemeId: s.scheme_id },
                          });
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="truncate max-w-[200px]">{localizedName}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                            s.eligibility_status === "eligible"
                              ? isSelected
                                ? "bg-primary-foreground text-primary"
                                : "bg-success-soft text-success"
                              : s.eligibility_status === "needs_verification"
                              ? isSelected
                                ? "bg-primary-foreground text-primary"
                                : "bg-gold-soft text-gold-foreground"
                              : isSelected
                              ? "bg-primary-foreground text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.eligibility_status === "needs_verification"
                            ? "Verification"
                            : s.eligibility_status === "eligible"
                            ? "Eligible"
                            : s.eligibility_status === "not_eligible"
                            ? "Ineligible"
                            : "Pending"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Scheme Detailed Card */}
            {activeScheme ? (
              <ActiveSchemeCard scheme={activeScheme} lang={lang} t={t} searchContext={search} />
            ) : (
              <div className={`${card} p-8 text-center text-muted-foreground`}>
                {lang === "hi" ? "इस श्रेणी में कोई योजना नहीं मिली।" : "No schemes found matching this status filter."}
              </div>
            )}
          </>
        )}
      </div>
    </RequireAuth>
  );
}

function ActiveSchemeCard({
  scheme,
  lang,
  t,
  searchContext,
}: {
  scheme: EvaluatedScheme;
  lang: "en" | "hi";
  t: ReturnType<typeof useLanguage>["t"];
  searchContext: z.infer<typeof searchSchema>;
}) {
  const localizedScheme = t.schemesData[scheme.scheme_id];
  const schemeName = localizedScheme?.name || scheme.scheme_name;
  const status = scheme.eligibility_status;
  const reasons = scheme.eligibility_reasons;

  // Determine Banner Tone and Icon based strictly on real eligibility status
  const config = useMemo(() => {
    if (status === "eligible") {
      return {
        icon: CheckCircle2,
        title: lang === "hi" ? "योजना हेतु पात्र" : "Eligible for Scheme",
        tone: "bg-success-soft text-success border-success/30",
        iconTone: "bg-success text-primary-foreground",
        badge: "Eligible",
        badgeClass: "bg-success-soft text-success border-success/40",
      };
    }
    if (status === "needs_verification") {
      return {
        icon: AlertCircle,
        title: lang === "hi" ? "सत्यापन एवं अतिरिक्त जानकारी आवश्यक" : "Official Verification Required",
        tone: "bg-gold-soft text-gold-foreground border-gold/40",
        iconTone: "bg-gold text-foreground",
        badge: "Needs Verification",
        badgeClass: "bg-gold-soft text-gold-foreground border-gold/40",
      };
    }
    if (status === "not_eligible") {
      return {
        icon: XCircle,
        title: lang === "hi" ? "योजना हेतु पात्र नहीं" : "Not Eligible for Scheme",
        tone: "bg-destructive/10 text-destructive border-destructive/30",
        iconTone: "bg-destructive text-destructive-foreground",
        badge: "Not Eligible",
        badgeClass: "bg-destructive/10 text-destructive border-destructive/40",
      };
    }
    return {
      icon: HelpCircle,
      title: lang === "hi" ? "पात्रता जांच लंबित" : "Eligibility Not Evaluated",
      tone: "bg-neutral-soft text-muted-foreground border-border",
      iconTone: "bg-muted-foreground text-primary-foreground",
      badge: "Not Evaluated",
      badgeClass: "bg-neutral-soft text-muted-foreground border-border",
    };
  }, [status, lang]);

  const Icon = config.icon;

  // Dynamic next steps based on real evaluation status
  const nextSteps = useMemo(() => {
    if (status === "eligible") {
      return [
        lang === "hi"
          ? "योजना के सभी नियमों एवं लाभों की विस्तृत जानकारी की समीक्षा करें।"
          : "Review the verified scheme guidelines and benefit schedule.",
        lang === "hi"
          ? "दस्तावेज़ चेकलिस्ट खोलें और अपने मूल दस्तावेज़ तैयार रखें।"
          : "Check the required document checklist and organize your original papers.",
        lang === "hi"
          ? "आधिकारिक सरकारी पोर्टल या निकटतम कृषि केंद्र पर जाकर आवेदन करें।"
          : "Proceed to the official government portal or local agriculture office to submit your application.",
      ];
    }
    if (status === "needs_verification") {
      return [
        lang === "hi"
          ? "भूलेख/खतौनी पोर्टल पर अपने भू-अभिलेखों का सत्यापन एवं नामांतरण सुनिश्चित करें।"
          : "Complete official land record verification against state revenue records (Bhulekh / Khatauni).",
        lang === "hi"
          ? "डीबीटी (DBT) लाभ प्राप्त करने के लिए अपने बैंक खाते को आधार और एनपीसीआई से मैप कराएं।"
          : "Ensure your active bank account is seeded with Aadhaar and mapped on the NPCI DBT mapper.",
        lang === "hi"
          ? "नीचे दिए गए आवश्यक दस्तावेज़ और वैधानिक स्व-घोषणा पत्र तैयार रखें।"
          : "Gather the required documents listed below and complete any statutory self-declarations.",
      ];
    }
    return [
      lang === "hi"
        ? "योजना के राज्य क्षेत्राधिकार या जोत सीमा प्रतिबंधों की समीक्षा करें।"
        : "Review scheme jurisdiction or statutory landholding restrictions.",
      lang === "hi"
        ? "यदि आपके भू-अभिलेख हाल ही में बदले हैं तो स्थानीय तहसील या कृषि अधिकारी से संपर्क करें।"
        : "Consult your local Tehsil or agriculture extension officer if revenue records were updated recently.",
      lang === "hi"
        ? "अपनी श्रेणी के अनुकूल अन्य केंद्रीय अथवा राज्य सहायता योजनाओं की जांच करें।"
        : "Explore alternative central and state schemes tailored to your farmer category.",
    ];
  }, [status, lang]);

  const criteriaList = reasons?.criteria_evaluated || [];
  const missingInfoList = reasons?.missing_information || [];
  const requiredDocsList = reasons?.required_documents_needed || [];

  return (
    <div className={`${card} mx-auto max-w-4xl p-0 overflow-hidden shadow-sm`}>
      {/* Banner */}
      <div className={`flex flex-col items-center gap-3 border-b p-8 text-center ${config.tone}`}>
        <span className={`grid h-16 w-16 place-items-center rounded-full ${config.iconTone} shadow-sm`}>
          <Icon className="h-8 w-8" />
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold border ${config.badgeClass}`}>
            {config.badge}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
            <MapPin className="h-3 w-3 text-primary" /> {scheme.state}
          </span>
        </div>
        <h2 className="text-2xl font-bold md:text-3xl text-foreground">{schemeName}</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">{reasons?.summary || scheme.description}</p>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span>{scheme.department}</span>
        </div>
      </div>

      {/* Two-Column Grid: Reasons & Next Steps */}
      <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t.resultPage.whyResult}
          </h3>
          <p className="mt-3 text-sm text-foreground/90 leading-relaxed">{reasons?.summary}</p>
          {missingInfoList.length > 0 && (
            <div className="mt-4 rounded-xl border border-gold/40 bg-gold-soft p-3.5">
              <h4 className="text-xs font-semibold text-gold-foreground uppercase tracking-wider">
                {lang === "hi" ? "सत्यापन हेतु आवश्यक विवरण:" : "Verification Checkpoints Needed:"}
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-gold-foreground/90">
                {missingInfoList.map((m) => (
                  <li key={m} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                    <span>{m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> {t.resultPage.nextSteps}
          </h3>
          <ol className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            {nextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-secondary text-primary font-semibold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-foreground/90 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Criteria Breakdown Section */}
      <section className="mx-6 mb-6 rounded-xl border bg-surface p-5 md:mx-8">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <ListChecks className="h-5 w-5 text-primary" />
          {lang === "hi" ? "आधिकारिक पात्रता मानदंड जांच (इंजन परिणाम)" : "Official Eligibility Rules & Criteria Checked"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "hi"
            ? "प्रत्येक मानदंड का मूल्यांकन किसान के प्रोफ़ाइल, भूलेख रिकॉर्ड और योजना के वैधानिक नियमों से किया गया है।"
            : "Evaluated against statutory scheme conditions from official ministry gazettes and verified land records."}
        </p>

        {criteriaList.length > 0 ? (
          <ul className="mt-4 space-y-3.5 border-t pt-4">
            {criteriaList.map((crit, idx) => {
              const isPass = crit.status === "PASS";
              const isVerify = crit.status === "NEEDS_VERIFICATION";
              return (
                <li key={idx} className="flex items-start gap-3 rounded-lg border p-3 bg-card/60">
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      isPass
                        ? "bg-success-soft text-success"
                        : isVerify
                        ? "bg-gold-soft text-gold-foreground"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {isPass ? <CheckCircle2 className="h-4 w-4" /> : isVerify ? <AlertCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{formatCriterionName(crit.criterion, lang)}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isPass
                            ? "bg-success-soft text-success"
                            : isVerify
                            ? "bg-gold-soft text-gold-foreground"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {isPass ? "Passed" : isVerify ? "Needs Verification" : "Ineligible"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{crit.reason || crit.details}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            {lang === "hi"
              ? "इस योजना के लिए स्वतः जांच नियम अभी जोड़े जा रहे हैं। कृपया आधिकारिक दिशानिर्देश देखें।"
              : "Detailed automated rule breakdown is being calibrated for this scheme. Departmental verification applies."}
          </p>
        )}
      </section>

      {/* Required Documents Section */}
      {requiredDocsList.length > 0 && (
        <section className="mx-6 mb-6 rounded-xl border bg-surface p-5 md:mx-8">
          <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <FileText className="h-4 w-4 text-primary" />
            {lang === "hi" ? "योजना के लिए आवश्यक दस्तावेज़" : "Required Official Documents"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {requiredDocsList.map((doc, idx) => {
              const name = typeof doc === "string" ? doc : doc.name;
              const purpose = typeof doc === "object" ? doc.purpose : null;
              return (
                <div key={idx} className="rounded-lg border p-3 bg-card text-xs">
                  <p className="font-semibold text-foreground">{name}</p>
                  {purpose && <p className="mt-1 text-muted-foreground leading-relaxed">{purpose}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Farmer Questionnaire Context (Preserving questionnaire inputs) */}
      {(searchContext.category || searchContext.land || searchContext.crop || searchContext.documents) && (
        <section className="mx-6 mb-6 rounded-xl border bg-secondary/50 p-4 text-xs md:mx-8">
          <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
            {lang === "hi" ? "फॉर्म में दिए गए आपके जवाब:" : "Your Questionnaire Responses:"}
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-muted-foreground">
            {searchContext.state && (
              <div>
                <span className="font-medium text-foreground">State: </span>
                {searchContext.state}
              </div>
            )}
            {searchContext.category && (
              <div>
                <span className="font-medium text-foreground">Category: </span>
                {searchContext.category}
              </div>
            )}
            {searchContext.land && (
              <div>
                <span className="font-medium text-foreground">Land: </span>
                {searchContext.land}
              </div>
            )}
            {searchContext.crop && (
              <div>
                <span className="font-medium text-foreground">Crop: </span>
                {searchContext.crop}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <div className="mx-6 mb-6 flex gap-3 rounded-xl border border-gold/40 bg-gold-soft p-4 text-xs text-gold-foreground md:mx-8">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {lang === "hi"
            ? "यह परिणाम किसान साथी के सत्यापित पात्रता इंजन द्वारा तैयार किया गया है। आधिकारिक वित्तीय लाभ राज्य भू-राजस्व एवं विभागीय अनुमोदन के पश्चात ही जारी होते हैं।"
            : "This evaluation is generated dynamically by KisanSarthi's rule engine. Final statutory benefit disbursement remains subject to official revenue field inspection and departmental verification."}
        </p>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col gap-3 border-t bg-surface p-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div className="flex flex-wrap gap-2">
          <Link to="/schemes/$id" params={{ id: scheme.scheme_id }} className={`${btn.outline} text-xs`}>
            {lang === "hi" ? "योजना विवरण देखें" : "View Scheme Details"}
          </Link>
          <Link
            to="/checklist"
            search={{ schemeId: scheme.scheme_id }}
            className={`${btn.outline} text-xs`}
          >
            {lang === "hi" ? "दस्तावेज़ चेकलिस्ट" : "Document Checklist"}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scheme.official_source_url && (
            <a
              href={scheme.official_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.primary} text-xs inline-flex items-center gap-1.5`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {lang === "hi" ? "आधिकारिक सरकारी पोर्टल खोलें" : "Official Government Portal"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
