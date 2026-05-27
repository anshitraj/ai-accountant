import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus, Table2, Landmark, ReceiptText, BookOpen, BadgeIndianRupee, Users, CreditCard, WalletCards } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { PageTransition, UploadCard } from "@/components/app/finverify-ui";
import { formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UploadBatch {
  id: number;
  sourceType: string;
  fileName: string;
  status: string;
  uploadedAt: string;
  recordCount?: number | null;
}

interface MappingPreview {
  uploadId?: number;
  sourceType: string;
  fileName: string;
  rowCount: number;
  detectedColumns: string[];
  mode: string;
  parser?: string;
  processingStatus: string;
  processingTone: "success" | "warning" | "error" | "neutral";
  sheetNames?: string[];
  pageCount?: number | null;
  textPreview?: string | null;
  textLength?: number | null;
  tablesDetected?: number | null;
  notes?: string[];
  aiExtraction?: AIExtractionResult | null;
  imported?: UploadImportSummary | null;
  reconciliation?: ReconciliationSummary | null;
}

interface UploadResult extends UploadBatch {
  parsing?: {
    documentId: number;
    parser: string;
    status?: string;
    rowCount?: number | null;
    detectedColumns?: string[];
    sheetNames?: string[];
    pageCount?: number | null;
    textPreview?: string | null;
    textLength?: number | null;
    tablesDetected?: number | null;
    notes?: string[];
  };
  aiExtraction?: MappingPreview["aiExtraction"];
  imported?: UploadImportSummary | null;
  reconciliation?: ReconciliationSummary | null;
}

interface UploadImportSummary {
  table: string | null;
  inserted: number;
  skipped: number;
  notes: string[];
}

interface ReconciliationSummary {
  matchesFound: number;
  newVerified: number;
  newPotential: number;
  newUnverified: number;
}

interface InvoiceExtractionData {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  vendorName: string | null;
  customerName: string | null;
  vendorGstin: string | null;
  customerGstin: string | null;
  subtotalAmount: number | null;
  gstAmount: number | null;
  totalAmount: number | null;
  currency: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
  sourceQuotes: string[];
}

interface AIExtractionResult {
  id?: number;
  provider: string;
  model?: string | null;
  confidence: number;
  status: string;
  source?: string;
  usedFallback?: boolean;
  reviewLabel?: string;
  data?: InvoiceExtractionData | null;
  error?: string | null;
}

interface SelectedFilePreview {
  name: string;
  url: string;
  kind: "pdf" | "image" | "file";
}

type ExtractionAction = "accept" | "reject" | null;

const SOURCE_TYPES = [
  { value: "bank", label: "Bank Statement" },
  { value: "invoices", label: "Invoices" },
  { value: "tally", label: "Tally Export" },
  { value: "zoho", label: "Zoho Export" },
  { value: "gst", label: "GST 2B / 3B" },
  { value: "payroll", label: "Payroll Sheet" },
  { value: "gateway", label: "Gateway Settlement" },
  { value: "expenses", label: "Expense Sheet" },
];

const EXTRACTION_STAGES = [
  "Reading parsed text",
  "Sending schema to provider",
  "Extracting invoice fields",
  "Validating JSON",
  "Saving pending review",
];

async function inspectFile(file: File, activeSourceType: string): Promise<MappingPreview> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const detectedColumns = (lines[0] ?? "")
      .split(",")
      .map(col => col.trim().replace(/^"|"$/g, ""))
      .filter(Boolean)
      .slice(0, 12);
    return {
      sourceType: activeSourceType,
      fileName: file.name,
      rowCount: Math.max(lines.length - 1, 0),
      detectedColumns,
      mode: "CSV parsed locally. Rows are counted and columns are mapped for review.",
      parser: "csv",
      processingStatus: "Local preview",
      processingTone: "neutral",
    };
  }

  if (["xlsx", "xls"].includes(extension ?? "")) {
    return {
      sourceType: activeSourceType,
      fileName: file.name,
      rowCount: 0,
      detectedColumns: [],
      mode: "Excel will be parsed on the server for worksheet names, row count, and detected columns.",
      parser: "excel",
      processingStatus: "Local preview",
      processingTone: "neutral",
    };
  }

  return {
    sourceType: activeSourceType,
    fileName: file.name,
    rowCount: 0,
    detectedColumns: [],
    mode: extension === "pdf"
      ? "PDF text will be extracted on the server for preview and mapping."
      : "Image metadata will be stored. OCR is still future work unless an extractor is configured.",
    parser: extension === "pdf" ? "pdf" : "unsupported",
    processingStatus: "Local preview",
    processingTone: "neutral",
  };
}

