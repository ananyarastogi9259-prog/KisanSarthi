import { useEffect, useRef, useState, useCallback } from "react";
import {
  FileText,
  Image,
  UploadCloud,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
  Building2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize, validateUpload } from "@/lib/upload-validation";
import { useLanguage, type Language } from "@/lib/i18n";
import { api, ApiClientError } from "@/lib/api";
import { card, btn } from "@/components/site/Layout";

export interface ExtractedAttributes {
  survey_number?: string | null;
  khata_number?: string | null;
  land_area?: number | string | null;
  area_unit?: string | null;
  state?: string | null;
  district?: string | null;
  village?: string | null;
  tehsil?: string | null;
  holder_name?: string | null;
}

export interface UploadedRecordDraft {
  land_record_id: string;
  document_id: string;
  status: string;
  extracted_attributes: ExtractedAttributes;
  ocr_metadata?: {
    provider?: string;
    confidence?: number;
    file_name?: string;
  };
}

export interface ExistingLandRecord {
  id: string;
  survey_number: string | null;
  land_area: number | null;
  area_unit: string | null;
  state: string;
  district: string | null;
  village: string | null;
  record_type: string | null;
  verification_status: string;
  extracted_data?: {
    confirmation_status?: string;
    khata_number?: string | null;
    tehsil?: string | null;
  } | null;
  created_at?: string;
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];

async function check(file: File, lang: Language, invalidTypeMsg: string) {
  if (!ALLOWED.includes(file.type)) return invalidTypeMsg;
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return validateUpload({ name: file.name, size: file.size, type: file.type }, header, lang);
}

