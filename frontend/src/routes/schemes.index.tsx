import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ArrowRight,
  Sprout,
  Banknote,
  Droplets,
  Tractor,
  ShieldCheck,
  Building2,
  MapPin,
  Gift,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { PageHeader, CategoryBadge, btn, card } from "@/components/site/Layout";
import { RequireAuth } from "@/components/site/AuthGate";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";
import { categories, type Category } from "@/lib/schemes";

export interface GovernmentScheme {
  id: string;
  name: string;
  description: string;
  department: string;
  benefits: string;
  state: string;
  official_source_url: string;
  is_active: boolean;
  created_at?: string;
}

export const Route = createFileRoute("/schemes/")({
  head: () => ({
    meta: [
      { title: "Explore Government Schemes – KisanSarthi" },
      { name: "description", content: "Explore verified official government schemes that match your farming needs." },
      { property: "og:title", content: "Explore Government Schemes – KisanSarthi" },
      { property: "og:description", content: "Search and filter verified agricultural and farmer support schemes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explorer,
});

export const categoryIcon: Record<Category, typeof Sprout> = {
  "Financial Support": Banknote,
  Agriculture: Sprout,
  Irrigation: Droplets,
  Equipment: Tractor,
  Insurance: ShieldCheck,
};

/**
 * Maps a real government scheme to its primary visual category
 */
export function getSchemeCategory(s: GovernmentScheme): Category {
  const name = (s.name || "").toLowerCase();
  const desc = (s.description || "").toLowerCase();
  if (name.includes("bima") || desc.includes("insurance") || desc.includes("perils") || desc.includes("risk")) {
    return "Insurance";
  }
  if (name.includes("solar") || name.includes("pump") || desc.includes("irrigation")) {
    return "Irrigation";
  }
  if (
    name.includes("kisan samman") ||
    name.includes("pm-kisan") ||
    name.includes("karj") ||
    name.includes("kcc") ||
    name.includes("credit") ||
    desc.includes("income support") ||
    desc.includes("debt redemption") ||
    desc.includes("loan")
  ) {
    return "Financial Support";
  }
  if (desc.includes("equipment") || desc.includes("tractor") || desc.includes("machinery")) {
    return "Equipment";
  }
  return "Agriculture";
}

/**
 * Evaluates whether a government scheme matches the selected category filter
 */
export function matchesCategory(s: GovernmentScheme, cat: string): boolean {
  if (cat === "All Schemes") return true;
  const name = (s.name || "").toLowerCase();
  const desc = (s.description || "").toLowerCase();

  // All 5 government schemes are officially agricultural initiatives
  if (cat === "Agriculture") return true;

  if (cat === "Insurance") {
    return name.includes("bima") || desc.includes("insurance") || desc.includes("risk") || desc.includes("perils");
  }
  if (cat === "Irrigation") {
    return name.includes("solar") || name.includes("pump") || desc.includes("irrigation");
  }
  if (cat === "Financial Support") {
    return (
      name.includes("kisan samman") ||
      name.includes("pm-kisan") ||
      name.includes("karj") ||
      name.includes("kcc") ||
      name.includes("credit") ||
      desc.includes("income support") ||
      desc.includes("debt redemption") ||
      desc.includes("loan")
    );
  }
  if (cat === "Equipment") {
    return name.includes("solar") || name.includes("pump") || desc.includes("equipment") || desc.includes("machinery");
  }
  return false;
}

function Explorer() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All Schemes");
  const [schemesList, setSchemesList] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { t } = useLanguage();
  useDocumentTitle(t.meta.schemesTitle);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success?: boolean; data?: GovernmentScheme[]; count?: number }>("/schemes");
      if (res?.data && Array.isArray(res.data)) {
        setSchemesList(res.data);
      } else {
        setSchemesList([]);
      }
    } catch (err) {
      console.error("Failed to fetch schemes:", err);
      const msg = err instanceof ApiClientError ? err.message : "Failed to load government schemes. Please check your connection.";
      setError(msg);
      setSchemesList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchemes();
  }, [fetchSchemes]);

  const query = q.trim().toLowerCase();

  const filteredList = schemesList.filter((s) => {
    const tr = t.schemesData[s.id];
    const haystack = `${s.name} ${s.description} ${s.department} ${s.benefits} ${s.state} ${tr?.name ?? ""} ${tr?.short ?? ""}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesCat = matchesCategory(s, cat);
    return matchesSearch && matchesCat;
  });

  return (
    <RequireAuth>
      <PageHeader
        title={t.schemesPage.title}
        subtitle={t.schemesPage.subtitle}
      >
        <div className="relative mt-6 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.schemesPage.searchPlaceholder}
            aria-label={t.schemesPage.searchAriaLabel}
            className="h-12 w-full rounded-xl border bg-background pl-12 pr-4 shadow-card outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-surface p-1.5 ring-1 ring-border">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${cat === c ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-primary"}`}
              >
                {t.categories[c]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Verified Schemes
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className={`${card} flex flex-col animate-pulse space-y-4`}>
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-muted" />
                  <div className="h-6 w-24 rounded-full bg-muted" />
                </div>
                <div className="h-6 w-3/4 rounded bg-muted" />
                <div className="h-14 w-full rounded bg-muted" />
                <div className="h-16 w-full rounded-lg bg-muted" />
                <div className="h-10 w-full rounded-xl bg-muted mt-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h3 className="mt-3 text-lg font-semibold text-destructive">Failed to Load Schemes</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => void fetchSchemes()}
              className={`${btn.primary} mx-auto mt-4 inline-flex items-center gap-2`}
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </button>
          </div>
        )}

        {/* Loaded Schemes Grid */}
        {!loading && !error && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((s) => {
              const category = getSchemeCategory(s);
              const Icon = categoryIcon[category];
              const tr = t.schemesData[s.id];
              const displayName = tr?.name ?? s.name;
              const displayDesc = tr?.short ?? s.description;

              return (
                <article key={s.id} className={`${card} flex flex-col justify-between hover:shadow-md transition-shadow`}>
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <CategoryBadge category={t.categories[category]} />
                    </div>

                    <h3 className="mt-4 text-lg font-semibold leading-snug">{displayName}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{displayDesc}</p>

                    {/* Department */}
                    <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-2">{s.department}</span>
                    </div>

                    {/* State Applicability & Benefits */}
                    <div className="mt-3 space-y-2 rounded-lg bg-surface p-3 text-xs ring-1 ring-border/50">
                      <div className="flex items-center gap-2 font-medium">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{s.state}</span>
                      </div>
                      <div className="flex items-start gap-2 text-foreground/80">
                        <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="line-clamp-2">{s.benefits}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-2 pt-2 border-t border-border/40">
                    <Link
                      to="/schemes/$id"
                      params={{ id: s.id }}
                      className={`${btn.primary} w-full justify-center`}
                    >
                      {t.schemesPage.viewDetails} <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      to="/eligibility"
                      search={{ schemeId: s.id }}
                      className={`${btn.outline} w-full justify-center text-xs py-2`}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                      Check Eligibility
                    </Link>

                    {s.official_source_url && (
                      <a
                        href={s.official_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Official Government Portal
                      </a>
                    )}
                  </div>
                </article>
              );
            })}

            {filteredList.length === 0 && (
              <p className="col-span-full py-16 text-center text-muted-foreground">
                {t.schemesPage.emptyState}
              </p>
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
