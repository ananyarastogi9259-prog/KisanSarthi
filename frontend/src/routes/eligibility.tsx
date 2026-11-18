import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ClipboardCheck, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { PageHeader, btn, card } from "@/components/site/Layout";
import { RequireAuth } from "@/components/site/AuthGate";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";
import type { EligibilityInput } from "@/lib/schemes";

const searchSchema = z.object({
  schemeId: z.string().optional(),
});

export const Route = createFileRoute("/eligibility")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Check Your Eligibility – KisanSarthi" },
      { name: "description", content: "Answer five simple questions to evaluate your eligibility for official government schemes." },
      { property: "og:title", content: "Check Your Eligibility – KisanSarthi" },
      { property: "og:description", content: "Official government scheme eligibility evaluation for farmers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Checker,
});

const states = [
  "Andhra Pradesh",
  "Bihar",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Uttar Pradesh",
  "West Bengal",
];

const empty: EligibilityInput = { state: "", category: "", land: "", crop: "", documents: "" };

function Checker() {
  const search = Route.useSearch();
  const [chosenSchemeId, setChosenSchemeId] = useState<string>(search.schemeId || "");
  const [schemesList, setSchemesList] = useState<{ id: string; name: string }[]>([]);
  const [v, setV] = useState<EligibilityInput>(empty);
  const [submitted, setSubmitted] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  useDocumentTitle(t.meta.eligibilityTitle);

  // Keep chosenSchemeId in sync if search.schemeId changes
  useEffect(() => {
    if (search.schemeId) {
      setChosenSchemeId(search.schemeId);
    }
  }, [search.schemeId]);

  // Load available schemes for optional targeted evaluation
  useEffect(() => {
    async function loadSchemes() {
      try {
        const res = await api.get<{ success?: boolean; data?: { id: string; name: string }[] }>("/schemes");
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setSchemesList(res.data);
        }
      } catch (err) {
        console.warn("Could not load schemes list:", err);
      }
    }
    void loadSchemes();
  }, []);

  // ── 1. Load Farmer Profile & Questionnaire Cache on Mount ──
  useEffect(() => {
    let active = true;

    async function loadFarmerProfile() {
      try {
        let cachedAnswers: Partial<EligibilityInput> = {};
        if (typeof window !== "undefined") {
          try {
            const raw = sessionStorage.getItem("kisansarthi_eligibility_input");
            if (raw) cachedAnswers = JSON.parse(raw);
          } catch {}
        }

        const res = await api.get<{
          success?: boolean;
          data?: {
            farmer_profile?: {
              state?: string | null;
            } | null;
          };
        }>("/farmer/profile");

        if (active) {
          const profileState = res?.data?.farmer_profile?.state || "";
          setV((prev) => ({
            ...prev,
            ...cachedAnswers,
            state: profileState || cachedAnswers.state || prev.state,
          }));
        }
      } catch (err) {
        console.warn("Could not pre-load farmer profile:", err);
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    void loadFarmerProfile();
    return () => {
      active = false;
    };
  }, []);

  const err = (k: keyof EligibilityInput) => submitted && !v[k];
  const ep = t.eligibilityPage;

  const fields: { key: keyof EligibilityInput; label: string; help: string; options: [string, string][] }[] = [
    { key: "state", label: ep.fields.state.label, help: ep.fields.state.help, options: states.map((s) => [s, ep.states[s] ?? s]) },
    {
      key: "category",
      label: ep.fields.category.label,
      help: ep.fields.category.help,
      options: [
        ["small", ep.fields.category.options.small],
        ["marginal", ep.fields.category.options.marginal],
        ["other", ep.fields.category.options.other],
      ],
    },
    {
      key: "land",
      label: ep.fields.land.label,
      help: ep.fields.land.help,
      options: [
        ["below-1", ep.fields.land.options["below-1"]],
        ["1-2", ep.fields.land.options["1-2"]],
        ["2-5", ep.fields.land.options["2-5"]],
        ["above-5", ep.fields.land.options["above-5"]],
      ],
    },
    {
      key: "crop",
      label: ep.fields.crop.label,
      help: ep.fields.crop.help,
      options: [
        ["cereals", ep.fields.crop.options.cereals],
        ["pulses", ep.fields.crop.options.pulses],
        ["oilseeds", ep.fields.crop.options.oilseeds],
        ["horticulture", ep.fields.crop.options.horticulture],
        ["cash", ep.fields.crop.options.cash],
      ],
    },
  ];

  // ── 2. Persist Profile & Trigger Real Backend Evaluation ──
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setApiError(null);

    if (Object.values(v).some((x) => !x)) return;

    setEvaluating(true);
    try {
      // Persist supported farmer profile field to backend database
      await api.put("/farmer/profile", {
        state: v.state,
      });

      // Preserve questionnaire answers so they are not silently discarded
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("kisansarthi_eligibility_input", JSON.stringify(v));
        } catch {}
      }

      // Trigger fresh eligibility evaluation in backend
      if (chosenSchemeId && chosenSchemeId !== "all") {
        await api.get(`/eligibility/${chosenSchemeId}`);
      } else {
        await api.get("/eligibility");
      }

      // Navigate to results page with questionnaire context and chosen schemeId
      navigate({
        to: "/result",
        search: {
          category: v.category,
          land: v.land,
          crop: v.crop,
          documents: v.documents,
          state: v.state,
          ...(chosenSchemeId && chosenSchemeId !== "all" ? { schemeId: chosenSchemeId } : {}),
        },
      });
    } catch (err) {
      console.error("Failed to update profile or evaluate schemes:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Failed to evaluate scheme eligibility. Please check your connection and try again.";
      setApiError(msg);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <RequireAuth>
      <PageHeader title={ep.title} subtitle={ep.subtitle} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
        <form onSubmit={submit} noValidate className={`${card} space-y-6 lg:col-span-2`}>
          {apiError && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Evaluation Error</p>
                <p className="mt-0.5 text-xs text-destructive/90">{apiError}</p>
              </div>
            </div>
          )}

          {/* Optional Target Scheme Selection */}
          <div className="rounded-xl border bg-secondary/30 p-4 ring-1 ring-border/50">
            <label htmlFor="schemeSelect" className="block text-sm font-semibold text-foreground">
              {lang === "hi" ? "पात्रता जांच हेतु योजना चुनें" : "Select Scheme to Evaluate"}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({lang === "hi" ? "वैकल्पिक" : "Optional"})
              </span>
            </label>
            <select
              id="schemeSelect"
              value={chosenSchemeId}
              onChange={(e) => setChosenSchemeId(e.target.value)}
              disabled={evaluating}
              className="mt-2 h-12 w-full rounded-xl border bg-background px-4 outline-none focus:ring-2 focus:ring-ring font-medium text-sm text-foreground"
            >
              <option value="">
                {lang === "hi"
                  ? "सभी सत्यापित योजनाएं (5 योजनाएं - व्यापक मूल्यांकन)"
                  : "All Verified Schemes (5 Schemes - Comprehensive Evaluation)"}
              </option>
              {schemesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {t.schemesData[s.id]?.name || s.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {chosenSchemeId
                ? lang === "hi"
                  ? "मूल्यांकन परिणाम केवल इसी चुनी गई योजना पर केंद्रित होगा।"
                  : "Evaluation results will focus exclusively on this chosen scheme."
                : lang === "hi"
                  ? "सभी 5 आधिकारिक केंद्रीय एवं राज्य कृषि योजनाओं के लिए मूल्यांकन किया जाएगा।"
                  : "Evaluates your eligibility across all 5 official Central and State agricultural schemes."}
            </p>
          </div>

          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="block text-sm font-semibold">
                {f.label} <span className="text-destructive">*</span>
              </label>
              <select
                id={f.key}
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
                aria-invalid={err(f.key)}
                disabled={loadingProfile || evaluating}
                className={`mt-2 h-12 w-full rounded-xl border bg-background px-4 outline-none focus:ring-2 focus:ring-ring ${
                  err(f.key) ? "border-destructive" : ""
                }`}
              >
                <option value="">{loadingProfile && f.key === "state" ? "Loading profile..." : ep.selectPlaceholder}</option>
                {f.options.map(([val, l]) => (
                  <option key={val} value={val}>
                    {l}
                  </option>
                ))}
              </select>
              <p className={`mt-1.5 text-xs ${err(f.key) ? "text-destructive" : "text-muted-foreground"}`}>
                {err(f.key) ? ep.requiredError : f.help}
              </p>
            </div>
          ))}

          <fieldset>
            <legend className="text-sm font-semibold">
              {ep.requiredDocsLegend} <span className="text-destructive">*</span>
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {(
                [
                  ["yes", ep.docOptions.yes],
                  ["no", ep.docOptions.no],
                  ["not-sure", ep.docOptions["not-sure"]],
                ] as const
              ).map(([val, l]) => (
                <label
                  key={val}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    v.documents === val
                      ? "border-primary bg-secondary text-primary"
                      : "hover:border-primary/40"
                  } ${err("documents") ? "border-destructive" : ""}`}
                >
                  <input
                    type="radio"
                    name="documents"
                    value={val}
                    checked={v.documents === val}
                    onChange={() => setV({ ...v, documents: val })}
                    disabled={evaluating}
                    className="accent-primary"
                  />
                  {l}
                </label>
              ))}
            </div>
            <p className={`mt-1.5 text-xs ${err("documents") ? "text-destructive" : "text-muted-foreground"}`}>
              {err("documents") ? ep.requiredError : ep.requiredDocsHelp}
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={evaluating}
            className={`${btn.primary} w-full sm:w-auto inline-flex items-center justify-center gap-2`}
          >
            {evaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Evaluating with Official Rules...
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4" /> {ep.submitButton}
              </>
            )}
          </button>
        </form>

        <aside className="h-fit space-y-5">
          <div className={`${card} bg-secondary`}>
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-semibold">{ep.privacyTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{ep.privacyText}</p>
          </div>
        </aside>
      </div>
    </RequireAuth>
  );
}
