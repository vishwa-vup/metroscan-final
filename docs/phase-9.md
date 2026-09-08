# Phase 9 log — Demo hardening ✅ GATE 12 PASSED (documented setup runs the demo)

Scope (§34): 3–4 permissioned label examples, verified live demo.

## Changed files
- `sample_labels/generate.py` (owned-pixel generator) + 4 labels + README matrix
- `docs/DEMO.md` (setup, 10-step walkthrough with verified expectations, judge Q&A talk-track)
- `docs/ACCEPTANCE.md` (§41 26-item map + §33 20-scenario coverage)

## Live verification (real EasyOCR, models cached, 2026-09-08)
- compliant: 6 tokens, R1–R4 VERIFIED, R5/R6 low-conf ❓ (56%/45%)
- missing-mrp: 5 tokens, R4 ❓ could-not-verify, R6 ⚠️ pending
- small-text: 6 tokens, mixed ✅/❓ by confidence
- blurry: rejected pre-OCR (blur 1.72), exact recapture message + metrics

## Tests executed — full suite below; frontend builds clean.

## Blockers — none. Residual manual items (honest): camera needs a real browser/device check;
production DB is PostgreSQL via DATABASE_URL (suite runs the same models on SQLite transport).
