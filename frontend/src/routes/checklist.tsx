import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Building2,
  MapPin,
  Clock,
  Send,
  UploadCloud,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PageHeader, btn, card } from "@/components/site/Layout";
import { RequireAuth } from "@/components/site/AuthGate";
import { DocumentUploads } from "@/components/site/DocumentUploads";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";

const searchSchema = z.object({
  schemeId: z.string().optional(),
});

export const Route = createFileRoute("/checklist")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your Document Checklist – KisanSarthi" },
      { name: "description", content: "Prepare your verified scheme documents and track real upload readiness with KisanSarthi." },
      { property: "og:title", content: "Your Document Checklist – KisanSarthi" },
      { property: "og:description", content: "Track verified document readiness for official government farmer schemes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Checklist,
});

export interface AvailableDocument {
  requirement_name: string;
  doc_type: string;
  document_id: string;
  file_name: string;
  uploaded_at: string;
  land_record_id?: string | null;
  application_id?: string | null;
  verification_status?: string;
  confirmation_status?: string;
  reason?: string;
}

export interface MissingDocument {
  name: string;
  doc_type: string;
  purpose: string;
  mandatory: boolean;
}

export interface ChecklistData {
  scheme: {
    id: string;
    name: string;
    department: string;
    state: string;
    benefits?: string;
  };
  eligibility: {
    status: string;
    reasons?: { summary?: string };
  };
  checklist: {
    required: { name: string; doc_type?: string; purpose?: string; mandatory?: boolean }[];
    available: AvailableDocument[];
    missing: MissingDocument[];
    needing_verification: AvailableDocument[];
  };
  checklist_summary: {
    total_required: number;
    total_available: number;
    total_missing: number;
    total_needing_verification: number;
    is_complete: boolean;
    completion_percentage: number;
  };
  application?: {
    id: string;
    status: string;
    submitted_at?: string;
    created_at?: string;
  } | null;
  can_apply?: boolean;
}

export interface SchemeOption {
  scheme_id: string;
  scheme_name: string;
}

