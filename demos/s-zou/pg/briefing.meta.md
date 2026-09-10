# Briefing: Procter & Gamble

## Customer
- **Name:** Procter & Gamble
- **Slug:** pg
- **Owner:** s-zou
- **Industry:** retail_cpg
- **Framing:** reduce-revenue-leakage-from-deductions
- **Logo URL:** https://upload.wikimedia.org/wikipedia/commons/8/85/Procter_%26_Gamble_logo.svg

## Domain
- **Process focus:** Accounts Receivable — deductions reconciliation and posting (Order-to-Cash / Cash Application). Solution name: **Deduction Validity App**.
- **Primary KPI:** Revenue leakage from invalid / unvalidated deductions
- **Value opportunity:** Automate end-to-end deduction validation — remittance ingestion, invoice reconciliation, reason-code determination (D10 / C30 / C50 / A70 / D20), SAP writeback of cash application + deduction, and late-POD resolution — so deductions are only conceded when they are provably valid.
- **Value opportunity ($):** Not quantified in the source blueprint — this demo is a solution-scope demo, not a value-case demo. Do NOT invent a $ figure.

## Audience
- **Level:** mixed — solution/architecture review audience
- **Role cue:** AR leadership plus the teams who run the process
- **Stakeholder:** AR Team, CMO Team, Cash Application / AR Analysts, PS Team

## Scope override (IMPORTANT — non-standard)
The V/E explicitly scoped this demo to **TWO screens only**. The canonical 9-beat arc
does NOT apply. Do not generate context-model, value-chain, analyze, deep-dive,
operate-app, copilot-studio, or enterprise-ai-control-center screens.

### Screen 1 — Full solution blueprint (`00-blueprint`)
Purpose: aspirational opener. Show the COMPLETE Deduction Validity App as one
connected orchestration so the audience grasps full scope before any live clicking.

Content — all four workflows stitched onto one canvas:
1. **Primary Workflow** (adhoc, near real-time): remittance monitored in Outlook →
   ingest email + remittance documents via MLWB → push docs to Operational View +
   archive to SharePoint → ingest invoice data → reconcile payment vs. invoice →
   decision `Invoice Amount = Payment Amount?` → Code Deduction
   (D10 / C30 / C50 / A70 / D20) → post cash application + deduction to SAP →
   send reports to CMO/PS team.
2. **Secondary (POD) Workflow** (2x daily, 7AM + 3PM PHL): re-check the POD tracker
   to resolve "Pending POD" D20 placeholders → rejection in POD → D20;
   clean POD → A70 → update deduction in SAP.
3. **Reporting Workflow**: review today's RA/postings daily, then fan out to
   Alrecon (daily), FBL5 (weekly), Returns (weekly), Rejections (Tue/Thu).
4. **Feeder jobs**: SAP data pulled into the Celonis backend (invoice data,
   pricing sheet data, PODs, rejections, returns, Alrecon).

Visual intent: wide, deliberately DENSE canvas grouped into lanes by system —
Outlook, Celonis, SAP, SharePoint — matching the source blueprint. Density reads as
"this is a serious, complete solution." Steps are boxes, decisions are diamonds,
flow reads left-to-right through the lifecycle.

### Screen 2 — The demo slice (`01-demo-slice`)
Purpose: immediately narrow expectations to the exact path about to be demoed live,
so nobody worries the whole blueprint will be walked.

Content: the Primary Workflow happy path for a single short-paid invoice
(`INV-4501873392`) — remittance arrives → ingest & clean via MLWB → archive →
reconcile → decision fork → code the deduction → valid/invalid recommendation →
SAP writeback → email handoff → FBL5 report.

**Implementation decision (V/E-approved 2026-09-08).** The original spec asked for
the IDENTICAL Screen 1 canvas with a subset spotlit and the remainder dimmed. That
is not authorable with the standard components: neither `process-explorer` nor
`process-orchestration-flow` exposes a per-node dim/highlight knob, and the only
dimming mechanism that exists (`status: skipped` → 60% opacity + dashed connectors)
is valid only on the untaken branch of an exclusive gateway.

