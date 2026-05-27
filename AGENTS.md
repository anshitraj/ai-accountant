# FinVerify OS Agent Instructions

## Product
FinVerify OS is a pre-CA finance verification layer for Indian startups. It verifies bank statements, invoices, Tally/Zoho exports, GST/TDS files, payroll, expenses, and payment gateway settlements before CA review.

## Design Standard
Build a YC-quality fintech SaaS UI inspired by Linear, Vercel, Stripe, Mercury, Ramp, Brex, Deel, and Razorpay.

## Visual Rules
- Professional fintech, not crypto.
- Use off-white background, dark slate text, orange accent.
- Keep UI clean, spacious, and high-trust.
- Use consistent cards, badges, buttons, spacing, and typography.
- Avoid purple AI gradients, neon colors, random emojis, and generic SaaS templates.
- Use subtle motion only.

## Product Rules
- Do not claim direct Tally/GST/bank integrations are live unless implemented.
- Current version is upload-based unless a feature explicitly proves otherwise in code.
- Use "Potential risk — needs CA review." for compliance issues.
- AI is optional, rule-first, and never the source of financial truth.
- The app must run without an AI API key.
- Preserve existing reconciliation logic, demo data, reports, and uploads.
- Do not remove working pages or sample data while redesigning.

## Engineering Rules
- Prefer incremental typed changes over broad rewrites.
- Prefer modular services and reusable UI components for parsing, matching, risk generation, exports, and display patterns.
- Keep README accurate about what is real, mocked, upload-based, or future work.
- Never expose API keys client-side, log them, or commit `.env` files.
- Never hardcode AI model names except safe defaults; read provider models from env/config.
- Never use AI as the financial source of truth. Deterministic matching is authoritative.
- Never claim legal, tax, GST, TDS, audit, or fraud certainty.
- Always validate AI JSON against schemas before using it.
- Always provide rule-based fallback when AI providers fail.

## Verification
Before finishing any UI or backend task:
- Run build/typecheck if available.
- Check mobile responsiveness.
- Review visual consistency.
- Confirm no routes are broken.
- Run the workspace build before final response.
