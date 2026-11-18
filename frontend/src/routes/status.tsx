import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Info,
  FilePen,
  FileCheck2,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Loader2,
  Building2,
  FileText,
  Search,
  ExternalLink,
} from "lucide-react";
import { PageHeader, btn, card } from "@/components/site/Layout";
import { RequireAuth } from "@/components/site/AuthGate";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Application Status – KisanSarthi" },
      { name: "description", content: "View and track the progress of your verified government scheme applications." },
      { property: "og:title", content: "Application Status – KisanSarthi" },
      { property: "og:description", content: "Track verified government scheme applications on KisanSarthi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Status,
});

export interface RealApplication {
  id: string;
  scheme_id: string;
  scheme_name: string;
  department?: string | null;
  benefits?: string | null;
  official_source_url?: string | null;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_at?: string | null;
  created_at: string;
  attached_documents_count?: number;
}

export interface EligibleSchemeWithoutApp {
  scheme_id: string;
  scheme_name: string;
  department: string;
  benefits: string;
  eligibility_status: string;
}

export const realStatusConfig: Record<
  string,
  { labelEn: string; labelHi: string; tone: string; icon: typeof FilePen }
> = {
  draft: {
    labelEn: "Draft Packet",
    labelHi: "ड्राफ्ट पैकेट",
    tone: "bg-neutral-soft text-muted-foreground border-border",
    icon: FilePen,
  },
  submitted: {
    labelEn: "Submitted for Tracking",
    labelHi: "ट्रैकिंग हेतु प्रस्तुत",
    tone: "bg-primary/10 text-primary border-primary/30",
    icon: Send,
  },
  under_review: {
    labelEn: "Under Official Review",
    labelHi: "विभागीय समीक्षाधीन",
    tone: "bg-gold-soft text-gold-foreground border-gold/40",
    icon: FileCheck2,
  },
  approved: {
    labelEn: "Approved",
    labelHi: "स्वीकृत",
    tone: "bg-success-soft text-success border-success/40",
    icon: CheckCircle2,
  },
  rejected: {
    labelEn: "Action Required / Rejected",
    labelHi: "अस्वीकृत / सुधार अपेक्षित",
    tone: "bg-destructive/10 text-destructive border-destructive/30",
    icon: XCircle,
  },
};

