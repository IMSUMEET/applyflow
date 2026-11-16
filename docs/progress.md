# ApplyFlow — Build Progress

## Milestone 1 — Chrome Extension Foundation ✅ COMPLETE

### What was built

- Working Chrome Manifest V3 extension (WXT + React + TypeScript)
- Fully typed data models: UserProfile, Job, ReferralContact, ReferralAssignment, LearnedAnswer, UserSettings
- Storage layer: type-safe repository pattern over chrome.storage.local
- Typed message passing system (discriminated union covering all features)
- Background service worker with full message router
- Content script with job info detection
- React popup: current job detection, Save for Referral, Track Application, Open Dashboard
- Full dashboard: Overview, Applications, Referrals, Contacts, Profile, Learned Answers, Settings
- Tailwind CSS design system with Button, Badge, Spinner, Toast components
- 31 unit tests passing (profile repo, job repo, referral repo, job detector)
- Zero TypeScript errors
- Clean production build

### Installation

```
npm run build
```

Then load `.output/chrome-mv3/` as an unpacked extension in Chrome.

---

## Milestone 2 — Basic Autofill ✅ COMPLETE

Delivered:
- CanonicalField type (30+ fields)
- FieldScanner — DOM scanning with nodeName-based cross-realm element type detection
- FieldMatcher — confidence-scored mapping engine (60+ known patterns)
- KnownMappings table — firstName, lastName, email, phone, city, state, LinkedIn, GitHub, school, degree, major, workAuthorization, requiresSponsorship, etc.
- ProfileResolver — CanonicalField → UserProfile value with education/employment array support
- FieldFiller — text, email, tel, textarea, select, radio-group, checkbox
- EventDispatcher — React-compatible native setter bypass + cross-realm safe
- ATS adapter interface + Generic, Greenhouse, Lever adapters
- AdapterRegistry — URL-based adapter selection
- AutofillEngine — orchestrates the full flow in content script
- Popup: real Autofill button with result view (fields filled / skipped / failed / unrecognized)
- Content script: handles RUN_AUTOFILL + GET_JOB_INFO messages
- Background: EXECUTE_AUTOFILL routes profile+settings to content script via tabs.sendMessage
- 3 HTML test fixtures (generic, Greenhouse-like, Lever-like)
- 98 tests passing, zero TypeScript errors, clean build

## Milestone 3 — Self-Learning Engine ✅ COMPLETE

Delivered:
- SimilarityMatcher — Jaccard token similarity (`jaccardSimilarity`, `findSimilarAnswer`, `isAutoApplyMatch`); SUGGEST_THRESHOLD=0.35, APPLY_THRESHOLD=0.60
- FieldObserver — attaches blur/change listeners to unrecognized DetectedField elements; fires callback with { question, answer, fieldType }; returns cleanup fn
- LearningOverlay — queue-based in-page suggestion toast ("Remember this answer?"); inline styles; auto-dismisses after 8s
- runAutofillFull() — extended engine that checks learned answers for unrecognized fields (Jaccard ≥ 0.60 → auto-fill); returns { result, unrecognizedFields[] }
- learnedFieldsApplied count in AutofillResult; shown as "From memory" row in popup
- Content script wires observer → overlay → SAVE_LEARNED_ANSWER message on approval
- Background EXECUTE_AUTOFILL now loads and passes learnedAnswers to content script
- LearnedAnswersPanel — inline answer editing (pencil → input → save/cancel), sorted by lastConfirmedAt, source domain badge
- 138 tests passing (up from 98), zero TypeScript errors, clean build

## Milestone 4 — Referral Management (NEXT)

## Milestone 4 — Referral Management (PLANNED)

## Milestone 5 — Application Tracking (PLANNED)

## Milestone 6 — Real ATS Integrations (PLANNED)

## Milestone 7 — Daily Digest (PLANNED)

## Milestone 8 — Product Hardening (PLANNED)