function statusCopy(result: UploadResult) {
  const parserStatus = result.parsing?.status;
  if (result.status === "processed" && parserStatus === "parsed") {
    return {
      message: "File parsed and audit logged successfully.",
      processingStatus: "Parsed + audit logged",
      tone: "success" as const,
    };
  }
  if (result.status === "metadata_only") {
    return {
      message: "File captured and audit logged. Parsing needs CA review.",
      processingStatus: "Metadata captured + audit logged",
      tone: "warning" as const,
    };
  }
  return {
    message: "File captured and audit logged.",
    processingStatus: "Captured + audit logged",
    tone: "success" as const,
  };
}

function serverMode(result: UploadResult) {
  const parser = String(result.parsing?.parser ?? "file").toUpperCase();
  if (result.parsing?.status === "parsed") return `${parser} parsed server-side.`;
  if (result.parsing?.parser === "pdf") return "PDF metadata captured server-side. Text extraction needs review.";
  return "File metadata captured server-side. Parser extraction needs review.";
}

function messageClasses(tone: "success" | "warning" | "error") {
  if (tone === "success") return "bg-success/10 text-success border border-success/20";
  if (tone === "warning") return "bg-warning/10 text-warning border border-warning/20";
  return "bg-destructive/10 text-destructive border border-destructive/20";
}

function processingClasses(tone: MappingPreview["processingTone"]) {
  if (tone === "success") return "text-success";
  if (tone === "warning") return "text-warning";
  if (tone === "error") return "text-destructive";
  return "text-muted-foreground";
}

function previewKind(file: File): SelectedFilePreview["kind"] {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg"].includes(extension ?? "")) return "image";
  return "file";
}

function extractionProviderLabel(provider?: string) {
  if (!provider) return "-";
  if (provider === "gemini") return "Gemini";
  if (provider === "nvidia") return "NVIDIA";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "rule_based") return "Rule-based";
  return provider;
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Needs review";
  return String(value);
}

function supportsInvoiceExtraction(source: string) {
  return ["invoice", "invoices"].includes(source);
}

function sourceLabel(source: string) {
  return SOURCE_TYPES.find(t => t.value === source)?.label || source;
}

function uploadFolderName(source: string) {
  return `${sourceLabel(source)} folder`;
}

