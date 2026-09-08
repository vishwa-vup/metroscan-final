# MetroScan — Master OpenCode Build Guide (SIH26034)

This document has two parts.

- **Part 1** is the actual prompt — the brief you give to opencode so it knows exactly what to build, in what order, and what rules to never break.
- **Part 2** is for *you* — the exact terminal commands to install opencode, set it up, and feed Part 1 into it correctly (in phases, not all at once — a full-stack OCR + compliance app is too big for one prompt to build reliably).

Don't paste all of Part 1 and expect a finished app in one reply. Follow Part 2 — it tells you when and how much of Part 1 to give opencode at each step.

---

# PART 1 — THE PROMPT CONTENT

Copy this whole section into a file called `PROJECT_BRIEF.md` in your project folder (Part 2, Step 5 tells you exactly how). This is what opencode reads to understand the whole project before you start giving it phase-by-phase build instructions.

---

> ---
>
> You are an AI coding agent building **MetroScan**, a Smart India Hackathon (SIH26034) project for the Ministry of Consumer Affairs, Department of Consumer Affairs. Read this entire brief before writing any code. If something is genuinely ambiguous, make the most reasonable choice, state the assumption in a code comment, and keep going — don't stall waiting for clarification on small things.
>
> ## 1. What we're building
>
> Every packaged commodity sold in India must legally display: manufacturer/packer/importer name and address, net quantity, MRP, month/year of manufacture, and consumer-care details — in a specified format, size, and placement (Legal Metrology (Packaged Commodities) Rules, 2011). Manual inspection doesn't scale. MetroScan takes a photo of a product label, runs OCR + rule-checking, and flags **potential** non-compliance for a human inspector to confirm — it never issues a final legal verdict on its own.
>
> ## 2. Tech stack — use exactly this, do not substitute without telling me why
>
> | Part | Technology | Purpose |
> |---|---|---|
> | Frontend | React | UI |
> | Styling | Tailwind CSS | UI design |
> | Mobile | PWA + Camera API | Capture image |
> | Backend | Python | AI pipeline |
> | API | FastAPI | Frontend ↔ Backend |
> | Image Processing | OpenCV | Improve/analyze image |
> | OCR | EasyOCR | Image → text |
> | Extraction | Regex | Find fields |
> | Location | Bounding Boxes | Identify which value belongs to which label |
> | Rules | JSON | Legal compliance rules |
> | Database | PostgreSQL | Store scans/history |
> | Authentication | JWT | Secure login |
> | Authorization | RBAC | Inspector/Business/Admin permissions |
> | PDF | ReportLab | PDF reports |
> | Editable report | python-docx | Editable reports |
>
> ## 3. System architecture (build in this data-flow order)
>
> ```
> Upload / Camera capture
>         ↓
> Image quality check (blur, resolution — reject/warn early)
>         ↓
> OpenCV preprocessing (deskew, denoise, contrast)
>         ↓
> OCR extraction (EasyOCR)
>         ↓
> Field extraction (regex + bounding-box proximity matching)
>         ↓
>         ├──────────────┐
>         ↓              ↓
> Font/readability    Rule engine
>    analysis          (JSON rule set, cites exact clause)
>         └──────┬───────┘
>                ↓
>       Potential issues list
>                ↓
>       Human verification (inspector confirms/overrides against original photo)
>                ↓
>       Final compliance report (PDF + editable + evidence images)
>                ↓
>         ┌──────┴──────┐
>         ↓             ↓
>    PostgreSQL     Dashboard
>    (history,      (search, violation
>    audit trail)    trends, monitoring)
> ```
>
> ## 4. Non-negotiable rules — bake these into every screen, every API response, every report, no exceptions
>
> 1. **Never assert absence from incomplete evidence.** If a declaration isn't visible in the image, the output must say `"could not be verified from the provided image"` — never `"non-compliant"`.
> 2. **Never issue an absolute legal verdict.** All flags must be worded `"potential non-compliance, pending inspector review"` — never `"LEGALLY NON-COMPLIANT"`.
> 3. **Every flag must cite its rule clause and show the evidence image region.** No unexplained flags.
> 4. **Every extracted field must carry an OCR confidence score** so the human verifier knows what to double-check.
> 5. **Poor-quality images stop the pipeline** with the message `"image quality too low — please upload a clearer or closer photo"` instead of producing an unreliable result silently.
>
> ## 5. Status levels — use these five states everywhere, never a binary pass/fail
>
> | Status | Meaning |
> |---|---|
> | ✅ Verified / appears compliant | OCR confidence above threshold, rule check passed |
> | ⚠️ Potential non-compliance | OCR confidence above threshold, rule check failed — routed to inspector |
> | ❓ Could not reliably verify | OCR confidence below threshold — routed to inspector as "needs a closer look," never treated as a violation |
> | 🔴 Inspector-confirmed issue | Inspector reviewed a ⚠️ or ❓ item and confirmed a real problem |
> | ✅ Inspector-confirmed compliant | Inspector reviewed a ⚠️ or ❓ item and cleared it |
>
> Decision logic (confidence threshold configurable, start at 70%):
> - Confidence below threshold → ❓, regardless of rule outcome
> - Confidence at/above threshold, rule passed → ✅
> - Confidence at/above threshold, rule failed → ⚠️
> - After human review → resolves to 🔴 or ✅ Inspector-confirmed
>
> On the dashboard, always count 🔴 (confirmed) separately from ⚠️/❓ (pending review). Never combine them into one "violation count."
>
> ## 6. Feature scope
>
> **Level 1 — must have, build all of this:**
> 1. Product image upload/capture
> 2. Image quality check (blur/resolution) before OCR runs
> 3. OpenCV preprocessing
> 4. OCR text extraction
> 5. Mandatory declaration extraction (regex + bounding-box proximity)
> 6. Rule engine (JSON, versioned, clause-citing)
> 7. Missing-declaration detection
> 8. Correctness/completeness checking
> 9. Placement checking (basic OpenCV contour detection — is the declaration inside the principal display panel)
> 10. Readability/font-size checking (reference-card calibration as the primary method)
> 11. Human verification step
> 12. Compliance report (PDF + editable .docx, with evidence images attached)
> 13. Violation summary
> 14. Product/scan repository
> 15. Compliance history log
> 16. Search and retrieval
> 17. Dashboard for enforcement officials
> 18. Role-based authentication (Inspector / Business / Admin) via JWT + RBAC
>
> **Level 2 — only after Level 1 fully works, build if time allows:**
> - Multi-image inspection (combine front/back/side of one product before rule-checking)
> - Barcode-based scale estimation (fallback only, always shown with a stated margin of error — never claim millimetre precision from a barcode alone, since GS1 magnification varies ~0.8×–2.0× nominal)
> - OCR confidence display next to each field
> - Annotated evidence (highlight the exact text region responsible for a flag)
>
> **Level 3 — explicitly do NOT build any of this:**
> Full autonomous legal decision-making, fake-product detection, tamper/ink-forensics detection, predictive analytics, crowdsourced violation maps, blockchain, a custom layout-aware model trained from scratch, separate native mobile apps, multiple databases, multiple cloud OCR vendors, offline sync.
>
> ## 7. Build order — follow this sequence, don't skip ahead
>
> 1. OCR + preprocessing pipeline working end-to-end on real sample label photos (highest risk — build and test this first)
> 2. Field extraction with bounding-box proximity matching
> 3. Rule engine + clause-citing verdict output
> 4. Human verification UI
> 5. Compliance report generation (PDF via ReportLab, editable via python-docx) + database + basic dashboard
> 6. Image quality check + placement (principal-display-panel contour) check
> 7. Level 2 features, only if time remains
> 8. UI/UX polish, then prepare a live demo with 3–4 real labels covering a range of outcomes (fully compliant, missing declaration, font-size concern)
>
> ## 8. Repository structure to create
>
> ```
> metroscan/
> ├── frontend/                 # React + Tailwind PWA
> │   ├── src/
> │   │   ├── components/
> │   │   ├── pages/
> │   │   └── api/
> ├── backend/
> │   ├── app/
> │   │   ├── main.py           # FastAPI entrypoint
> │   │   ├── preprocessing/    # OpenCV steps
> │   │   ├── ocr/              # EasyOCR wrapper
> │   │   ├── extraction/       # regex + bounding-box logic
> │   │   ├── rules/            # JSON rule set + rule engine
> │   │   ├── reports/          # ReportLab + python-docx generation
> │   │   ├── auth/             # JWT + RBAC
> │   │   └── db/               # PostgreSQL models/migrations
> │   └── requirements.txt
> ├── sample_labels/            # test images for the demo
> └── docs/
> ```
>
> ## 9. Coding standards
>
> - Every API endpoint documented (FastAPI auto-docs via `/docs` is enough — don't skip the Pydantic models that generate it).
> - Secrets (DB password, JWT secret) in a `.env` file, never hardcoded.
> - Every rule in the JSON rule set must include a `clause` field citing the exact rule (e.g. `"Rule 6(1)"`) — do not invent sub-clause numbers; use `"Rule 6(1)"`-level citation only unless a sub-clause has been explicitly verified against the gazette text.
> - Write a short README per major folder explaining how to run it locally.
> - Every commit should leave the app in a runnable state — don't leave half-finished features that crash the server.
>
> ---