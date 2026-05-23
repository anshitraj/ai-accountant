import { Router, type IRouter } from "express";

const router: IRouter = Router();

function aiMode() {
  return process.env.OPENAI_API_KEY ? "ai-assisted" : "rule-based";
}

router.post("/ai/extract-invoice", (req, res): void => {
  res.json({
    mode: aiMode(),
    enabled: Boolean(process.env.OPENAI_API_KEY),
    message: process.env.OPENAI_API_KEY
      ? "AI-assisted extraction endpoint is ready for provider wiring."
      : "AI disabled - using rule-based mode. PDF/image extraction is stored as metadata in this prototype.",
    extracted: {
      invoiceNumber: req.body?.invoiceNumber ?? null,
      vendorName: req.body?.vendorName ?? null,
      amount: req.body?.amount ?? null,
      confidence: 0,
    },
  });
});

router.post("/ai/explain-risk", (req, res): void => {
  const category = req.body?.category ?? "Potential risk";
  res.json({
    mode: aiMode(),
    explanation: `${category}: Potential risk - needs CA review.`,
    suggestedAction: "Collect supporting documents and ask the CA to confirm treatment before month close.",
  });
});

router.post("/ai/month-end-summary", (_req, res): void => {
  res.json({
    mode: aiMode(),
    summary:
      "Rule-based month-end summary: resolve missing invoices, review GST/TDS flags, approve high-confidence matches, and export CA-ready reports once the verification score reaches 85+.",
  });
});

export default router;
