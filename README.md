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
- New workspaces are database-backed and start empty until users upload or import records.

## System Architecture

The canonical high-level architecture is documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md). It follows the upload-based FinVerify flow: React/Vite frontend, Express `/api/*`, validation, audit logging, Neon/Postgres, optional private R2 file storage, parser/extractor, rules-first matching, reports, risk engine, CA review queue, and optional server-side AI extraction with schema validation and human review.

## What Is Real

- Navigable SaaS prototype with landing page, database-backed auth, app shell, dashboard, uploads, transactions, invoices, ledger matching, reconciliation, GST/TDS risk flags, payroll, gateway settlements, CA review, reports, integrations, settings, and docs.
- **Month Close Command Center**: guided workflow on the Upload Center that determines current state and drives the user through the close sequence (import → extract → review → reconcile → exceptions → CA review → export).
- **Route registry** (`src/lib/routes.ts`): all app routes defined in one place; `/app/ledger`, `/app/risks`, `/app/gateway`, `/app/review` redirect to canonical routes.
- **Import All Parsed Files** (`POST /api/uploads/import-all-parsed`): batch re-import for all parsed upload batches with per-source row counts.
- **Reconciliation Preflight** (`POST /api/reconciliation/preflight`): checks available data, returns blockers, warnings, and matching options before running reconciliation.
- **Invoice Batch Extraction** (`POST /api/invoices/extract-batch`, `GET /api/invoices/extractions/pending`, `POST /api/invoices/extractions/bulk-action`): AI extraction for all pending invoice PDFs in one action.
- **GST/TDS Review Generate** (`POST /api/gst-tds-review/generate`): creates risk flags and exceptions for unmatched GST records.
- **Payroll Match** (`POST /api/payroll/match`): runs payroll-to-bank matching and creates exceptions for mismatches.
- **Gateway Match** (`POST /api/gateway-settlements/match`): runs gateway-to-bank matching and creates exceptions for mismatches.
- **Exceptions and Document Requests** (`GET/POST /api/exceptions`, resolve, dismiss, send-to-ca-review; `GET/POST /api/document-requests`, resolve).
- **CA Pack Export** (`POST /api/reports/export-ca-pack`): generates full CA-ready pack with blockers check.
- **Docs page** (`/app/docs`): in-app documentation covering workflow, upload flow, AI rules, reconciliation, and limitations.
- Rule-based matching functions for bank-to-invoice, bank-to-ledger, duplicate detection, partial/split payments, gateway settlement checks, payroll checks, and risk flag generation.
- CSV export flow for transactions, invoices, risks, payroll, and report data.
- Server-side CSV, Excel, and PDF parsing for row counts, detected columns, sheet/page metadata, text previews, and audit logging.
- Production-style auth foundation: hashed passwords, signed bearer tokens, revocable database sessions, route permissions, and company-scoped queries.
- Object storage abstraction for raw uploads and stored exports using metadata-only mode by default or S3/R2/GCS-compatible storage when configured.
- Optional server-side AI provider layer with Gemini primary, NVIDIA fallback, OpenRouter disabled by default, strict JSON validation, usage logging, and rule-based fallback.
- Platform/security posture APIs for company profile, users, documents, GST records, audit logs, and security status.

## What Is Mocked Or Prototype-Only

- Auth uses hashed passwords, signed bearer tokens, database-backed sessions, revocation on logout, role permissions, and company-scoped API queries. The frontend stores the bearer session in localStorage; production deployments should harden this further with secure cookies or an equivalent trusted session transport.
- Current version is upload-based.
- File storage is metadata-only unless private Cloudflare R2 or another compatible storage provider is configured. Large binaries are not stored in Neon.
- Direct Tally, GST/GSP, bank feed, Zoho Books API, Razorpay/Cashfree/Stripe API, Gmail invoice import, WhatsApp collection, and Account Aggregator integrations are future work.
- Image uploads are accepted as metadata/extraction-ready records; OCR is not wired yet.
- Optional demo seeding exists only for product validation and is disabled unless `ALLOW_DEMO_SEED=true`.

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

Optional demo data, disabled unless `ALLOW_DEMO_SEED=true`:

```bash
curl -X POST http://localhost:8080/api/demo/seed
```

After schema changes, push the database schema:

```bash
pnpm --filter @workspace/db run push
```

## Environment Variables

- `DATABASE_URL`: Neon/PostgreSQL connection string required by the API/database package.
- `DIRECT_DATABASE_URL`: optional direct Neon URL for migration/admin workflows.
- `JWT_SECRET` or `SESSION_SECRET`: required in production for signed auth sessions.
- `SESSION_HOURS`: optional session duration override. Defaults to 12 hours.
- `APP_URL`: public frontend URL used after OAuth callbacks, for example `http://localhost:21950`.
- `API_PUBLIC_URL`: public API URL used to construct OAuth callback URLs, for example `http://localhost:8080`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: Google OAuth web application credentials. The redirect URI should be `/api/auth/google/callback`.
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`: GitHub OAuth app credentials. The redirect URI should be `/api/auth/github/callback`.
- `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: private R2 upload storage. `STORAGE_*` aliases are still supported for older code paths.
- `CLOUDFLARE_R2_PUBLIC_URL`: optional custom public prefix, only if you deliberately configure one. Normal file access should use signed URLs.
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`: Gemini is the primary AI provider. If `GEMINI_MODEL` is missing, the backend uses the safe default `gemini-2.5-flash`.
- `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`: NVIDIA is the secondary provider using OpenAI-compatible chat completions.
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_ENABLED=false`, `OPENROUTER_PRODUCTION_ONLY=true`: OpenRouter is an emergency fallback only and is disabled by default.
- `AI_PROVIDER_ORDER=gemini,nvidia`, `AI_ENABLE_FALLBACKS=true`, `AI_ENABLE_STRUCTURED_OUTPUT=true`, `AI_ENABLE_LOGGING=true`, `AI_STORE_RAW_PROMPTS=false`, `AI_TIMEOUT_MS=30000`, `AI_MAX_RETRIES=1`: provider routing and safety controls.
- `STORAGE_FORCE_PATH_STYLE`: set `true` for compatible providers that require path-style addressing.
- `ALLOW_DEMO_SEED`: set `true` to allow `/api/demo/seed`. Leave unset for real-data workspaces.

