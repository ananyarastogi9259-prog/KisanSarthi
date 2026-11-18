import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { DemoBadge } from "@/components/site/Layout";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KisanSarthi – Schemes & Eligibility for Farmers" },
      {
        name: "description",
        content: "Explore sample government schemes, check eligibility, prepare documents and track applications.",
      },
      { property: "og:title", content: "KisanSarthi – Schemes & Eligibility for Farmers" },
      { property: "og:description", content: "A simple portal to explore farmer schemes and check sample eligibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useLanguage();
  useDocumentTitle(t.meta.homeTitle);

  return (
    <>
      <section className="ks-hero-section relative overflow-hidden border-b bg-[#10381e] text-white">
        <div
          aria-hidden="true"
          data-a11y-preserve-media="true"
          className="ks-hero-bg pointer-events-none absolute inset-0"
        />
        <div aria-hidden="true" className="ks-hero-overlay pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 md:py-20 lg:py-24">
          <div className="max-w-2xl">
            <DemoBadge className="text-[#fde68a]">{t.home.badge}</DemoBadge>
            <h1 className="font-display mt-3 max-w-xl text-4xl font-bold leading-[1.15] tracking-tight text-white text-balance md:text-5xl">
              {t.home.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 md:text-lg">
              {t.home.heroSubtitle}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/schemes"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#14532d] shadow-card transition-all duration-150 hover:bg-[#ecfdf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {t.home.exploreCta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/eligibility"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/60 bg-black/25 px-5 py-3 text-sm font-semibold text-white backdrop-blur-xs transition-all duration-150 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {t.home.eligibilityCta}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/20 pt-5 text-xs font-medium text-white/85 tabular-nums sm:text-sm">
              {t.home.summaryItems.map((item, idx) => (
                <span key={item} className="inline-flex items-center gap-3">
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-white/45">
                      ·
                    </span>
                  )}
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-surface/70">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
            <p className="text-xs font-semibold tracking-wide text-gold-foreground">{t.home.aboutEyebrow}</p>
            <h2 className="font-display mt-2 max-w-2xl text-2xl font-bold leading-snug tracking-tight text-primary text-balance md:text-3xl">
              {t.home.aboutTitle}
            </h2>
            <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {t.home.aboutParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