function Status() {
  const { lang, t } = useLanguage();
  useDocumentTitle(t.meta.statusTitle);
  const sp = t.statusPage;

  const [applications, setApplications] = useState<RealApplication[]>([]);
  const [eligibleSchemes, setEligibleSchemes] = useState<EligibleSchemeWithoutApp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [creatingForScheme, setCreatingForScheme] = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch farmer's existing applications
      const appsRes = await api.get<{
        success?: boolean;
        data?: RealApplication[];
      }>("/applications");

      const existingApps = Array.isArray(appsRes?.data) ? appsRes.data : [];
      setApplications(existingApps);

      // 2. Fetch personalized schemes to check eligible schemes without active applications
      try {
        const persRes = await api.get<{
          success?: boolean;
          data?: (EligibleSchemeWithoutApp & { application?: { id: string } | null })[];
        }>("/personalized-schemes");

        if (persRes?.data && Array.isArray(persRes.data)) {
          const eligibleNoApp = persRes.data.filter(
            (s) => s.eligibility_status === "eligible" && !s.application
          );
          setEligibleSchemes(eligibleNoApp);
        }
      } catch (persErr) {
        console.warn("Could not load personalized schemes for application options:", persErr);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Failed to retrieve your applications. Please check your connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Create new draft application for an eligible scheme
  const handleCreateApp = async (schemeId: string) => {
    setCreatingForScheme(schemeId);
    setCreateMsg(null);
    try {
      await api.post("/applications", {
        scheme_id: schemeId,
      });
      setCreateMsg({
        type: "success",
        text: "Application draft created successfully! You can now review documents and track readiness.",
      });
      void loadData();
    } catch (err) {
      console.error("Failed to create application:", err);
      const msg =
        err instanceof ApiClientError ? err.message : "Failed to create application draft.";
      setCreateMsg({ type: "error", text: msg });
    } finally {
      setCreatingForScheme(null);
    }
  };

  return (
    <RequireAuth>
      <PageHeader
        title={lang === "hi" ? "योजना आवेदन स्थिति एवं ट्रैकिंग" : sp.title}
        subtitle={
          lang === "hi"
            ? "अपने सभी सरकारी कृषि योजना आवेदनों की प्रगति और दस्तावेज़ सत्यापन ट्रैक करें।"
            : sp.subtitle
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Compliance & Non-fabrication Notice */}
        <div className="mb-6 flex gap-3 rounded-xl border border-primary/30 bg-secondary p-4 text-sm text-foreground">
          <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-semibold text-primary">
              {lang === "hi" ? "आवेदन ट्रैकिंग दिशानिर्देश" : "Application Tracking Guidelines"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {lang === "hi"
                ? "किसान साथी आपके आवश्यक दस्तावेज़ों और आवेदन पैकेट को व्यवस्थित करता है। आधिकारिक लाभ स्वीकृति एवं अनुदान वितरण नामित राज्य कृषि विभाग तथा क्षेत्रीय सत्यापन अधिकारियों द्वारा संपन्न होता है।"
                : "KisanSarthi organizes your statutory packet and tracks administrative readiness. Formal benefit sanction and disbursement are processed directly by designated state agriculture departments."}
            </p>
          </div>
        </div>

        {createMsg && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              createMsg.type === "success"
                ? "border-success/40 bg-success-soft text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {createMsg.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <span>{createMsg.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading applications...</p>
          </div>
        ) : error ? (
          <div className={`${card} p-8 text-center border-destructive/20 bg-destructive/5`}>
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <button onClick={() => void loadData()} className={`${btn.primary} mt-4 text-xs`}>
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Existing Applications List */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">
                {lang === "hi" ? "सक्रिय आवेदन रिकॉर्ड" : "Your Active Application Records"} (
                {applications.length})
              </h2>

              {applications.length === 0 ? (
                <div className={`${card} p-8 text-center text-muted-foreground`}>
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
                  <p className="font-medium text-foreground">
                    {lang === "hi" ? "कोई सक्रिय आवेदन रिकॉर्ड नहीं मिला" : "No application records found yet"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {lang === "hi"
                      ? "पात्रता जांच पूरी करने के बाद पात्र योजनाओं के लिए आवेदन पैकेट तैयार कर सकते हैं।"
                      : "Once you verify your land records and eligibility, you can create and track application packets here."}
                  </p>
                  <Link to="/eligibility" className={`${btn.primary} mt-4 text-xs inline-flex items-center gap-1.5`}>
                    <Search className="h-3.5 w-3.5" /> Check Scheme Eligibility
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {applications.map((a) => {
                    const meta = realStatusConfig[a.status] || realStatusConfig["draft"] || {
                      labelEn: "Draft",
                      labelHi: "ड्राफ्ट",
                      tone: "bg-neutral-soft text-muted-foreground",
                      icon: FilePen,
                    };
                    const StatusIcon = meta.icon;
                    const appliedDate = a.submitted_at || a.created_at;

                    return (
                      <article key={a.id} className={`${card} flex flex-col justify-between shadow-sm`}>
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-[11px] text-muted-foreground">Ref: {a.id}</p>
                              <h3 className="mt-1 text-lg font-bold text-foreground">{a.scheme_name}</h3>
                            </div>
                            <span
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.tone}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {lang === "hi" ? meta.labelHi : meta.labelEn}
                            </span>
                          </div>

                          {a.department && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">{a.department}</span>
                            </p>
                          )}

                          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            <span>
                              {a.status === "draft" ? "Created: " : "Submitted: "}
                              {new Date(appliedDate).toLocaleDateString()}
                            </span>
                            {a.attached_documents_count !== undefined && (
                              <span className="ml-auto text-[11px] font-medium bg-secondary px-2 py-0.5 rounded-md">
                                {a.attached_documents_count} Document(s) Attached
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-2">
                          <Link
                            to="/status/$appId"
                            params={{ appId: a.id }}
                            className={`${a.status === "draft" ? btn.primary : btn.outline} text-xs`}
                          >
                            {a.status === "draft"
                              ? lang === "hi"
                                ? "पैकेट देखें एवं प्रस्तुत करें"
                                : "Review & Submit Packet"
                              : lang === "hi"
                              ? "विस्तृत स्थिति ट्रैक करें"
                              : "Track Details"}
                          </Link>

                          {a.official_source_url && (
                            <a
                              href={a.official_source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> Ministry Portal
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Eligible Schemes Ready for Application */}
            {eligibleSchemes.length > 0 && (
              <div className="border-t pt-8">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      {lang === "hi" ? "आवेदन हेतु पात्र योजनाएं" : "Eligible Schemes Ready for Application"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {lang === "hi"
                        ? "आप इन योजनाओं के लिए पात्र हैं। नया आवेदन पैकेट तैयार करने के लिए चयन करें।"
                        : "You meet statutory criteria for these schemes. Start a draft application packet."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {eligibleSchemes.map((s) => (
                    <div key={s.scheme_id} className={`${card} p-4 flex flex-col justify-between bg-card`}>
                      <div>
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success uppercase">
                          Eligible
                        </span>
                        <h3 className="mt-2 text-sm font-bold text-foreground">{s.scheme_name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.benefits}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t">
                        <button
                          onClick={() => void handleCreateApp(s.scheme_id)}
                          disabled={creatingForScheme === s.scheme_id}
                          className={`${btn.primary} w-full text-xs justify-center flex items-center gap-1.5`}
                        >
                          {creatingForScheme === s.scheme_id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating Draft...
                            </>
                          ) : (
                            <>
                              <PlusCircle className="h-3.5 w-3.5" /> Create Application Packet
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