The V/E was offered three paths (standard-blocks trail / same-canvas-narrowed /
one-off local fork) and chose **the standard-blocks trail**, keeping the demo
shareable. So Screen 2 is a `process-orchestration-flow`: the demo thread rendered
as an explicit step trail, with the fully-paid branch (`close-fully-paid`) carried as
`status: skipped` so it renders greyed and dashed — a semantically correct
"this invoice doesn't go there" spotlight. Do NOT "fix" this to match the original
wording; the deviation is deliberate and approved.

### Component choices (both screens)
- Screen 1 uses `process-explorer`, NOT `process-orchestration-flow`. Reason: the
  orchestration component caps at 14 nodes, has NO lane/swimlane support, and lays
  out as a vertical fork/merge column. `process-explorer` supports up to 5 colored
  lanes + 15 happy-path events + 5 deviation clusters, which is what the blueprint's
  system lanes and ~18 nodes actually need. `default_all_visible: true` is set so all
  four lanes show on mount (the "breadth at a glance" requirement) rather than
  revealing progressively.
- Lane palette (never repeat within one PE): Outlook `#ac45fe`, Celonis `#264aff`
  (focal), SAP `#249499`, SharePoint `#b67600`.

### Figures policy — how the required count fields were filled
`process-explorer` requires a `count` string on every event and connection, but the
source blueprint carries NO volumetrics. Rather than invent transaction volumes,
`count` / `event_count` / `throughput_time` carry the blueprint's own **cadence and
condition annotations** ("Near real-time", "Instant upload", "Weekly — Wednesdays",
"Invoice ≠ Payment", "Document type DZ"). `kpi_overlay` is deliberately OMITTED — it
would have required inventing a KPI and a benchmark. If the V/E later supplies real
volumes, these are the fields to replace.

## Reason-code logic (source of truth — from blueprint pp. 11–15)
- **D10** — Returns; available on the remittance.
- **C30** — Pricing variance; match invoice against the pricing sheet in SharePoint
  (consolidated tracker, invoice no. in column B; refreshed Wednesdays). If no
  matching record, no difference can be determined → fall through.
- **C50** — Promo; check remittance for promotion.
- **A70** — Overpayment, or no determinable pricing difference, or POD available
  and clean.
- **D20** — Rejection in POD (partial or full). If NO POD available at time of RA →
  D20 with text field "Pending POD" (resolved later by the Secondary Workflow).

## SAP posting fields (blueprint p. 14)
Company Code 403 · Customer Account · Reference (from remittance) · Document Header
Text (from remittance) · Document Type always DZ · Document Date = date of payment ·
Currency always PHP · Business Area always ZZ03 · Assignment (related invoice no.) ·
Amount · Text (from remittance) · Reason Code · Posting Key · Posting Date.

## Systems in scope
Outlook (AR Claims shared inbox) · Celonis (MLWB, Action Flows, Operational View,
OCDM `ReceivableItem`) · SAP (FBL5, cash app + deduction writeback) · SharePoint
(document archive, pricing trackers, POD spreadsheet).

## Overrides
- Two screens only (see Scope override above).
- Both screens are orchestration canvases (`process-orchestration-flow`), not the
  standard beat components.
- No invented KPI or $ figures — the blueprint carries none. Content fidelity to the
  blueprint outranks narrative polish here.
- Lane grouping by system (Outlook / Celonis / SAP / SharePoint) is required on both
  screens.

## Source
- **Brief path:** fallback intake — V/E supplied `Use Case 1 Solutioning P_G V2_0.pdf`
  (AR Solution Blueprint, Use Case 1: Reduce Revenue Leakage from Deductions,
  Deduction Validity App, July 2026) plus a written 2-screen spec. No
  `~/.atlas/accounts/` brief exists.
- **Storyline path:** absent
