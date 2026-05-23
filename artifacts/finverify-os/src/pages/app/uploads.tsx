import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus, Table2, Landmark, ReceiptText, BookOpen, BadgeIndianRupee, Users, CreditCard, WalletCards } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { PageTransition, UploadCard } from "@/components/app/finverify-ui";
import { formatDate } from "@/lib/format";

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
  fileName: string;
  rowCount: number;
  detectedColumns: string[];
  mode: string;
  sheetNames?: string[];
  pageCount?: number | null;
  textPreview?: string | null;
  notes?: string[];
}

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

async function inspectFile(file: File): Promise<MappingPreview> {
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
      fileName: file.name,
      rowCount: Math.max(lines.length - 1, 0),
      detectedColumns,
      mode: "CSV parsed locally. Rows are counted and columns are mapped for review.",
    };
  }

  if (["xlsx", "xls"].includes(extension ?? "")) {
    return {
      fileName: file.name,
      rowCount: 0,
      detectedColumns: [],
      mode: "Excel will be parsed on the server for worksheet names, row count, and detected columns.",
    };
  }

  return {
    fileName: file.name,
    rowCount: 0,
    detectedColumns: [],
    mode: extension === "pdf"
      ? "PDF text will be extracted on the server for preview and mapping."
      : "Image metadata will be stored. OCR is still future work unless an extractor is configured.",
  };
}

export default function UploadsPage() {
  const qc = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [sourceType, setSourceType] = useState("bank");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<MappingPreview | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data = [], isLoading } = useQuery<UploadBatch[]>({
    queryKey: ["uploads"],
    queryFn: () => fetch(`${BASE}/api/uploads`).then(r => r.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const parsed = await inspectFile(file);
      setPreview(parsed);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sourceType", sourceType);
      const res = await fetch(`${BASE}/api/uploads`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      if (result.parsing) {
        setPreview({
          fileName: result.fileName,
          rowCount: result.parsing.rowCount ?? 0,
          detectedColumns: result.parsing.detectedColumns ?? [],
          mode: `${String(result.parsing.parser).toUpperCase()} parsed server-side.`,
          sheetNames: result.parsing.sheetNames,
          pageCount: result.parsing.pageCount,
          textPreview: result.parsing.textPreview,
          notes: result.parsing.notes,
        });
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["uploads"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setMessage("File parsed and audit logged successfully.");
      setUploading(false);
      setTimeout(() => setMessage(""), 3000);
    },
    onError: () => {
      setMessage("Upload failed. Please try again.");
      setUploading(false);
    },
  });

  const handleFile = (file: File) => {
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const statusIcon = (status: string) => {
    if (status === "processed") return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === "failed") return <AlertCircle className="w-4 h-4 text-destructive" />;
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

      <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
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
              onClick={() => {
                setSourceType(card.source);
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
            onClick={() => setSourceType(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              sourceType === t.value
                ? "border-primary bg-primary text-white"
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
          accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {uploading ? (
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
              <div className="font-medium text-sm">Drop file here or click to browse</div>
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
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.includes("successfully") ? "bg-success/10 text-success border border-success/20" : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
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
              <div className="text-xs text-muted-foreground">Parsed rows</div>
              <div className="font-medium">{preview.rowCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Processing status</div>
              <div className="font-medium">Parsed + audit logged</div>
            </div>
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
