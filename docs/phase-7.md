# Phase 7 log — Auth hardening ✅ GATE 10 PASSED (RBAC isolation server-side)

Scope (§34): JWT, RBAC, business isolation, admin controls, security tests.

## Changed files
- `app/auth/passwords.py` (stdlib PBKDF2-SHA256 — rationale: pinned passlib 1.7.4 is
  incompatible with bcrypt 5.x in current envs; zero new deps, audited primitive)
- `app/auth/jwt.py` (create/validate/expire via python-jose; secrets env-only, never logged)
- `app/auth/rbac.py` (Bearer → DB user; role gates; `check_scan_access` with store-first +
  DB hydration; cross-business → 404, no existence leak)
- `app/api/v1/auth.py` (login/me + admin users CRUD); all routers now depend on auth:
  scans (ownership set at create; list scoped), detail/ocr/evidence (ownership),
  reviews (inspector/admin only; reviewer falls back to JWT identity),
  reports (ownership), rules list (login) + validate (admin), dashboard (scoped)
- `app/db/repository.py` (+business_id scoping on search/summary; +load_scan hydration)
- `tests/auth_helper.py` + `tests/test_auth.py` (6: login/me, expired JWT, cross-business 404,
  business-cannot-review, admin CRUD + RBAC, validate admin-only); all older API tests migrated to tokens
- Frontend: real Login, AuthGuard/RoleGuard, token client + blob evidence/reports, AdminUsers, session header

## Tests executed — 64 passed, 0 failed
- Gate 10: BizB gets 404 (not 403) on BizA's scan/evidence/report; list isolation both directions;
  business review → 403, inspector → 201 with JWT reviewer; admin CRUD incl. 409/404; expired JWT → 401;
  missing/garbage token → 401; non-admin validate → 403
- Fixed along the way: double-review test bug, version pin updates, DOCX case assertion

## Manual smoke checks — login → upload → review → admin flow joins the Phase 9 demo.

## Blockers — none. Residual notes: tokens in localStorage (demo-grade; httpOnly cookie hardening
listed as follow-up); first admin is DB-seeded (bootstrap documented in test helper).

## Next (Phase 8): multi-image, annotated evidence, confidence display, barcode scale — gate 11.
