# FinVerify OS

FinVerify OS is a pre-CA finance verification layer for Indian startups, agencies, D2C brands, SaaS teams, creator businesses, and mid-sized companies.

> Your startup's finance data, verified before it reaches your CA.

## What Problem It Solves

Before a CA can review books, someone has to match bank entries, invoices, ledgers, payroll, GST/TDS files, expenses, and payment gateway settlements. That work often happens across Excel sheets, email, exports, and screenshots. FinVerify OS gives founders and finance teams a rules-first workflow to identify verified records, missing documents, mismatches, duplicate entries, and items that need CA review.

This is not generic accounting software, not a CA replacement, and not a fake live integration demo.

## Current Implementation

- Frontend: React, TypeScript, Vite, TailwindCSS, shadcn-style components, Framer Motion, Lucide icons, Recharts, wouter.
- Backend: Node.js, Express, TypeScript, Drizzle ORM.
- Database: PostgreSQL through `DATABASE_URL`.
- Workspace: pnpm monorepo with generated API/Zod packages.
- Matching: rules-first service in `artifacts/api-server/src/services/matchingEngine.ts`.
- Platform data store: companies, users/roles, document metadata, GST/TDS records, audit logs, finance records, reconciliation matches, and risk flags.
- Demo company: NovaStack Labs Pvt Ltd, with sample transactions, invoices, ledgers, payroll, gateway settlements, reconciliation matches, GST/TDS records, documents, users, audit logs, and risk flags.

## What Is Real

- Navigable SaaS prototype with landing page, login/demo auth, app shell, dashboard, uploads, transactions, invoices, ledger matching, reconciliation, GST/TDS risk flags, payroll, gateway settlements, CA review, reports, integrations, and settings.
- Rule-based matching functions for bank-to-invoice, bank-to-ledger, duplicate detection, partial/split payments, gateway settlement checks, payroll checks, and risk flag generation.
- CSV export flow for transactions, invoices, risks, payroll, and report data.
- Server-side CSV, Excel, and PDF parsing for row counts, detected columns, sheet/page metadata, text previews, and audit logging.
- Optional AI endpoints that safely fall back to rule-based mode.
- Platform/security posture APIs for company profile, users, documents, GST records, audit logs, and security status.

## What Is Mocked Or Prototype-Only

- Auth is localStorage-based demo auth, not production authentication.
- Current version is upload-based.
- File storage is currently metadata-only unless a storage provider is configured.
- Direct Tally, GST/GSP, bank feed, Zoho Books API, Razorpay/Cashfree/Stripe API, Gmail invoice import, WhatsApp collection, and Account Aggregator integrations are future work.
- Image uploads are accepted as metadata/extraction-ready records; OCR is not wired yet.
- Demo data is sample data for product validation.

## Run Locally

Install dependencies:

```bash
pnpm install
```

Typecheck:

```bash
pnpm run typecheck
```

Build:

```bash
pnpm run build
```

Run the API:

```bash
pnpm --filter @workspace/api-server run dev
```

Run the frontend:

```bash
pnpm --filter @workspace/finverify-os run dev
```

Seed demo data:

```bash
curl -X POST http://localhost:8080/api/demo/seed
```

After schema changes, push the database schema:

```bash
pnpm --filter @workspace/db run push
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string required by the API/database package.
- `OPENAI_API_KEY`: optional. If absent, the app remains in rule-based mode.

## AI Mode Vs Rule-Based Mode

AI is optional. If an AI key exists, future provider wiring can assist with invoice field extraction, narration interpretation, category suggestions, risk explanations, and month-end summaries.

Without an AI key, deterministic matching and risk rules still work. AI is never treated as the source of financial truth.

## Upload Formats Supported

- CSV: server-side row count, detected columns, and preview.
- Excel: server-side first-sheet row count, detected columns, and sheet names.
- PDF: server-side text extraction, page count, and text preview.
- Image invoices: accepted as metadata/extraction-ready uploads; OCR is future work.
- Tally/Zoho/GST/payroll/gateway files: supported through upload-based workflows, not live connectors.

## Matching Engine

The matching engine scores records using:

- Amount match: 35 points
- Date closeness: 15 points
- Vendor/name similarity: 20 points
- Reference/invoice/UTR/RRN match: 20 points
- Source consistency: 10 points

Thresholds:

- 85+ = Verified/exact match candidate
- 60-84 = Needs review/potential match
- Below 60 = Unverified
- Missing document or suspicious tax/compliance heuristic = Potential risk — needs CA review

## Future Roadmap

- Production auth and role-based permissions.
- Persistent company/user model and multi-tenant isolation.
- Robust CSV/XLSX mapping templates.
- Document extraction for PDFs and images.
- Direct Tally, Zoho Books, GST/GSP, gateway, bank feed, Gmail, WhatsApp, and Account Aggregator integrations.
- Audit logs, data retention controls, and production-grade export packages.

## Known Limitations

- This version is a prototype for validation.
- Current version is upload-based.
- Document storage is metadata-only by default; S3/GCS file storage is future work.
- Direct Tally/GST/bank integrations are future work.
- AI is optional and not required for app operation.
- This tool does not replace CA, legal, tax, or compliance review.
- Compliance findings are only potential risks that need CA review.

## Platform APIs Added

- `GET /api/company`
- `GET /api/users`
- `GET /api/documents`
- `GET /api/gst-records`
- `GET /api/audit-logs`
- `GET /api/security/posture`
