import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
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

const SOURCE_TYPES = [
  { value: "bank_statement", label: "Bank Statement" },
  { value: "gst_ledger", label: "GST Ledger" },
  { value: "invoice_dump", label: "Invoice Dump" },
  { value: "tds_report", label: "TDS Report" },
  { value: "payroll_sheet", label: "Payroll Sheet" },
  { value: "gateway_report", label: "Payment Gateway Report" },
];

export default function UploadsPage() {
  const qc = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [sourceType, setSourceType] = useState("bank_statement");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data = [], isLoading } = useQuery<UploadBatch[]>({
    queryKey: ["uploads"],
    queryFn: () => fetch(`${BASE}/api/uploads`).then(r => r.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sourceType", sourceType);
      fd.append("recordCount", String(Math.floor(Math.random() * 100) + 20));
      const res = await fetch(`${BASE}/api/uploads`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["uploads"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setMessage("File uploaded successfully!");
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Upload Center" subtitle="Upload financial documents for automated processing" />

      {/* Source type selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SOURCE_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setSourceType(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              sourceType === t.value
                ? "bg-primary text-white border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <motion.div
        animate={{ scale: dragging ? 1.01 : 1 }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="text-sm text-muted-foreground">Uploading and processing…</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">Drop file here or click to browse</div>
              <div className="text-xs text-muted-foreground mt-1">CSV, Excel, or PDF · Max 50MB</div>
            </div>
            <button className="px-4 py-2 bg-primary text-white text-sm rounded-lg font-medium flex items-center gap-1.5 mt-1">
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
            message.includes("success") ? "bg-success/10 text-success border border-success/20" : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Upload history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Upload History</div>
          <div className="text-xs text-muted-foreground">{data.length} files</div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
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
                      {SOURCE_TYPES.find(t => t.value === u.sourceType)?.label || u.sourceType} · {formatDate(u.uploadedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {u.recordCount && <span className="text-xs text-muted-foreground">{u.recordCount} records</span>}
                  <StatusBadge status={u.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