export function DocumentUploads({ onRecordConfirmed }: { onRecordConfirmed?: () => void }) {
  const { lang, t } = useLanguage();
  const u = t.uploads;

  const [existingRecords, setExistingRecords] = useState<ExistingLandRecord[]>([]);
  const [loadingExisting, setLoadingExisting] = useState<boolean>(true);

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [currentDraft, setCurrentDraft] = useState<UploadedRecordDraft | null>(null);
  const [editForm, setEditForm] = useState<ExtractedAttributes>({});
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<boolean>(false);

  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── 1. Fetch Existing Land Records on Mount ──
  const fetchExisting = useCallback(async () => {
    setLoadingExisting(true);
    try {
      const res = await api.get<{ success?: boolean; data?: ExistingLandRecord[] }>("/land-records");
      if (res?.data && Array.isArray(res.data)) {
        setExistingRecords(res.data);

        // If there is an unconfirmed draft record needing farmer review, populate review form
        const unconfirmed = res.data.find(
          (r) => r.extracted_data?.confirmation_status === "unconfirmed"
        );
        if (unconfirmed && !currentDraft) {
          const fields = (unconfirmed.extracted_data as ExtractedAttributes) || {};
          setCurrentDraft({
            land_record_id: unconfirmed.id,
            document_id: unconfirmed.extracted_data?.document_id || "",
            status: "draft",
            extracted_attributes: {
              survey_number: unconfirmed.survey_number,
              khata_number: fields.khata_number,
              land_area: unconfirmed.land_area,
              area_unit: unconfirmed.area_unit,
              state: unconfirmed.state,
              district: unconfirmed.district,
              village: unconfirmed.village,
              tehsil: fields.tehsil,
            },
          });
          setEditForm({
            survey_number: unconfirmed.survey_number || "",
            khata_number: fields.khata_number || "",
            land_area: unconfirmed.land_area !== undefined && unconfirmed.land_area !== null ? unconfirmed.land_area : "",
            area_unit: unconfirmed.area_unit || "acres",
            state: unconfirmed.state || "Uttar Pradesh",
            district: unconfirmed.district || "",
            village: unconfirmed.village || "",
            tehsil: fields.tehsil || "",
          });
        }
      }
    } catch (err) {
      console.warn("Could not load existing land records:", err);
    } finally {
      setLoadingExisting(false);
    }
  }, [currentDraft]);

  useEffect(() => {
    void fetchExisting();
  }, [fetchExisting]);

  // ── 2. Handle Document Upload with Backend OCR ──
  async function handleFileUpload(files: File[]) {
    if (!files || files.length === 0 || !files[0]) return;
    const file = files[0];

    setUploadError(null);
    setUploadSuccess(null);
    setConfirmSuccess(false);

    // Client-side validation check
    const validationErr = await check(file, lang, u.invalidTypeClient);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", "khatauni");

      const res = await api.upload<{
        success?: boolean;
        message?: string;
        data?: UploadedRecordDraft & { extracted_fields?: ExtractedAttributes };
      }>("/land-records/upload", formData);

      if (res?.data && res.data.land_record_id) {
        const anyData = res.data as Record<string, unknown>;
        const fields =
          (res.data.extracted_attributes as ExtractedAttributes) ||
          (anyData.extracted_fields as ExtractedAttributes) ||
          {};

        setCurrentDraft({
          ...res.data,
          status: res.data.status || "draft",
          extracted_attributes: fields,
        });
        setEditForm({
          survey_number: fields.survey_number || "",
          khata_number: fields.khata_number || "",
          land_area: fields.land_area !== undefined && fields.land_area !== null ? fields.land_area : "",
          area_unit: fields.area_unit || "acres",
          state: fields.state || "Uttar Pradesh",
          district: fields.district || "",
          village: fields.village || "",
          tehsil: fields.tehsil || "",
        });
        setUploadSuccess(
          res.message || "Document uploaded and OCR processed successfully. Please review and confirm extracted details."
        );
        // Refresh existing records
        void fetchExisting();
      } else {
        throw new Error("Invalid response format from upload service.");
      }
    } catch (err) {
      console.error("Upload / OCR failed:", err);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to upload document or extract OCR text. Please try again.";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }

  // ── 3. Confirm & Correct Extracted Attributes ──
  async function handleConfirmRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!currentDraft?.land_record_id) return;

    setConfirming(true);
    setConfirmError(null);
    try {
      const payload = {
        survey_number: editForm.survey_number ? String(editForm.survey_number).trim() : null,
        khata_number: editForm.khata_number ? String(editForm.khata_number).trim() : null,
        land_area: editForm.land_area ? Number(editForm.land_area) : null,
        area_unit: editForm.area_unit || "acres",
        state: editForm.state || "Uttar Pradesh",
        district: editForm.district ? String(editForm.district).trim() : null,
        village: editForm.village ? String(editForm.village).trim() : null,
        tehsil: editForm.tehsil ? String(editForm.tehsil).trim() : null,
      };

      await api.put(`/land-records/${currentDraft.land_record_id}/confirm`, payload);
      setConfirmSuccess(true);
      setCurrentDraft(null);
      void fetchExisting();
      if (onRecordConfirmed) {
        onRecordConfirmed();
      }
    } catch (err) {
      console.error("Failed to confirm land record:", err);
      const msg = err instanceof ApiClientError ? err.message : "Failed to confirm land record details. Please check your inputs.";
      setConfirmError(msg);
    } finally {
      setConfirming(false);
    }
  }

  function browseFiles(accept: string) {
    if (inputRef.current) {
      inputRef.current.accept = accept;
      inputRef.current.click();
    }
  }

  return (
    <section id="uploads" aria-labelledby="upload-title" className="mx-auto max-w-6xl px-4 py-8">
      <h2 id="upload-title" className="text-2xl font-bold text-primary">
        {lang === "hi" ? "भू-अभिलेख दस्तावेज़ अपलोड एवं ओसीआर (OCR)" : u.title}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {lang === "hi"
          ? "अपनी खतौनी, 7/12 या भूलेख प्रति अपलोड करें। हमारा ओसीआर इंजन स्वतः विवरण निकालकर पुष्टि के लिए प्रस्तुत करेगा।"
          : u.subtitle}
      </p>

      <p className="mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-secondary p-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          {lang === "hi"
            ? "दस्तावेज़ सुरक्षित रूप से निजी स्टोरेज में सहेजे जाते हैं और केवल आपकी योजना पात्रता सत्यापन हेतु उपयोग किए जाते हैं।"
            : "Documents are securely uploaded to your private storage and evaluated against official state revenue guidelines."}
        </span>
      </p>

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label={u.selectAriaLabel}
        accept={ACCEPT}
        onChange={(e) => {
          void handleFileUpload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {/* Upload Buttons */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Button
          size="lg"
          disabled={uploading}
          className="h-20 justify-start rounded-xl px-6 text-lg [&_svg]:size-7"
          onClick={() => browseFiles(".pdf")}
        >
          <FileText />
          {uploading ? "Processing PDF..." : u.uploadPdf}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={uploading}
          className="h-20 justify-start rounded-xl border-primary/30 px-6 text-lg text-primary [&_svg]:size-7"
          onClick={() => browseFiles(".jpg,.jpeg,.png")}
        >
          <Image />
          {uploading ? "Processing Photo..." : u.uploadImage}
        </Button>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFileUpload(Array.from(e.dataTransfer.files));
        }}
        className={`mt-4 flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragging ? "border-primary bg-secondary" : "border-primary/30 bg-surface"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-semibold text-primary">Uploading & Running OCR Text Extraction...</p>
            <p className="text-xs text-muted-foreground">Parsing parcel number, land area, and tehsil attributes...</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-9 w-9 text-primary" />
            <p className="font-medium">{u.dragDropPrompt}</p>
            <Button size="lg" className="h-12 rounded-xl" onClick={() => browseFiles(ACCEPT)}>
              {u.browseFiles}
            </Button>
            <p className="text-xs text-muted-foreground">{u.fileLimitHint}</p>
          </>
        )}
      </div>

      {/* Status Messages */}
      {uploadError && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Upload Failed</p>
            <p className="mt-0.5 text-xs text-destructive/90">{uploadError}</p>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Upload & OCR Successful</p>
            <p className="mt-0.5 text-xs">{uploadSuccess}</p>
          </div>
        </div>
      )}

      {/* OCR Review & Confirmation Form (Visible when draft is active) */}
      {currentDraft && (
        <div className={`${card} mt-6 border-primary/40 bg-secondary/30 p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-foreground border border-gold/40">
                Draft – Requires Confirmation
              </span>
              <h3 className="mt-1 text-lg font-bold text-foreground">Review & Confirm Extracted Land Details</h3>
            </div>
            {currentDraft.ocr_metadata && (
              <p className="text-xs text-muted-foreground">
                OCR Confidence: {Math.round((currentDraft.ocr_metadata.confidence || 0) * 100)}% (
                {currentDraft.ocr_metadata.provider})
              </p>
            )}
          </div>

          {confirmError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{confirmError}</span>
            </div>
          )}

          <form onSubmit={handleConfirmRecord} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-foreground">Survey / Khasra No.</label>
              <input
                type="text"
                value={editForm.survey_number ?? ""}
                onChange={(e) => setEditForm({ ...editForm, survey_number: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 142/1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Khata Number</label>
              <input
                type="text"
                value={editForm.khata_number ?? ""}
                onChange={(e) => setEditForm({ ...editForm, khata_number: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 00342"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Land Area</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={editForm.land_area ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, land_area: e.target.value ? Number(e.target.value) : "" })}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. 2.5"
                />
                <select
                  value={editForm.area_unit || "acres"}
                  onChange={(e) => setEditForm({ ...editForm, area_unit: e.target.value })}
                  className="h-10 rounded-lg border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="bigha">Bigha</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Village</label>
              <input
                type="text"
                value={editForm.village ?? ""}
                onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Pipraich"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">Tehsil</label>
              <input
                type="text"
                value={editForm.tehsil ?? ""}
                onChange={(e) => setEditForm({ ...editForm, tehsil: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Sadar"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground">District & State</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={editForm.district ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="District"
                />
                <input
                  type="text"
                  value={editForm.state ?? "Uttar Pradesh"}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="State"
                />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 mt-2 flex flex-wrap gap-3">
              <Button type="submit" disabled={confirming} className={btn.primary}>
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirming...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Confirm & Save Land Record
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCurrentDraft(null)}>
                Dismiss
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmed Success Alert */}
      {confirmSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/40 bg-success-soft p-4 text-sm text-success font-medium">
          <CheckCircle2 className="h-5 w-5" />
          <span>Land record confirmed by farmer and added to your verified land portfolio.</span>
        </div>
      )}

      {/* Existing Land Records Portfolio */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-foreground">
          {lang === "hi" ? "आपके पंजीकृत भू-अभिलेख" : "Your Registered Land Records"}
        </h3>
        {loadingExisting ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading land records...</p>
        ) : existingRecords.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No land records found. Upload a Khatauni/RoR document above to evaluate scheme eligibility.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {existingRecords.map((r) => {
              const isConfirmed = r.extracted_data?.confirmation_status === "confirmed_by_farmer";
              return (
                <div key={r.id} className={`${card} p-4 border bg-card/60 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        Khasra #{r.survey_number || "Unspecified"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isConfirmed
                            ? "bg-success-soft text-success border border-success/30"
                            : "bg-gold-soft text-gold-foreground border border-gold/40"
                        }`}
                      >
                        {isConfirmed ? "Confirmed" : "Draft"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {r.land_area ? `${r.land_area} ${r.area_unit || "acres"}` : "Area not recorded"}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      <span>
                        {r.village ? `${r.village}, ` : ""}
                        {r.district ? `${r.district}, ` : ""}
                        {r.state}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="uppercase">{r.record_type || "Land Record"}</span>
                    <span>Status: {r.verification_status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
