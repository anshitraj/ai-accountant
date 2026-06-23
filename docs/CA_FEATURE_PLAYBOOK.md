# FinVerify OS — CA Feature Playbook

Honest brain-dump from a CA-workflow lens. What real CAs do daily, what they hate, what to keep simple.

---

## Part 1 — Features CAs actually want (high signal)

### 1. Per-client / per-period workspace folders ✅ (now built)
CAs handle 30-100 clients. Each client's monthly close is a separate "matter". App must scope by client + period. **Just shipped.** Extend: workspace = `{client × month × workflow_type}`. URL deep-link `?workspace=xxx`.

### 2. Trial balance + ledger drill-down (NOT BUILT)
Single biggest gap. CAs live in trial balance (TB). They click an account → see all transactions. Add:
- `GET /api/trial-balance?asOf=YYYY-MM-DD` — group ledger entries by accountName, sum debit/credit
- Page `/app/trial-balance` with collapsible tree
- Click account → drill to transactions of that account
- Compare to last period column

### 3. Adjusting / closing journal entries (NOT BUILT)
After reconciliation, CAs post manual JEs: prepaid expenses, accruals, depreciation, reclassifications. Add:
- `POST /api/ledger/journal-entry` with `entries: [{accountId, debit, credit, narration}]` (balanced)
- Templates: "Depreciation – SLM", "Prepaid Insurance – monthly amortization", "Accrued Salary"
- Show in audit trail as `manual_je` with PDF supporting doc attachment

