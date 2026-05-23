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
- Use "Potential risk — needs CA review" for compliance issues.
- AI is optional, rule-first, and never the source of financial truth.
- The app must run without an AI API key.
- Preserve existing reconciliation logic, demo data, reports, and uploads.
- Do not remove working pages or sample data while redesigning.

## Engineering Rules
- Prefer incremental typed changes over broad rewrites.
- Prefer modular services and reusable UI components for parsing, matching, risk generation, exports, and display patterns.
- Keep README accurate about what is real, mocked, upload-based, or future work.

## Verification
Before finishing any UI task:
- Run build/typecheck if available.
- Check mobile responsiveness.
- Review visual consistency.
- Confirm no routes are broken.