export default function UploadsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [sourceType, setSourceType] = useState("bank");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "warning" | "error">("success");
  const [preview, setPreview] = useState<MappingPreview | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<SelectedFilePreview | null>(null);
  const [aiExtraction, setAiExtraction] = useState<AIExtractionResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStageIndex, setAiStageIndex] = useState(0);
  const [pendingAction, setPendingAction] = useState<ExtractionAction>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pendingSourceTypeRef = useRef(sourceType);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    if (!aiLoading) return;
    setAiProgress(3);
    setAiStageIndex(0);
    const timer = window.setInterval(() => {
      setAiProgress(current => {
        const next = Math.min(current + Math.max(1, Math.round((96 - current) / 10)), 96);
        setAiStageIndex(Math.min(Math.floor(next / 20), EXTRACTION_STAGES.length - 1));
        return next;
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [aiLoading]);

  const { data = [], isLoading } = useQuery<UploadBatch[]>({
    queryKey: ["uploads"],
    queryFn: () => fetch(`${BASE}/api/uploads`).then(r => r.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, activeSourceType }: { file: File; activeSourceType: string }) => {
      const parsed = await inspectFile(file, activeSourceType);
      setPreview(parsed);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sourceType", activeSourceType);
      fd.append("enableAiExtraction", "false");
      const res = await fetch(`${BASE}/api/uploads`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        let detail = "Please try again.";
        try {
          const payload = await res.json();
          detail = payload.detail || payload.error || detail;
        } catch {
          detail = res.statusText || detail;
        }
        throw new Error(detail);
      }
      const result = await res.json() as UploadResult;
      const copy = statusCopy(result);
      if (result.parsing) {
        setPreview({
          uploadId: result.id,
          sourceType: result.sourceType,
          fileName: result.fileName,
          rowCount: result.parsing.rowCount ?? 0,
          detectedColumns: result.parsing.detectedColumns ?? [],
          mode: serverMode(result),
          parser: result.parsing.parser,
          processingStatus: copy.processingStatus,
          processingTone: copy.tone,
          sheetNames: result.parsing.sheetNames,
          pageCount: result.parsing.pageCount,
          textPreview: result.parsing.textPreview,
          textLength: result.parsing.textLength,
          tablesDetected: result.parsing.tablesDetected,
          notes: result.parsing.notes,
          aiExtraction: result.aiExtraction,
          imported: result.imported ?? null,
          reconciliation: result.reconciliation ?? null,
        });
        setAiExtraction(result.aiExtraction ?? null);
      }
      return result;
    },
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ["uploads"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["payroll"] });
      qc.invalidateQueries({ queryKey: ["gateway"] });
      qc.invalidateQueries({ queryKey: ["reconciliation"] });
      const copy = statusCopy(result);
      const importMessage = result.imported?.inserted
        ? ` Imported ${result.imported.inserted} rows into ${result.imported.table?.replace(/_/g, " ")}.`
        : "";
      const matchMessage = result.reconciliation?.matchesFound
        ? ` Found ${result.reconciliation.matchesFound} new rule-based matches.`
        : "";
      setMessage(`Uploaded successfully to ${uploadFolderName(result.sourceType)}. ${copy.message}${importMessage}${matchMessage}`);
      setMessageTone(copy.tone);
      setUploading(false);
      setTimeout(() => setMessage(""), copy.tone === "warning" ? 5000 : 3000);
    },
    onError: error => {
      setPreview(current => current ? {
        ...current,
        processingStatus: "Upload failed",
        processingTone: "error",
      } : current);
      setMessage(error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed. Please try again.");
      setMessageTone("error");
      setUploading(false);
    },
  });

  const handleFile = (file: File, activeSourceType = sourceType) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSelectedFilePreview({
      name: file.name,
      url,
      kind: previewKind(file),
    });
    setAiExtraction(null);
    setAiError("");
    setUploading(true);
    uploadMutation.mutate({ file, activeSourceType });
  };

  const handleFiles = (files: FileList | File[], activeSourceType = sourceType) => {
    const list = Array.from(files);
    list.forEach(file => handleFile(file, activeSourceType));
  };

  const selectSourceType = (nextSourceType: string) => {
    pendingSourceTypeRef.current = nextSourceType;
    setSourceType(nextSourceType);
    setPreview(null);
    setSelectedFilePreview(null);
    setAiExtraction(null);
    setAiError("");
  };

  const runAiExtraction = async () => {
    if (!preview?.uploadId) return;
    if (!supportsInvoiceExtraction(preview.sourceType)) {
      setAiError("Invoice extraction can only run on invoice uploads.");
      return;
    }
    setAiLoading(true);
    setAiProgress(0);
    setAiStageIndex(0);
    setAiError("");
    toast({ title: "AI extraction started", description: "Gemini is reading the parsed invoice text." });
    try {
      const res = await fetch(`${BASE}/api/ai/extract-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: preview.uploadId }),
      });
      const result = await res.json() as AIExtractionResult & { error?: string };
      if (!res.ok) throw new Error(result.error || "AI extraction failed");
      setAiProgress(100);
      setAiExtraction(result);
      setPreview(current => current ? { ...current, aiExtraction: result } : current);
      toast({
        title: "AI extracted — pending review",
        description: `${extractionProviderLabel(result.provider)} returned ${Math.round(result.confidence * 100)}% confidence.`,
      });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI extraction failed");
      toast({ title: "AI extraction failed", description: "Rule-based extraction is available.", variant: "destructive" });
    } finally {
      window.setTimeout(() => setAiLoading(false), 450);
    }
  };

  const updateExtractionStatus = async (action: "accept" | "reject") => {
    if (!aiExtraction?.id) return;
    const previous = aiExtraction;
    const optimisticLabel = action === "accept" ? "Accepted for reconciliation" : "Rejected";
    setPendingAction(action);
    setAiError("");
    setAiExtraction(current => current ? {
      ...current,
      status: action === "accept" ? "accepted" : "rejected",
      reviewLabel: optimisticLabel,
    } : current);
    toast({
      title: optimisticLabel,
      description: action === "accept" ? "Saving reviewed invoice fields..." : "Rejecting pending extraction...",
    });
    try {
      const res = await fetch(`${BASE}/api/ai/extractions/${aiExtraction.id}/${action}`, {
        method: "POST",
      });
      const result = await res.json() as { error?: string; status?: string; label?: string };
      if (!res.ok) throw new Error(result.error || `Could not ${action} extraction`);
      setAiExtraction(current => current ? {
        ...current,
        status: result.status ?? action,
        reviewLabel: result.label ?? (action === "accept" ? "Accepted for reconciliation" : "Rejected"),
      } : current);
      setMessage(action === "accept" ? "Accepted for reconciliation." : "AI extraction rejected.");
      setMessageTone(action === "accept" ? "success" : "warning");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["uploads"] });
    } catch (error) {
      setAiExtraction(previous);
      setAiError(error instanceof Error ? error.message : `Could not ${action} extraction`);
      toast({
        title: action === "accept" ? "Accept failed" : "Reject failed",
        description: error instanceof Error ? error.message : `Could not ${action} extraction`,
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files, sourceType);
  };

  const statusIcon = (status: string) => {
    if (status === "processed") return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === "failed") return <AlertCircle className="w-4 h-4 text-destructive" />;
    if (status === "metadata_only") return <AlertCircle className="w-4 h-4 text-warning" />;
    return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
  };

  const uploadCards = [
    { source: "bank", title: "Bank Statement", formats: "CSV, Excel, PDF statement exports", icon: Landmark, status: "Available now" as const },
    { source: "invoices", title: "Invoices", formats: "CSV, Excel, PDF, JPG, PNG", icon: ReceiptText, status: "Available now" as const },
    { source: "tally", title: "Tally Export", formats: "Excel or CSV ledger/voucher export", icon: BookOpen, status: "Upload-based" as const },
    { source: "zoho", title: "Zoho Export", formats: "Excel or CSV invoice/bill export", icon: FileText, status: "Upload-based" as const },
    { source: "gst", title: "GST/TDS", formats: "GST 2B/3B and TDS sheets", icon: BadgeIndianRupee, status: "Upload-based" as const },
    { source: "payroll", title: "Payroll", formats: "Salary register CSV or Excel", icon: Users, status: "Available now" as const },
    { source: "gateway", title: "Gateway Settlements", formats: "Razorpay, Cashfree, Stripe CSV exports", icon: CreditCard, status: "Upload-based" as const },
    { source: "expenses", title: "Expenses", formats: "Expense sheet CSV, Excel, PDF", icon: WalletCards, status: "Available now" as const },
  ];

  return (
    <PageTransition className="mx-auto max-w-6xl">
      <PageHeader title="Upload Center" subtitle="Upload finance files for rule-based parsing, mapping, and verification" />

      <div className="fv-status-review mb-6 rounded-2xl border p-4 text-sm leading-6">
        <strong>Upload parsing:</strong> CSV, Excel, and PDF files are parsed server-side for row counts, columns, sheet/page metadata, and text previews. Images are stored as metadata until OCR is configured. No direct bank, GST, Tally, or gateway connection is live in this prototype.
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {uploadCards.map(card => {
          const last = data.find(item => item.sourceType === card.source);
          return (
            <UploadCard
              key={card.source}
              title={card.title}
              formats={card.formats}
              status={card.status}
              icon={card.icon}
              lastFile={last?.fileName}
              folderName={uploadFolderName(card.source)}
              onClick={() => {
                selectSourceType(card.source);
                fileRef.current?.click();
              }}
            />
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SOURCE_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => selectSourceType(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              sourceType === t.value
                ? "fv-brand-accent-bg fv-border-brand-accent"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <motion.div
        animate={{ scale: dragging ? 1.01 : 1 }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`mb-6 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors sm:p-12 ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={e => {
            if (e.target.files?.length) handleFiles(e.target.files, pendingSourceTypeRef.current);
            e.currentTarget.value = "";
          }}
        />
        {selectedFilePreview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-64 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="overflow-hidden rounded-lg border border-border bg-background" style={{ height: 226 }}>
                {selectedFilePreview.kind === "pdf" ? (
                  <iframe
                    title={`Preview of ${selectedFilePreview.name}`}
                    src={`${selectedFilePreview.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    className="h-full w-full border-0 bg-background"
                    style={{ pointerEvents: "none" }}
                  />
                ) : selectedFilePreview.kind === "image" ? (
                  <img
                    src={selectedFilePreview.url}
                    alt={`Preview of ${selectedFilePreview.name}`}
                    className="h-full w-full object-contain"
                    style={{ pointerEvents: "none" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/50">
                    <FileText className="h-10 w-10 text-muted-foreground/70" />
                  </div>
                )}
              </div>
              <div className="mt-3 truncate text-center text-sm font-medium text-foreground" title={selectedFilePreview.name}>
                {selectedFilePreview.name}
              </div>
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Inspecting and capturing metadata...
              </div>
            )}
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="text-sm text-muted-foreground">Inspecting and capturing metadata...</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">Drop files here or click to browse</div>
              <div className="text-xs text-muted-foreground mt-1">CSV, Excel, PDF, or image. CSV/Excel/PDF get server-side parsing.</div>
            </div>
            <button className="fv-button-primary mt-1">
              <Plus className="w-4 h-4" />
              Select {SOURCE_TYPES.find(t => t.value === sourceType)?.label}
            </button>
          </div>
        )}
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${messageClasses(messageTone)}`}
        >
          {message}
        </motion.div>
      )}

      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fv-card-flat mb-6 p-5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Table2 className="w-4 h-4 text-primary" />
            Mapping Preview
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">File</div>
              <div className="font-medium">{preview.fileName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Folder</div>
              <div className="font-medium">{uploadFolderName(preview.sourceType)}</div>
            </div>
            {preview.parser === "pdf" ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">PDF pages</div>
                  <div className="font-medium">{preview.pageCount ?? "Needs review"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Extracted text</div>
                  <div className="font-medium">{preview.textLength ?? preview.textPreview?.length ?? 0} characters</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">Parsed rows</div>
                  <div className="font-medium">{preview.rowCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Detected columns</div>
                  <div className="font-medium">{preview.detectedColumns.length}</div>
                </div>
              </>
            )}
            <div>
              <div className="text-xs text-muted-foreground">Processing status</div>
              <div className={`font-medium ${processingClasses(preview.processingTone)}`}>{preview.processingStatus}</div>
            </div>
            {preview.parser === "pdf" && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">Tables detected</div>
                  <div className="font-medium">{preview.tablesDetected ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">AI extraction status</div>
                  <div className="font-medium">{aiExtraction ? (aiExtraction.reviewLabel ?? "AI extracted — pending review") : "Not run"}</div>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{preview.mode}</p>
          {preview.sheetNames && preview.sheetNames.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">Sheets: {preview.sheetNames.join(", ")}</p>
          )}
          {preview.pageCount && (
            <p className="text-xs text-muted-foreground mt-2">PDF pages: {preview.pageCount}</p>
          )}
          {preview.detectedColumns.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {preview.detectedColumns.map(column => (
                <span key={column} className="px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground border border-border">
                  {column}
                </span>
              ))}
            </div>
          )}
          {preview.textPreview && (
            <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="text-xs font-medium mb-1">Text preview</div>
              <p className="text-xs text-muted-foreground line-clamp-4">{preview.textPreview}</p>
            </div>
          )}
          {preview.notes && preview.notes.length > 0 && (
            <div className="mt-3 space-y-1">
              {preview.notes.map(note => <p key={note} className="text-xs text-muted-foreground">{note}</p>)}
            </div>
          )}
          {preview.imported && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-sm font-semibold">Import result</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-border bg-background px-2.5 py-1">
                  Rows imported: {preview.imported.inserted}
                </span>
                {preview.imported.table && (
                  <span className="rounded-full border border-border bg-background px-2.5 py-1">
                    Destination: {preview.imported.table.replace(/_/g, " ")}
                  </span>
                )}
                {preview.reconciliation && (
                  <span className="rounded-full border border-border bg-background px-2.5 py-1">
                    New matches: {preview.reconciliation.matchesFound}
                  </span>
                )}
              </div>
              {preview.imported.notes.map(note => <p key={note} className="mt-2 text-xs text-muted-foreground">{note}</p>)}
            </div>
          )}
          {supportsInvoiceExtraction(preview.sourceType) ? (
          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">AI Extraction</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {aiExtraction
                    ? "Review extracted invoice fields before accepting them for reconciliation."
                    : "Extract invoice fields from the parsed text using Gemini. Results stay pending until you review them."}
                </p>
              </div>
              {!aiExtraction && (
                <button type="button" onClick={runAiExtraction} disabled={aiLoading || !preview.uploadId || !preview.textPreview} className="fv-button-primary">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
                  {aiLoading ? `Running ${aiProgress}%` : "Run AI Extraction"}
                </button>
              )}
            </div>
            {aiLoading && (
              <div className="mt-4 overflow-hidden rounded-xl border border-primary/20 bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Running extraction</div>
                    <div className="mt-1 text-xs text-muted-foreground">{EXTRACTION_STAGES[aiStageIndex]}</div>
                  </div>
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <motion.div
                      className="absolute inset-1 rounded-full border-2 border-primary border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                    />
                    <span className="text-xs font-bold text-primary">{aiProgress}%</span>
                  </div>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${aiProgress}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 18 }}
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {EXTRACTION_STAGES.map((stage, index) => (
                    <div
                      key={stage}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-medium ${
                        index <= aiStageIndex
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {stage}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {aiError && (
              <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
                {aiError === "No extracted text available. OCR required." ? aiError : "AI extraction failed. Rule-based extraction is available."}
                <button type="button" onClick={runAiExtraction} className="ml-3 font-semibold underline">Use rule-based extraction</button>
              </div>
            )}
            {aiExtraction && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="fv-status-review">AI extracted — pending review</span>
                  {aiExtraction.confidence < 0.75 && <span className="fv-status-missing">Needs review</span>}
                  <span className="rounded-full border border-border px-2.5 py-1">Provider: {extractionProviderLabel(aiExtraction.provider)}</span>
                  {aiExtraction.usedFallback && <span className="rounded-full border border-border px-2.5 py-1">Fallback used: {extractionProviderLabel(aiExtraction.provider)}</span>}
                  {aiExtraction.model && <span className="rounded-full border border-border px-2.5 py-1">Model: {aiExtraction.model}</span>}
                  <span className="rounded-full border border-border px-2.5 py-1">Confidence: {Math.round(aiExtraction.confidence * 100)}%</span>
                </div>
                {aiExtraction.confidence < 0.75 && (
                  <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                    Low confidence extraction — please review before accepting.
                  </div>
                )}
                <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Invoice No", aiExtraction.data?.invoiceNumber],
                    ["Date", aiExtraction.data?.invoiceDate],
                    ["Vendor", aiExtraction.data?.vendorName],
                    ["Customer", aiExtraction.data?.customerName],
                    ["Vendor GSTIN", aiExtraction.data?.vendorGstin],
                    ["Customer GSTIN", aiExtraction.data?.customerGstin],
                    ["Subtotal", aiExtraction.data?.subtotalAmount],
                    ["GST", aiExtraction.data?.gstAmount],
                    ["Total", aiExtraction.data?.totalAmount],
                    ["Currency", aiExtraction.data?.currency],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-background p-3">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="mt-1 font-medium">{displayValue(value)}</div>
                    </div>
                  ))}
                </div>
                {aiExtraction.data?.missingFields && aiExtraction.data.missingFields.length > 0 && (
                  <p className="text-xs text-muted-foreground">Missing fields: {aiExtraction.data.missingFields.join(", ")}</p>
                )}
                {aiExtraction.data?.warnings && aiExtraction.data.warnings.length > 0 && (
                  <div className="space-y-1">
                    {aiExtraction.data.warnings.map(warning => <p key={warning} className="text-xs text-warning">{warning}</p>)}
                  </div>
                )}
                {aiExtraction.data?.sourceQuotes && aiExtraction.data.sourceQuotes.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="mb-2 text-xs font-semibold">Source quotes</div>
                    <div className="space-y-1">
                      {aiExtraction.data.sourceQuotes.slice(0, 4).map(quote => <p key={quote} className="text-xs text-muted-foreground">{quote}</p>)}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateExtractionStatus("accept")} disabled={pendingAction !== null || aiExtraction.status === "accepted"} className="fv-button-primary">
                    {pendingAction === "accept" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {aiExtraction.status === "accepted" ? "Accepted for reconciliation" : "Accept extraction"}
                  </button>
                  <button type="button" disabled className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground">Edit fields</button>
                  <button type="button" onClick={() => updateExtractionStatus("reject")} disabled={pendingAction !== null || aiExtraction.status === "rejected"} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40">
                    {pendingAction === "reject" && <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />}
                    {aiExtraction.status === "rejected" ? "Rejected" : "Reject"}
                  </button>
                  <button type="button" disabled className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground">Send to CA review</button>
                </div>
              </div>
            )}
          </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">Document workflow</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {sourceLabel(preview.sourceType)} uploads are parsed into their matching records for rule-based reconciliation. Invoice field extraction is only available for invoice uploads.
              </p>
            </div>
          )}
        </motion.div>
      )}

      <div className="fv-card-flat overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Upload History</div>
          <div className="text-xs text-muted-foreground">{data.length} files</div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">No files uploaded yet</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map(u => (
              <div key={u.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  {statusIcon(u.status)}
                  <div>
                    <div className="text-sm font-medium">{u.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {SOURCE_TYPES.find(t => t.value === u.sourceType)?.label || u.sourceType} - {formatDate(u.uploadedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {u.recordCount !== null && u.recordCount !== undefined && <span className="text-xs text-muted-foreground">{u.recordCount} rows</span>}
                  <StatusBadge status={u.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