## AI Mode Vs Rule-Based Mode

AI is optional, rule-first, and server-side only. Browser code never receives provider API keys. The deterministic matching engine remains the source of truth.

Provider order:

1. Gemini main model from `GEMINI_MODEL`
2. Gemini fallback model from `GEMINI_FALLBACK_MODEL`
3. NVIDIA model from `NVIDIA_MODEL`
4. OpenRouter only when explicitly enabled and allowed
5. Rule-based fallback

AI can assist with invoice extraction, bank narration interpretation, ledger suggestions, risk explanations, month-end summaries, CA-friendly notes, text cleanup, and column mapping suggestions. It must not mark transactions verified, make legal/tax judgments, invent financial fields, file GST/TDS, execute payments, or modify financial data without review.

Every AI response is parsed through `safeParseAIJson`, validated with Zod schemas, retried once with a JSON repair prompt when needed, and then replaced by deterministic fallback if validation still fails. AI extraction rows are stored as `extracted_pending_review`; accepted/verified status must come from user review or deterministic rules.

Usage logs store provider, model, purpose, success, latency, token estimate, fallback state, and error code. Raw prompts are not stored by default; if `AI_STORE_RAW_PROMPTS=true`, only development can opt in and sensitive values must be redacted.

Dev-only provider smoke test:

```bash
curl -X POST http://localhost:8080/api/dev/test-ai
```

## AI Extraction

Invoice AI extraction is available after an upload has parsed text. The flow is:

1. Upload an invoice PDF or structured file.
2. The backend stores upload metadata and, when configured, the raw file in private R2-compatible storage.
3. PDF text is extracted server-side.
4. The Upload Center shows PDF-specific metadata such as page count, extracted text length, table hints, and AI extraction status.
5. The user clicks `Run AI Extraction`.
6. Gemini extracts structured invoice JSON first. NVIDIA is the fallback. OpenRouter is disabled by default and only used when `OPENROUTER_ENABLED=true`.
7. The extracted JSON is saved to `ai_extractions` as `extracted_pending_review`.
8. The UI shows `AI extracted — pending review`; low-confidence results show `Needs review`.
9. Accepted extractions create invoice records with `pending_reconciliation` status so deterministic reconciliation can use them.

AI does not verify accounting truth. It does not confirm GST, TDS, legality, fraud, audit conclusions, or CA readiness. If AI providers fail, FinVerify returns `AI unavailable — using rule-based extraction` and keeps the result pending review.

Dev-only invoice extraction smoke test:

```bash
curl -X POST http://localhost:8080/api/dev/test-ai-extraction
```

Health check:

```bash
curl http://localhost:8080/api/health
```

## Authentication

Email/password signup and signin are real database-backed flows. A new signup creates an empty company workspace in Neon with founder permissions; it does not seed demo data.

Google and GitHub OAuth use server-side authorization-code flow. The browser redirects to the provider, the backend exchanges the code using server-only client secrets, fetches the verified email/profile, links to an existing user by email when present, or creates a new empty workspace for first-time OAuth users. FinVerify then issues its own JWT session and stores a revocable session row.

OAuth callback URLs for local development:

- Google: `http://localhost:8080/api/auth/google/callback`
- GitHub: `http://localhost:8080/api/auth/github/callback`

Demo data is never loaded automatically. `/api/demo/seed` remains disabled unless `ALLOW_DEMO_SEED=true`.

## Upload Formats Supported

- CSV: server-side row count, detected columns, and preview.
- Excel: server-side first-sheet row count, detected columns, and sheet names.
- PDF: server-side text extraction, page count, and text preview.
- Image invoices: accepted as metadata/extraction-ready uploads; OCR is future work.
- Tally/Zoho/GST/payroll/gateway files: supported through upload-based workflows, not live connectors.

When R2 is configured, raw uploaded files are written to a private bucket and Neon stores metadata only: provider, bucket, region, key, size, checksum, retention date, and deletion metadata. Files should be accessed with temporary signed URLs, not public bucket permissions. Stored report exports are available through `GET /api/reports/export-csv?type=...&store=true`.

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
- Missing document or suspicious tax/compliance heuristic = Potential risk — needs CA review.

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
- Document storage is metadata-only by default; S3/R2/GCS-compatible object storage is available when configured.
- Direct Tally/GST/bank integrations are future work.
- AI is optional and not required for app operation.
- This tool does not replace CA, legal, tax, or compliance review.
- Compliance findings are only potential risks that need CA review.

## Platform APIs Added

- `GET /api/company`
- `GET /api/users`
- `GET /api/documents`
- `POST /api/ai/extract-invoice`
- `POST /api/ai/extractions/:id/accept`
- `PATCH /api/ai/extractions/:id/edit`
- `POST /api/ai/extractions/:id/reject`
- `GET /api/gst-records`
- `GET /api/audit-logs`
- `GET /api/security/posture`
