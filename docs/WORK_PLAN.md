# eNuzul Property Management System
## Work Plan Document (Draft)

**Project:** eNuzul — Property management for Mogadishu  
**Domain:** [eNuzul.com](https://eNuzul.com)  
**Working codebase folder:** propsync-next  
**Document version:** 1.1  
**Planning horizon:** **15 days** (prep sprint)  
**Prep sprint:** 31 May – 14 June 2026  
**★ Beta live target:** 14 June 2026  
**★ Pilots active target:** **1 July 2026**  
**★ 30-day pilot review:** **31 July 2026**  

---

## Timeline at a glance

```
15-DAY PREP (31 May – 14 Jun)
  → Interviews + system review + domain
  → Deploy beta + legal docs + Excel template
  → ★ BETA LIVE (14 Jun)

PILOT RAMP (15 Jun – 30 Jun)
  → Recruit & onboard 2–3 owners
  → QR printed, data loaded, training done

★ PILOTS ACTIVE — 1 JULY 2026

30-DAY PILOT PERIOD (1 Jul – 31 Jul)
  → Weekly check-ins, fix critical bugs only
  → ★ PILOT REVIEW — 31 JULY 2026
```

---

## Assumptions

| # | Assumption |
|---|------------|
| 1 | Core product is ~85% built — beta is deploy + validate, not a rebuild |
| 2 | **15 days** is for prep only; pilots run **30 days** starting **1 July 2026** |
| 3 | Target: **2–3 pilot owners** active on 1 July |
| 4 | Tenant access is QR-only (no passwords) for new registrations |
| 5 | Online rent payment (EVC/Zaad) deferred until after pilot review |
| 6 | Brand name: **eNuzul**; domain: **eNuzul.com** (purchased) |
| 7 | Team: 1–3 people working in parallel |
| 8 | Hosting: Vercel + Neon PostgreSQL |

---

## 1. Executive Summary

**eNuzul** (eNuzul.com) is a property management platform for Mogadishu landlords and diaspora investors — dashboard for owners/caretakers, **QR portal** for tenants (no login).

**Goal:** In **15 days**, go from prototype to **production beta live**. By **1 July 2026**, have **2–3 pilot owners** actively using the system. On **31 July 2026**, run the **30-day pilot review** and decide next steps (paid launch, extend, or pivot).

**Critical path:** Interviews (parallel) → system review + domain → deploy → docs → recruit → onboard before 1 July.

**Estimated prep cash cost:** $50–150 (domain, email, hosting)

---

## 2. Project Objectives & Success Criteria

### Primary objectives

| ID | Objective | Target date |
|----|-----------|-------------|
| O1 | Complete market validation (interviews + summary) | 7 Jun 2026 |
| O2 | System review done; P1 bugs scoped | 5 Jun 2026 |
| O3 | Domain + professional email live | 7 Jun 2026 |
| O4 | **Production beta deployed** | **14 Jun 2026** |
| O5 | Legal docs + Excel template ready | 14 Jun 2026 |
| O6 | **2–3 pilot owners onboarded & active** | **1 Jul 2026** |
| O7 | **30-day pilot review complete** | **31 Jul 2026** |

### Success criteria

| KPI | Target | When |
|-----|--------|------|
| Owner interviews | ≥ 5 | By 7 Jun |
| Beta live (production URL) | Yes | By 14 Jun |
| Pilot owners committed | ≥ 2 (stretch: 3) | By 25 Jun |
| Pilots active using system | ≥ 2 | **1 Jul** |
| Units live in system | ≥ 10 | 1 Jul |
| QR codes printed & in use | ≥ 8 units | 1 Jul |
| Owner login during pilot | ≥ 1× per week | Jul |
| 30-day review completed | Yes | **31 Jul** |
| Willingness to pay (post-review) | ≥ 50% of pilots | 31 Jul |

---

## 3. Scope

### In scope — 15-day prep

- 5+ owner interviews + short market summary
- 2-hour system analysis (keep / cut / defer)
- Buy domain + setup hello@ / support@
- Production deploy + `db:migrate`
- Privacy policy + pilot terms (template level)
- Owner onboarding guide + apartments Excel template
- Fix **P1 bugs only** (blockers to deploy + onboarding)
- Recruit pilot owners (start Day 8; onboard by 30 Jun)

### In scope — pilot period (1–31 Jul)

- Hands-on owner onboarding (if not finished in June)
- Weekly check-ins (Day 7, 14, 30 of pilot = 8, 15, 31 Jul)
- Critical bug fixes only
- Feedback log
- 30-day review meeting + go/no-go on paid launch

### Out of scope (until after 31 Jul review)

- Online rent payment API
- Automated SaaS billing
- Major new features / backend rewrites
- UI full rebrand (optional quick logo/name swap only)
- Lawyer-reviewed contracts

---

## 4. 15-Day Prep Sprint (day-by-day)

| Day | Date | Focus | Deliverables |
|-----|------|-------|--------------|
| **1** | 31 May | Kickoff | Work plan agreed; prospect list (10 owners); interview schedule |
| **2** | 1 Jun | Interviews + domain | 2 interviews; domain secured (eNuzul.com) |
| **3** | 2 Jun | Interviews + system review | 2 interviews; **system analysis session** (Section 7) |
| **4** | 3 Jun | Interviews + brand | 1 interview; **buy domain**; start email setup |
| **5** | 4 Jun | Strategy | Market summary draft; pricing confirmed; P1 bug list |
| **6** | 5 Jun | Tech | Production Neon migrate; deploy prep |
| **7** | 6 Jun | Tech + docs | **Deploy to Vercel**; smoke test; draft privacy policy |
| **8** | 7 Jun | Docs + sales | Pilot terms draft; **Excel template**; pitch 2–3 pilots |
| **9** | 8 Jun | Docs + fix | Onboarding guide; fix P1 bugs |
| **10** | 9 Jun | Beta hardening | Full flow test: property → tenant → QR → maintenance |
| **11** | 10 Jun | Recruit | Pilot agreements sent; owner accounts pre-created |
| **12** | 11 Jun | Recruit | Onboarding calls scheduled (before 1 Jul) |
| **13** | 12 Jun | Polish | support@ live; operational runbook (half page) |
| **14** | 13 Jun | Final QA | Production checklist complete |
| **15** | 14 Jun | **Milestone** | **★ BETA LIVE** — announce URL to pilot prospects |

### Parallel workstreams (15 days)

| Stream | Days 1–5 | Days 6–10 | Days 11–15 |
|--------|----------|-----------|------------|
| **Founder** | Interviews, domain, docs draft, recruit | Pilot terms, Excel, onboarding guide | Sign pilots, schedule Jun onboarding |
| **Tech** | System review, P1 list | Deploy, migrate, bug fixes | QA, owner account setup |
| **Both** | Go/no-go check Day 5 | Deploy live Day 7 | Beta live Day 15 |

---

## 5. Pilot ramp (15 Jun – 30 Jun)

| Date | Action |
|------|--------|
| 15–18 Jun | Pilot #1 onboarding call + data entry + QR print |
| 19–22 Jun | Pilot #2 onboarding |
| 23–26 Jun | Pilot #3 onboarding (if committed) |
| 27–30 Jun | Final checks: all units loaded, QR on walls, test maintenance ticket |
| **1 Jul** | **★ PILOTS ACTIVE** — official start of 30-day pilot |

### Pilot onboarding checklist (each owner)

| Step | Action | Done |
|------|--------|------|
| 1 | Pilot agreement signed | ☐ |
| 2 | Owner account + trial plan | ☐ |
| 3 | Property + units added | ☐ |
| 4 | Tenants registered | ☐ |
| 5 | QR generated & printed | ☐ |
| 6 | Owner trained (dashboard, payments, maintenance) | ☐ |
| 7 | One test flow completed together | ☐ |

---

## 6. 30-day pilot period (1 Jul – 31 Jul)

| Date | Action |
|------|--------|
| **1 Jul** | Pilot start — confirm all owners live |
| **8 Jul** | Check-in #1 (15 min each owner) |
| **15 Jul** | Check-in #2 + feedback log review |
| **22 Jul** | Fix any critical blockers only |
| **31 Jul** | **★ 30-DAY REVIEW** — KPIs, pay willingness, launch decision |

### Review agenda (31 Jul)

1. Did each pilot use the system weekly?  
2. QR adoption — tenants scanning?  
3. Top 3 bugs / missing features  
4. Would they pay? At what price?  
5. Decision: **Paid launch** / **Extend 30 days** / **Pivot**

---

## 7. Work Breakdown Structure (compressed)

| ID | Task | Owner | Due | P |
|----|------|-------|-----|---|
| A1 | 5 owner interviews | Founder | 7 Jun | P1 |
| A2 | Market summary (1 page) | Founder | 7 Jun | P1 |
| A3 | System analysis session | Team | 3 Jun | P1 |
| A4 | Buy domain + email | Founder | 7 Jun | P1 |
| B1 | Privacy policy + pilot terms | Founder | 10 Jun | P1 |
| B2 | Excel apartments template | Founder | 8 Jun | P1 |
| B3 | Owner onboarding guide | Founder | 9 Jun | P1 |
| C1 | `db:migrate` production | Tech | 6 Jun | P1 |
| C2 | Vercel deploy + smoke test | Tech | 7 Jun | P1 |
| C3 | Fix P1 bugs only | Tech | 12 Jun | P1 |
| D1 | Recruit 2–3 pilots | Founder | 25 Jun | P1 |
| D2 | Onboard all pilots | Founder | 30 Jun | P1 |
| D3 | Weekly check-ins (Jul) | Founder | 8, 15, 31 Jul | P1 |
| D4 | 30-day review | Team | 31 Jul | P1 |

---

## 8. System Analysis Framework

| Feature | Action | Rationale |
|---------|--------|-----------|
| QR tenant portal | **Keep** | Core differentiator |
| Owner dashboard + caretaker | **Keep** | Core |
| Maintenance + chat | **Keep** | Top pain point |
| Cloud lease e-sign | **Keep** | Diaspora + disputes |
| Manual payment tracking | **Keep** | Enough for pilot |
| Notifications | **Keep** | Owner engagement |
| Somali / English + districts | **Keep** | Local market |
| Tenant password login | **Hide** | QR-only |
| Online rent payment | **Defer** | After 31 Jul review |
| Full UI rebrand | **Defer** | Name swap optional in prep |
| Export to Excel | **Nice** | Only if time before Day 15 |

---

## 9. Document Deliverables

| Document | Due | Status |
|----------|-----|--------|
| Work plan (this doc) | 31 May | Draft |
| Market summary (1 page) | 7 Jun | ☐ |
| Privacy policy | 10 Jun | ☐ |
| Pilot terms | 10 Jun | ☐ |
| Excel template | 8 Jun | ☐ |
| Owner onboarding guide | 9 Jun | ☐ |
| Operational runbook (½ page) | 13 Jun | ☐ |
| Pilot review report | 31 Jul | ☐ |

---

## 10. Risk Register (15-day sprint)

| Risk | Mitigation |
|------|------------|
| Not enough interviews in 15 days | Start Day 1; minimum 3 if 5 impossible |
| Deploy delayed | Deploy Day 7 latest; no new features after Day 5 |
| Pilots not ready by 1 Jul | Commit pilots by 25 Jun; onboard in June not July |
| Scope creep | P1 bugs only; defer everything else to August |
| Owner no-show for onboarding | Book slots early; backup 3rd prospect |

---

## 11. Budget (prep + pilot)

| Item | Cost (USD) |
|------|------------|
| Domain + email | 15–80 |
| Hosting (2 months) | 0–40 |
| **Prep total** | **~50–120** |

---

## 12. Next actions — Day 1 (31 May)

| # | Action | Owner |
|---|--------|-------|
| 1 | Confirm this plan with team | Founder |
| 2 | List 10 owner prospects + call 3 today | Founder |
| 3 | Book system analysis session (Day 3) | Team |
| 4 | Confirm DNS for eNuzul.com + email | Founder |
| 5 | Verify production Neon + Vercel access | Tech |

---

## Appendix A — Owner interview script (short)

1. How many units? Local or abroad?  
2. How do you track rent today?  
3. Biggest problem last 3 months?  
4. Would QR on unit help tenants pay/report repairs?  
5. **Free 30-day pilot from 1 July — interested?**  
6. What would you pay/month for ~10 units?

---

## Appendix B — Beta live checklist (14 Jun)

- ☐ Production URL works  
- ☐ Login (owner + admin)  
- ☐ Add property → unit → tenant  
- ☐ QR generates and opens portal  
- ☐ Maintenance create + chat  
- ☐ Payment mark paid + receipt  
- ☐ `support@` email receiving  
- ☐ Privacy + pilot terms ready to send  
- ☐ Excel template ready to share  

---

## Appendix C — Excel template sheets

1. **Properties** — ID, name, district, address, type, units, owner phone  
2. **Units & tenants** — unit, status, rent, tenant, phone, lease dates, QR printed  
3. **Rent payments** — month, unit, due, paid, method, status  
4. **Maintenance** — date, unit, issue, priority, status  

---

*Document version 1.1 · Prep sprint: 31 May – 14 Jun 2026 · Pilots active: 1 Jul 2026 · Review: 31 Jul 2026*