### 4. GST recon: GSTR-2B vs Purchase Register (PARTIALLY BUILT)
Critical for ITC claim. Compare:
- GSTR-2B (downloaded from GST portal) — what suppliers filed
- Purchase Register (from books / invoices) — what client booked
- Match by GSTIN + invoice number + amount
- Flag: missing in 2B (supplier hasn't filed → ITC at risk), missing in books (vendor billed but not booked), GSTIN mismatch, value mismatch
- This is **the** ITC reconciliation every CA does monthly

### 5. TDS reconciliation: 26AS vs TDS payable register (NOT BUILT)
- Match TDS deducted (from books) vs TDS reflected in 26AS
- Section-wise summary: 194C, 194J, 194A, 194I, 194Q
- Lower deduction certificate handling
- Form 27Q for non-resident payments

### 6. Period locking (NOT BUILT)
After CA signs off period, lock it. No edits to closed months without explicit reopen. Add:
- `monthly_close_periods.locked_at` + `locked_by`
- Server middleware blocks writes to locked-period records
- Audit-trail unlock requires reason

### 7. Reviewer signoff (NOT BUILT)
Partner reviews assistant's work. Add:
- Per-transaction `reviewed_by` + `reviewed_at`
- "Mark as reviewed" bulk action
- Filter: "unreviewed only"
- Partner inbox: "30 items waiting your sign-off"

### 8. Audit trail export (PARTIALLY BUILT)
`audit_logs` exists. Add:
- Filter by date/user/action
- Export to PDF for statutory audit working papers
- ICAI SA 230 compliance (audit documentation)

### 9. Schedule-3 financial statements (NOT BUILT)
End game. After TB locked, generate:
- Schedule 3 Balance Sheet (per Companies Act 2013)
- Statement of P&L
- Cash flow (indirect method)
- Notes to accounts templates

### 10. Multi-bank consolidation (NOT BUILT)
Most companies have 3-5 bank accounts. Currently treats all bank txns equally. Add:
- `bank_accounts` table: account_number_masked, name, opening_balance
- Each `bank_transactions.bank_account_id`
- Reconciliation per account
- Bank-wise cash position dashboard

### 11. Vendor master + payment terms (NOT BUILT)
CAs need: which invoices are overdue, days payable outstanding (DPO). Add:
- `vendors` table with payment_terms_days, contact
- Aging report: 0-30, 31-60, 61-90, 90+ days overdue
- Auto-flag mismatched GSTIN between invoice and master

### 12. E-Invoicing IRN validation (NOT BUILT)
For invoices > ₹5cr turnover clients, every invoice must have valid IRN.
- Validate IRN format
- Cross-check against GST portal (manual upload for MVP)
- Flag invoices without IRN that should have one

### 13. Statutory due date calendar (NOT BUILT)
CAs juggle: GSTR-1 (11th), GSTR-3B (20th), TDS (7th), PT, PF, advance tax. Add:
- Calendar widget per client
- "Due in 3 days" notifications
- Mark as filed → archives with reference number

### 14. Client portal access toggle (PARTIALLY)
Some clients want to see status. Others want CA-only. Per-client toggle for what's visible to founder vs CA-only.

### 15. Document request + chase (PARTIALLY BUILT)
Already have `document_requests`. Add:
- Auto-chase emails: "Reminder — May rent receipt pending 7 days"
- Status: requested → received → reviewed
- Bulk request template ("send standard month-end pack")

---

## Part 2 — Make app easier (anti-complexity playbook)

### Remove
- **Multiple "Upload by Source Type" cards** below drop zone. Drop zone alone is enough. Source auto-detects.
- **Three different status badges** for the same file across cards. Pick one.
- **Notifications popover** if it's always empty. Hide until populated.
- **"What FinVerify detected" sidebar panel** — duplicates info from Current Uploaded Files.
- **Two reconcile entry points** (top button + recipe card). Pick one path.

### Combine
- **Imports + Reconciliation** are two clicks today. CSV/Excel: auto-import. PDF: manual review. One screen, two states.
- **Reports page + CA Review queue** show overlapping things. Merge into a single "Action Items".
- **Audit Logs + Action History** confusing distinction. Pick one term, one page.

### Simplify wording
| Replace | With |
|---|---|
| "Upload-based MVP" | "Upload files" |
| "Smart Next Step Panel" | "What to do next" |
| "ready_to_run / ready_to_import / blocked" | "Ready / Import first / Need files" |
| "Suggested match" / "Match needs CA review" | "Possible match → Confirm/Reject" |
| "Potential risk — needs CA review" (compliance speak) | Keep this; legally important |

### Hide until needed
- Advanced Upload View ✅ already hidden
- Audit log filters until user clicks "show filters"
- Bulk-actions until items selected
- Run preflight checkboxes — default checked, hidden behind "advanced"

### One-click actions
- "Generate full CA pack" button on Overview — auto-runs every recipe with available data
- "Send to client for review" — single button vs current multi-step
- "Mark month closed" — single button locks period + emails partner

---

## Part 3 — UX ideas that don't yet exist (worth building)

1. **Excel-like keyboard nav** on transaction table. CAs paste from Tally constantly. Arrow keys + Tab + Enter to move cells. Inline edit.

2. **Bulk categorize**. Select 50 unverified UPI debits → "Categorize as Travel" → done. Right now needs per-row click.

3. **Auto-categorize from history**. If "Swiggy" always categorized as "Meals", suggest same on next Swiggy txn. Learn per client.

4. **Diff view between months**. Compare May vs April side-by-side. Flag accounts that moved >20%.

5. **"Why is this flagged?" explainer button**. Click any risk flag → plain-English reason + suggested action. AI-assisted but no auto-decisions.

6. **Mobile-friendly review**. Partner reviews on phone between client meetings. Currently desktop-only.

7. **WhatsApp integration for document chase**. Most Indian SMBs respond on WhatsApp not email. Send link to upload missing bill.

8. **One-click "share read-only link" with client**. They see status, no edit. Expires.

9. **Templates for common reconciliation rules**. "Match Razorpay settlements to T+1 bank credit minus fees". Save as named template, reuse next month.

10. **CA-curated risk checklist** per industry. SaaS startup: revenue recognition. Manufacturer: inventory cutoff. Restaurant: cash handling.

---

## Part 4 — Bug fixes already shipped this session (proof points)

- ✅ Workspace folders (named reports) — solves "data jumbled"
- ✅ Per-source ingester for expenses (preserves category)
- ✅ Hybrid PDF extractor (bank patterns → generic → AI)
- ✅ Excel smart header detection (20-row scan)
- ✅ Substring alias matching on column names
- ✅ Python worker primary parser, TS fallback
- ✅ Real workflow_runs with progress polling
- ✅ Run isolation via run_sources + sourceUploadId FK
- ✅ Cascade-delete via force=true
- ✅ Re-extract button for stuck PDFs
- ✅ Reconciliation 4-way review (Correct/Wrong/Needs info/Send to CA)
- ✅ Finalize → CA-pack PDF download

---

## Part 5 — Honest gaps (still missing)

- Multi-bank consolidation
- Trial balance + drill-down
- Manual journal entries
- GSTR-2B reconciliation
- 26AS reconciliation
- Period locking
- Partner sign-off
- Statutory calendar
- Schedule-3 financials
- WhatsApp document chase
- Excel-like inline edit
- Auto-categorization
- Period diff view
- Mobile UI

These are the "next 6 months" backlog. Each one is meaningful CA value. Prioritize by:
1. **GSTR-2B reconciliation** — every CA does this monthly, would be killer feature
2. **Trial balance + drill-down** — basic accounting hygiene
3. **Period locking + signoff** — multi-user workflow
4. **Manual journal entries** — completes the close cycle

---

## Part 6 — Anti-features (do NOT build)

- ❌ "AI auto-files GST" — illegal-feeling, regulatory liability, CA loses control
- ❌ "Auto-categorize and post" — without review, breaks audit trail
- ❌ "Smart insights chatbot" if it gives tax advice
- ❌ Real-time bank sync via screen scraping — banking regs in India don't allow
- ❌ "Compare with industry peers" without explicit opt-in — data privacy nightmare
- ❌ Hosted document signing — let DocuSign / NSDL handle it
