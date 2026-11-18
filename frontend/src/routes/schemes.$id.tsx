import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Gift,
  FileText,
  ListOrdered,
  CheckCircle2,
  ClipboardCheck,
  Building2,
  ExternalLink,
  MapPin,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { CategoryBadge, btn, card } from "@/components/site/Layout";
import { RequireAuth } from "@/components/site/AuthGate";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";
import { getSchemeCategory, type GovernmentScheme } from "./schemes.index";
import type { ReactNode } from "react";

export const Route = createFileRoute("/schemes/$id")({
  head: () => ({
    meta: [
      { title: "Scheme Details – KisanSarthi" },
      { name: "description", content: "Detailed official government scheme information and application guidelines." },
      { property: "og:title", content: "Scheme Details – KisanSarthi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Details,
});

function Section({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: ReactNode }) {
  return (
    <section className={card}>
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

function Details() {
  const { id } = Route.useParams();
  const { t } = useLanguage();

  const [scheme, setScheme] = useState<GovernmentScheme | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const fetchScheme = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsNotFound(false);
    try {
      const res = await api.get<{ success?: boolean; data?: GovernmentScheme }>(`/schemes/${id}`);
      if (!res?.data || !res.data.id) {
        setIsNotFound(true);
      } else {
        setScheme(res.data);
      }
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 404 || err.status === 400)) {
        setIsNotFound(true);
      } else {
        const msg = err instanceof ApiClientError ? err.message : "Failed to load scheme details. Please check your connection.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchScheme();
  }, [fetchScheme]);

  const tr = scheme ? t.schemesData[scheme.id] : undefined;
  const name = tr?.name ?? scheme?.name ?? "Government Scheme";
  useDocumentTitle(`${name} – ${t.brand.full}`);

  const category = scheme ? getSchemeCategory(scheme) : "Agriculture";

  const defaultBenefits = scheme?.benefits ? [scheme.benefits] : [];
  const benefitsList = tr?.benefits && tr.benefits.length > 0 ? tr.benefits : defaultBenefits;

  const defaultWhoCanBenefit = scheme
    ? [
        `Farmers located in ${scheme.state}`,
        "Small and marginal farmers holding registered agricultural land",
        "Farmers meeting statutory and administrative scheme criteria",
      ]
    : [];
  const whoCanBenefitList = tr?.whoCanBenefit && tr.whoCanBenefit.length > 0 ? tr.whoCanBenefit : defaultWhoCanBenefit;

  const defaultSteps = [
    "Verify your land records and eligibility on KisanSarthi",
    "Prepare the required identification and land documents",
    "Submit your application through the official government portal or local agriculture office",
    "Field verification by designated state agriculture officials",
    "Direct Benefit Transfer or subsidy release upon approval",
  ];
  const stepsList = tr?.steps && tr.steps.length > 0 ? tr.steps : defaultSteps;

  const defaultDocs = [
    "Aadhaar Card of applicant farmer",
    "Land ownership records (Khatauni / Khasra / RoR)",
    "Active bank passbook / account details (Aadhaar-seeded)",
    "Passport size photographs",
  ];
  const docsList = tr?.documents && tr.documents.length > 0 ? tr.documents : defaultDocs;

  return (
    <RequireAuth>
      {loading ? (
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Loading verified scheme details...</p>
        </div>
      ) : isNotFound ? (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Scheme Not Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The requested government scheme does not exist or may have been retired.
          </p>
          <div className="mt-6">
            <Link to="/schemes" className={btn.primary}>
              <ArrowLeft className="h-4 w-4" /> {t.schemeDetailPage.backToSchemes}
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="mx-auto max-w-xl px-4 py-16">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <h3 className="mt-3 font-semibold text-foreground">Unable to Load Scheme</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => void fetchScheme()} className={btn.primary}>
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
              <Link to="/schemes" className={btn.outline}>
                <ArrowLeft className="h-4 w-4" /> {t.schemeDetailPage.backToSchemes}
              </Link>
            </div>
          </div>
        </div>
      ) : scheme ? (
        <>
          <section className="border-b bg-secondary">
            <div className="mx-auto max-w-6xl px-4 py-10">
              <Link
                to="/schemes"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> {t.schemeDetailPage.backToSchemes}
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CategoryBadge category={t.categories[category]} />
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                  <MapPin className="h-3 w-3 text-primary" /> {scheme.state}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Official Scheme
                </span>
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{name}</h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                {tr?.short ?? scheme.description}
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span>{scheme.department}</span>
              </div>
            </div>
          </section>

          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Overview */}
              <Section icon={BookOpen} title={t.schemeDetailPage.overview}>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {scheme.description}
                </p>
              </Section>

              {/* Eligibility & Benefits */}
              <div className="grid gap-6 md:grid-cols-2">
                <Section icon={Users} title={t.schemeDetailPage.whoCanBenefit}>
                  <Bullets items={whoCanBenefitList} />
                </Section>
                <Section icon={Gift} title={t.schemeDetailPage.sampleBenefits}>
                  <Bullets items={benefitsList} />
                </Section>
              </div>

              {/* How to Apply */}
              <Section icon={ListOrdered} title={t.schemeDetailPage.howToApply}>
                <ol className="space-y-4">
                  {stepsList.map((st, i) => (
                    <li key={st} className="flex items-start gap-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm pt-1">{st}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            </div>

            <aside className="space-y-6">
              {/* Required Documents */}
              <Section icon={FileText} title={t.schemeDetailPage.requiredDocuments}>
                <Bullets items={docsList} />
              </Section>

              {/* Check Eligibility Card */}
              <div className={`${card} border-gold/40 bg-gold-soft`}>
                <h3 className="font-semibold text-gold-foreground">{t.schemeDetailPage.readyToCheck}</h3>
                <p className="mt-1 text-sm text-gold-foreground/80">{t.schemeDetailPage.readyToCheckText}</p>
                <Link
                  to="/eligibility"
                  search={{ schemeId: scheme.id }}
                  className={`${btn.primary} mt-4 w-full justify-center`}
                >
                  <ClipboardCheck className="h-4 w-4" /> {t.schemeDetailPage.checkEligibility}
                </Link>
                <Link
                  to="/checklist"
                  search={{ schemeId: scheme.id }}
                  className={`${btn.outline} mt-2 w-full justify-center bg-background`}
                >
                  {t.schemeDetailPage.documentChecklist}
                </Link>
              </div>

              {/* Official Source Link Card */}
              {scheme.official_source_url && (
                <div className={`${card} border-primary/20 bg-surface`}>
                  <h3 className="font-semibold text-foreground text-sm">Official Government Portal</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Visit the official ministry portal for direct guidelines and state circulars.
                  </p>
                  <a
                    href={scheme.official_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btn.outline} mt-3 w-full justify-center inline-flex items-center gap-2 text-xs`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Government Website
                  </a>
                </div>
              )}
            </aside>
          </div>
        </>
      ) : null}
    </RequireAuth>
  );
}