function Checklist() {
  const search = Route.useSearch();
  const { lang, t } = useLanguage();
  useDocumentTitle(t.meta.checklistTitle);
  const cp = t.checklistPage;

  const [schemesList, setSchemesList] = useState<SchemeOption[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(search.schemeId || "");
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Application creation states
  const [applying, setApplying] = useState<boolean>(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccessMsg, setApplySuccessMsg] = useState<string | null>(null);

  // Direct upload for specific missing document
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploadDocError, setUploadDocError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetDocTypeRef = useRef<string>("");

  // ── 1. Fetch Active Schemes to Populate Selector ──
  useEffect(() => {
    async function loadSchemes() {
      try {
        const res = await api.get<{ success?: boolean; data?: { scheme_id: string; scheme_name: string }[] }>("/personalized-schemes");
        if (res?.data && Array.isArray(res.data) && res.data.length > 0 && res.data[0]) {
          setSchemesList(res.data);
          if (!selectedSchemeId) {
            setSelectedSchemeId(res.data[0].scheme_id);
          }
        }
      } catch (err) {
        console.warn("Failed to load schemes for checklist:", err);
      }
    }
    void loadSchemes();
  }, [selectedSchemeId]);

  // ── 2. Fetch Detailed Document Checklist for Selected Scheme ──
  const fetchChecklist = useCallback(async () => {
    if (!selectedSchemeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        success?: boolean;
        data?: ChecklistData;
      }>(`/personalized-schemes/${selectedSchemeId}`);

      if (res?.data && res.data.checklist) {
        setChecklistData(res.data);
      }
    } catch (err) {
      console.error("Failed to load scheme checklist:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load document checklist. Please check your connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedSchemeId]);

  useEffect(() => {
    void fetchChecklist();
  }, [fetchChecklist]);

  // ── 3. Handle Direct Upload for Missing Document ──
  function triggerUploadForDoc(docType: string) {
    targetDocTypeRef.current = docType;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleDocFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const docType = targetDocTypeRef.current || "document";
    setUploadingDocType(docType);
    setUploadDocError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", docType);

      await api.upload("/land-records/upload", formData);
      await fetchChecklist();
    } catch (err) {
      console.error("Failed to upload document:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to upload document. Please try again.";
      setUploadDocError(msg);
    } finally {
      setUploadingDocType(null);
    }
  }

  // ── 4. Handle Scheme Application Submission ──
  async function handleApplyForScheme() {
    if (!selectedSchemeId || !checklistData) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccessMsg(null);
    try {
      // Ensure latest eligibility result exists
      try {
        await api.get(`/eligibility/${selectedSchemeId}`);
      } catch {
        // Continue if evaluation was already recorded
      }

      const availableDocIds = checklistData.checklist.available
        .map((d) => d.document_id)
        .filter(Boolean);

      // Create application draft
      const createRes = await api.post<{
        success?: boolean;
        data?: { id: string; status: string; scheme_name?: string };
        message?: string;
      }>("/applications", {
        scheme_id: selectedSchemeId,
        document_ids: availableDocIds,
      });

      const appId = createRes?.data?.id;
      if (!appId) {
        throw new Error(createRes?.message || "Failed to create application draft.");
      }

      // Submit application packet for tracking
      await api.patch(`/applications/${appId}/submit`);

      setApplySuccessMsg(
        lang === "hi"
          ? `आवेदन सफलतापूर्वक प्रस्तुत किया गया! संदर्भ आईडी: #${appId.slice(0, 8)}`
          : `Application packet submitted successfully for tracking! Reference ID: #${appId.slice(0, 8)}`
      );

      // Reload checklist
      await fetchChecklist();
    } catch (err) {
      console.error("Failed to apply for scheme:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to submit scheme application. Please try again.";
      setApplyError(msg);
    } finally {
      setApplying(false);
    }
  }

  const summary = checklistData?.checklist_summary;
  const pct = summary?.completion_percentage ?? 0;
  const count = summary?.total_available ?? 0;
  const total = summary?.total_required ?? 0;

  // Determine whether all required documents are verified
  const isAllVerified = Boolean(
    summary?.is_complete ||
      (total > 0 && count === total && (summary?.total_missing ?? 0) === 0 && (summary?.total_needing_verification ?? 0) === 0)
  );

  const schemeName =
    checklistData?.scheme?.id && t.schemesData[checklistData.scheme.id]?.name
      ? t.schemesData[checklistData.scheme.id]?.name
      : checklistData?.scheme?.name ?? "Government Scheme";

  return (
    <RequireAuth>
      <PageHeader
        title={lang === "hi" ? "आपकी योजना दस्तावेज़ चेकलिस्ट" : cp.title}
        subtitle={
          lang === "hi"
            ? "आवश्यक सरकारी दस्तावेज़ों की तैयारी जांचें, अपलोड करें और सत्यापन उपरांत आवेदन करें।"
            : "Check required documents, verify land & identity proof, and apply directly once ready."
        }
      />

      {/* Hidden File Input for Direct Document Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => void handleDocFileInput(e)}
      />

      {/* Integrated Land Record Upload & OCR Section */}
      <DocumentUploads onRecordConfirmed={() => void fetchChecklist()} />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
        {/* Main Checklist Card */}
        <div className={`${card} lg:col-span-2`}>
          {/* Scheme Switcher Tabs */}
          {schemesList.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-2 border-b pb-4">
              <span className="text-xs font-semibold text-muted-foreground self-center mr-1">
                {lang === "hi" ? "योजना चुनें:" : "Select Scheme:"}
              </span>
              {schemesList.map((s) => {
                const isSelected = selectedSchemeId === s.scheme_id;
                const locName = t.schemesData[s.scheme_id]?.name || s.scheme_name;
                return (
                  <button
                    key={s.scheme_id}
                    onClick={() => {
                      setSelectedSchemeId(s.scheme_id);
                      setApplyError(null);
                      setApplySuccessMsg(null);
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {locName}
                  </button>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Loading verified document checklist...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-2 text-sm text-destructive font-medium">{error}</p>
              <button onClick={() => void fetchChecklist()} className={`${btn.primary} mt-4 text-xs`}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : checklistData ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{cp.selectedScheme}</p>
                  <h2 className="text-xl font-bold text-primary mt-0.5">{schemeName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-primary" /> {checklistData.scheme.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> {checklistData.scheme.state}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success border border-success/30">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Checklist
                </span>
              </div>

              {/* Upload Error Banner if Any */}
              {uploadDocError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{uploadDocError}</span>
                </div>
              )}

              {/* Categorized Document List */}
              <div className="mt-6 space-y-4">
                {/* Available / Uploaded Documents */}
                {checklistData.checklist.available.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-success mb-2">
                      {lang === "hi" ? "सत्यापित एवं उपलब्ध दस्तावेज़" : "Uploaded & Available Documents"} (
                      {checklistData.checklist.available.length})
                    </h3>
                    <ul className="space-y-2.5">
                      {checklistData.checklist.available.map((d) => (
                        <li
                          key={d.document_id}
                          className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft/30 p-3.5 text-sm"
                        >
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{d.requirement_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              File: {d.file_name} • Uploaded {new Date(d.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Documents Needing Verification */}
                {checklistData.checklist.needing_verification.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-foreground mb-2">
                      {lang === "hi" ? "सत्यापन अपेक्षित दस्तावेज़" : "Documents Pending Verification"} (
                      {checklistData.checklist.needing_verification.length})
                    </h3>
                    <ul className="space-y-2.5">
                      {checklistData.checklist.needing_verification.map((d) => (
                        <li
                          key={d.document_id}
                          className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-soft p-3.5 text-sm"
                        >
                          <Clock className="h-5 w-5 shrink-0 text-gold-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{d.requirement_name}</p>
                            <p className="text-xs text-gold-foreground/90">{d.reason || "Verification required"}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">File: {d.file_name}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Required Documents */}
                {checklistData.checklist.missing.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {lang === "hi" ? "अपेक्षित अनुपलब्ध दस्तावेज़" : "Missing Required Documents"} (
                      {checklistData.checklist.missing.length})
                    </h3>
                    <ul className="space-y-2.5">
                      {checklistData.checklist.missing.map((m, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border p-3.5 text-sm bg-card hover:border-primary/40 transition"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <HelpCircle className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{m.name}</p>
                                {m.mandatory && (
                                  <span className="rounded bg-destructive/10 px-1.5 py-0.2 text-[10px] font-bold text-destructive uppercase">
                                    Mandatory
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{m.purpose}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={uploadingDocType === m.doc_type}
                            onClick={() => triggerUploadForDoc(m.doc_type)}
                            className="shrink-0 text-xs font-semibold h-8 rounded-lg border-primary/40 text-primary hover:bg-primary/10"
                          >
                            {uploadingDocType === m.doc_type ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>{lang === "hi" ? "अपलोड हो रहा है..." : "Uploading..."}</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="h-3.5 w-3.5" />
                                <span>{lang === "hi" ? "अपलोड करें" : "Upload"}</span>
                              </>
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── 5. Application Action Section ── */}
                {applyError && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{applyError}</span>
                  </div>
                )}

                {applySuccessMsg && (
                  <div className="mt-4 rounded-xl border border-success/40 bg-success-soft p-4 text-xs text-success">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{applySuccessMsg}</span>
                    </div>
                    <div className="mt-3">
                      <Link to="/status" className={`${btn.primary} text-xs inline-flex items-center gap-1.5`}>
                        <span>{lang === "hi" ? "आवेदन स्थिति ट्रैक करें" : "Track Application Progress"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Existing Application Banner */}
                {checklistData.application ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                          <FileCheck2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {lang === "hi" ? "योजना आवेदन प्रस्तुत" : "Application Submitted"}
                            </span>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary border border-primary/20">
                              {checklistData.application.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lang === "hi" ? "संदर्भ संख्या" : "Reference"}: #{checklistData.application.id.slice(0, 8)} •{" "}
                            {checklistData.application.submitted_at
                              ? new Date(checklistData.application.submitted_at).toLocaleDateString()
                              : "Recent"}
                          </p>
                        </div>
                      </div>
                      <Link to="/status" className={`${btn.primary} text-xs inline-flex items-center gap-1.5`}>
                        <span>{lang === "hi" ? "आवेदन स्थिति ट्रैक करें" : "Track Application"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : isAllVerified ? (
                  /* Option to Apply When All Documents Are Verified */
                  <div className="rounded-xl border-2 border-success/40 bg-success-soft/30 p-5 mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-success text-success-foreground shrink-0 mt-0.5">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground text-base">
                              {lang === "hi" ? "सभी दस्तावेज़ सत्यापित — आवेदन के लिए तैयार" : "All Documents Verified — Ready to Apply"}
                            </h4>
                            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success border border-success/30">
                              100% Ready
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {lang === "hi"
                              ? "आपके सभी आवश्यक वैधानिक दस्तावेज़ सत्यापित हो चुके हैं। आप अब इस योजना हेतु आधिकारिक आवेदन जमा कर सकते हैं।"
                              : "All required statutory documents have been uploaded and verified. You can now apply for this scheme."}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleApplyForScheme}
                        disabled={applying}
                        className={`${btn.primary} h-11 px-5 text-sm font-semibold whitespace-nowrap shrink-0`}
                      >
                        {applying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{lang === "hi" ? "आवेदन जमा हो रहा है..." : "Submitting Application..."}</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>{lang === "hi" ? "योजना हेतु आवेदन करें" : "Apply for Scheme"}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Documents Not Fully Verified Yet */
                  <div className="rounded-xl border border-muted-foreground/20 bg-secondary/30 p-4 mt-6 flex items-start gap-3 text-xs text-muted-foreground">
                    <Clock className="h-5 w-5 text-gold-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {lang === "hi" ? "दस्तावेज़ सत्यापन प्रगति पर है" : "Document Verification in Progress"}
                      </p>
                      <p className="mt-0.5">
                        {lang === "hi"
                          ? `योजना में आवेदन अनलॉक करने के लिए कृपया शेष ${summary?.total_missing ?? 0} दस्तावेज़ अपलोड एवं सत्यापित करें।`
                          : `Please upload and verify the remaining ${summary?.total_missing ?? 0} document(s) above to unlock scheme application.`}
                      </p>
                    </div>
                    <Button disabled size="sm" variant="outline" className="opacity-60 cursor-not-allowed text-xs">
                      {lang === "hi" ? "आवेदन लॉक है (100% आवश्यक)" : "Apply Locked (100% Required)"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Real Progress Sidebar */}
        <aside className={`${card} h-fit space-y-4`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {cp.progressLabel}
            </p>
            <p className="mt-1 text-4xl font-extrabold text-primary">{pct}%</p>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100 ? "bg-success" : pct > 50 ? "bg-primary" : "bg-gold"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              {summary ? `${count} of ${total} required documents ready` : "Calculating readiness..."}
            </p>
          </div>

          <div className="border-t pt-4 text-xs text-muted-foreground space-y-2">
            <div className="flex justify-between">
              <span>Ready Documents:</span>
              <span className="font-semibold text-success">{count}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Verification:</span>
              <span className="font-semibold text-gold-foreground">
                {summary?.total_needing_verification ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Missing Documents:</span>
              <span className="font-semibold text-destructive">{summary?.total_missing ?? 0}</span>
            </div>
          </div>

          <button
            onClick={() => void fetchChecklist()}
            className={`${btn.outline} w-full text-xs justify-center flex items-center gap-2`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Readiness
          </button>

          {/* Action Button in Sidebar */}
          {checklistData?.application ? (
            <Link
              to="/status"
              className={`${btn.primary} w-full text-xs justify-center flex items-center gap-2 h-10 mt-2`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>{lang === "hi" ? "आवेदन स्थिति देखें" : "View Application Status"}</span>
            </Link>
          ) : isAllVerified ? (
            <Button
              onClick={handleApplyForScheme}
              disabled={applying}
              className={`${btn.primary} w-full text-xs justify-center flex items-center gap-2 h-10 mt-2`}
            >
              {applying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{lang === "hi" ? "आवेदन हो रहा है..." : "Applying..."}</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{lang === "hi" ? "योजना हेतु आवेदन करें" : "Apply for Scheme"}</span>
                </>
              )}
            </Button>
          ) : (
            <div className="pt-2">
              <Button
                disabled
                className="w-full text-xs justify-center flex items-center gap-2 h-10 opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{lang === "hi" ? "आवेदन (100% आवश्यक)" : "Apply (100% Required)"}</span>
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                {lang === "hi"
                  ? "सभी दस्तावेज़ सत्यापित होने पर आवेदन विकल्प खुलेगा।"
                  : "Unlocks once all documents are verified."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </RequireAuth>
  );
}

