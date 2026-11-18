import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  FileText,
  Info,
  Building2,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  Send,
  ShieldCheck,
  Check,
} from "lucide-react";
import { btn, card } from "@/components/site/Layout";
import { RequireAuth } from "@/components/site/AuthGate";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";
import { realStatusConfig } from "./status";

export const Route = createFileRoute("/status_/$appId")({
  head: () => ({
    meta: [
      { title: "Application Detail – KisanSarthi" },
      { name: "description", content: "Detailed application tracking, document status, and verification timeline." },
      { property: "og:title", content: "Application Detail – KisanSarthi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApplicationDetails,
});

export interface AttachedDocument {
  id: string;
  document_type: string;
  file_name: string;
  created_at: string;
}

export interface ApplicationDetailData {
  id: string;
  scheme_id: string;
  farmer_id: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_at?: string | null;
  created_at: string;
  scheme?: {
    id: string;
    name: string;
    department?: string;
    benefits?: string;
    state?: string;
    official_source_url?: string;
  } | null;
  attached_documents?: AttachedDocument[];
  checklist_summary?: {
    total_required: number;
    total_available: number;
    completion_percentage: number;
    is_complete: boolean;
  };
  timeline?: {
    step: string;
    label: string;
    status: "done" | "current" | "pending";
    timestamp?: string;
  }[];
}

function ApplicationDetails() {
  const { appId } = Route.useParams();
  const { lang, t } = useLanguage();

  const [app, setApp] = useState<ApplicationDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        success?: boolean;
        data?: ApplicationDetailData;
      }>(`/applications/${appId}`);

      if (res?.data && res.data.id) {
        setApp(res.data);
      } else {
        throw new Error("Application record not found.");
      }
    } catch (err) {
      console.error("Failed to load application detail:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Application not found or inaccessible. Please verify reference ID.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const schemeName = app?.scheme?.name ?? "Government Scheme";
  useDocumentTitle(`${app?.id || "Application"} – ${t.brand.full}`);

  // Submit draft application packet
  const handleSubmitPacket = async () => {
    if (!app?.id) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.patch(`/applications/${app.id}/submit`, {});
      setSubmitSuccess(true);
      void loadApplication();
    } catch (err) {
      console.error("Failed to submit application packet:", err);
      const msg =
        err instanceof ApiClientError ? err.message : "Failed to submit application packet.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const meta = realStatusConfig[app?.status || "draft"] || realStatusConfig["draft"] || {
    labelEn: "Draft Packet",
    labelHi: "ड्राफ्ट पैकेट",
    tone: "bg-neutral-soft text-muted-foreground",
    icon: FileText,
  };
  const StatusIcon = meta.icon;

  const defaultTimeline = [
    { label: "Application Started & Packet Drafted", state: "done" },
    {
      label: "Statutory Documents Attached & Checked",
      state: app?.status === "draft" ? "current" : "done",
    },
    {
      label: "Submitted for Departmental Tracking",
      state: app?.status === "draft" ? "todo" : "done",
    },
    {
      label: "Official Revenue Verification & Review",
      state: app?.status === "under_review" ? "current" : app?.status === "approved" ? "done" : "todo",
    },
    {
      label: "Final Administrative Sanction & DBT Release",
      state: app?.status === "approved" ? "done" : "todo",
    },
  ];

  const timelineSteps = app?.timeline
    ? app.timeline.map((st) => ({
        label: st.label,
        state: st.status === "done" ? "done" : st.status === "current" ? "current" : "todo",
      }))
    : defaultTimeline;

  return (
    <RequireAuth>
      {loading ? (
        <div className="mx-auto max-w-xl py-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading application packet details...</p>
        </div>
      ) : error || !app ? (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground">Application Not Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error || "This application reference does not exist."}</p>
          <div className="mt-6">
            <Link to="/status" className={btn.primary}>
              <ArrowLeft className="h-4 w-4" /> Back to Applications
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Top Banner */}
          <section className="border-b bg-secondary">
            <div className="mx-auto max-w-6xl px-4 py-8">
              <Link
                to="/status"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to All Applications
              </Link>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">Reference ID: {app.id}</p>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-primary">{schemeName}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {app.scheme?.department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-primary" /> {app.scheme.department}
                      </span>
                    )}
                    {app.scheme?.state && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> {app.scheme.state}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.tone}`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {lang === "hi" ? meta.labelHi : meta.labelEn}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
            {/* Left Content Column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Draft Submission Action Card (Only if in draft status) */}
              {app.status === "draft" && (
                <div className={`${card} border-primary/30 bg-secondary/50 p-6`}>
                  <h3 className="text-base font-bold text-foreground">Submit Application Packet for Tracking</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your application is drafted. Once you have verified your documents, submit the packet to track official review.
                  </p>

                  {submitError && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="mt-4">
                    <button
                      onClick={() => void handleSubmitPacket()}
                      disabled={submitting}
                      className={`${btn.primary} text-xs inline-flex items-center gap-2`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting Packet...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" /> Submit Application for Tracking
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {submitSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success-soft p-4 text-xs font-semibold text-success">
                  <Check className="h-4 w-4" />
                  <span>Application packet submitted successfully. Status updated to tracking mode.</span>
                </div>
              )}

              {/* Progress Timeline */}
              <div className={card}>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Application Progress Timeline
                </h3>
                <div className="mt-4 border-t pt-4">
                  <ol className="space-y-4">
                    {timelineSteps.map((s, idx) => {
                      const Icon = s.state === "done" ? CheckCircle2 : s.state === "current" ? CircleDot : Circle;
                      return (
                        <li key={idx} className="flex items-start gap-3">
                          <Icon
                            className={`mt-0.5 h-5 w-5 shrink-0 ${
                              s.state === "done"
                                ? "text-success"
                                : s.state === "current"
                                ? "text-primary"
                                : "text-muted-foreground/40"
                            }`}
                          />
                          <span
                            className={`text-xs sm:text-sm ${
                              s.state === "current"
                                ? "font-semibold text-primary"
                                : s.state === "todo"
                                ? "text-muted-foreground"
                                : "text-foreground font-medium"
                            }`}
                          >
                            {s.label}
                            {s.state === "current" && (
                              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                                Current Stage
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* Attached Documents */}
              <div className={card}>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Attached Supporting Documents
                </h3>
                <div className="mt-4 border-t pt-4">
                  {app.attached_documents && app.attached_documents.length > 0 ? (
                    <ul className="space-y-2.5">
                      {app.attached_documents.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between rounded-lg border p-3 text-xs bg-card"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium truncate">{d.file_name}</span>
                          </div>
                          <span className="text-muted-foreground shrink-0 uppercase text-[10px] font-mono">
                            {d.document_type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No documents attached yet. You can attach uploaded land records via your checklist.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <aside className="space-y-6">
              {/* Application Details Summary */}
              <div className={card}>
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                  Packet Metadata
                </h3>
                <div className="mt-3 space-y-2.5 text-xs border-t pt-3">
                  <div>
                    <span className="text-muted-foreground">Created Date:</span>
                    <p className="font-medium text-foreground">
                      {new Date(app.created_at).toLocaleString()}
                    </p>
                  </div>
                  {app.submitted_at && (
                    <div>
                      <span className="text-muted-foreground">Submitted for Tracking:</span>
                      <p className="font-medium text-foreground">
                        {new Date(app.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Farmer Account ID:</span>
                    <p className="font-mono text-[11px] text-foreground truncate">{app.farmer_id}</p>
                  </div>
                </div>
              </div>

              {/* Guidelines Disclaimer */}
              <div className="rounded-xl border border-primary/20 bg-secondary p-4 text-xs text-foreground/90 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <Info className="h-4 w-4" /> Administrative Notice
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Final verification of statutory land records, biometric e-KYC, and physical parcel inspection are executed under the authority of state revenue and agriculture commissioners.
                </p>
              </div>

              {/* Official Source Link */}
              {app.scheme?.official_source_url && (
                <div className={`${card} p-4 text-xs`}>
                  <p className="font-semibold text-foreground">Official Ministry Portal</p>
                  <p className="mt-1 text-muted-foreground">
                    Check official gazettes and state circulars on the ministry website.
                  </p>
                  <a
                    href={app.scheme.official_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btn.outline} mt-3 w-full justify-center inline-flex items-center gap-1.5`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open Ministry Portal
                  </a>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </RequireAuth>
  );
}
