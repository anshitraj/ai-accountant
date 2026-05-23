# FinVerify OS Design System

## Brand
FinVerify OS is a serious, founder-friendly fintech SaaS product. The UI should feel fast, trustworthy, operational, and ready for real finance teams.

Wordmark treatment:
- "Fin" in dark slate.
- "Verify" in orange.
- "OS" in a compact rounded pill.

## Palette
Core CSS tokens live in `artifacts/finverify-os/src/styles/design-tokens.css`.

- Background: `#FAFAF7`
- Surface: `#FFFFFF`
- Surface muted: `#F5F7FA`
- Text primary: `#101828`
- Text secondary: `#667085`
- Text muted: `#98A2B3`
- Border: `#E5E7EB`
- Border strong: `#D0D5DD`
- Accent: `#F26B3A`
- Accent dark: `#D94A1E`
- Success: `#0F9F6E`
- Warning: `#D97706`
- Risk: `#DC2626`
- Info: `#2563EB`

## Typography
Use Inter as the installed default unless Geist or Manrope is intentionally added later.

- Display: 64/72, weight 700
- H1: 48/56, weight 700
- H2: 36/44, weight 700
- H3: 24/32, weight 650
- Body: 16/24, weight 400-500
- Small: 14/20
- Caption: 12/16

Keep the scale strict. Do not introduce many one-off font sizes.

## Spacing
Use an 8px system: 4, 8, 12, 16, 24, 32, 48, 64, 96.

## Components
Cards:
- 1px border using `#E5E7EB`
- 16px or 20px radius
- 20-28px padding
- Very subtle shadow only
- No heavy glassmorphism

Buttons:
- Primary: orange background, dark orange hover, white text, 10-12px radius
- Secondary: white surface, subtle border, dark text
- Ghost: transparent, muted text, visible hover state

Status badges:
- Verified and CA-ready: green
- Unverified and missing: gray/amber
- Risk: red
- Needs CA review: blue

Tables:
- Sticky headers where useful
- Horizontal scroll on narrow screens
- Clear row hover
- Numeric columns right aligned
- Status and confidence shown consistently

## Motion
Use subtle motion only:
- Light page fade/slide
- Cards stagger on first load
- Progress bars animate once
- Buttons can translate 1px on hover
- Respect `prefers-reduced-motion`

## Product Copy
- Never imply this is accounting software or a CA replacement.
- Never claim live direct integrations unless implemented.
- Compliance and tax findings must be framed as "Potential risk — needs CA review."
- AI should be described as rule-first and optional.
