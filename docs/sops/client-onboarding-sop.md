# Client Onboarding SOP — Invictus AI
## From Signed Agreement to Live Delivery

---

## Overview
| Item | Detail |
|------|--------|
| Total Duration | 10-14 business days |
| Owner | Delivery Team (Jeff / assigned agent) |
| Tools | GHL (CRM + pipeline), n8n (automations), GitHub Pages / Vercel (hosting), Razorpay (payments) |
| Pipeline | GHL Onboarding Pipeline (R6G5m2bF6vxtoho9ZeQH) |

---

## Day 0: Agreement & Payment

### Trigger: Lead moves to "Won" in Sales Pipeline

**Actions:**
1. **Send Agreement** — Digital agreement via GHL form (rcuyHyjUaFD7tYZBzIAy)
   - Terms of service, scope of work, timeline, payment terms
   - E-signature capture
   - Auto-notification to delivery team on completion

2. **Collect Payment** — 50% upfront (or full payment for Starter tier)
   - Send Razorpay payment link via WhatsApp/email
   - Payment confirmation triggers pipeline move: Agreement → Paid
   - Invoice generated and sent automatically

3. **Move Pipeline** → "Paid" stage in Onboarding Pipeline (3a073acd)

4. **Create Fulfillment Record:**
   - Client name, niche, tier, start date, target live date (Day 0 + 14)
   - Assigned delivery agent
   - All task checklist items set to "pending"

**Automations (n8n):**
- On payment received → Send welcome email + WhatsApp message
- Create Google Drive folder for client assets
- Assign to delivery agent + send internal notification

---

## Day 1-2: Onboarding & Asset Collection

### Trigger: Payment confirmed

**Actions:**
1. **Send Onboarding Form** — Comprehensive intake form via GHL
   - Business details, branding, services, target audience
   - Logo, photos, color preferences
   - Competitor websites
   - Special requirements/notes
   - Pipeline move: Paid → Onboarding Scheduled (c56da4e2)

2. **Schedule Onboarding Call** (30 min) — GHL calendar booking
   - Agenda: Review form responses, clarify requirements, set expectations
   - Record call notes in CRM

3. **Onboarding Call Execution:**
   - Review submitted form data together
   - Clarify any ambiguous answers
   - Discuss design preferences (show 2-3 template options from demo library)
   - Confirm deliverables and timeline
   - Get verbal approval on direction
   - Pipeline move: → Intake Form (4d4c4dbd)

4. **Asset Collection Checklist:**
   - [ ] Business logo (PNG/SVG, high resolution)
   - [ ] Brand colors (hex codes or "use your judgment")
   - [ ] Photos (office, team, products/services — minimum 5)
   - [ ] Service descriptions + pricing (if public)
   - [ ] Testimonials / reviews to feature
   - [ ] Domain access (if existing) or domain purchase decision
   - [ ] Google Business Profile access
   - [ ] Social media handles
   - [ ] Any existing content (brochures, PDFs, videos)

**If client delays form submission:**
- Day 1: Automated reminder (WhatsApp)
- Day 2: Personal follow-up call
- Day 3: Escalation to account manager
- After Day 5: Pipeline → "Limbo" stage, project paused

---

## Day 3-5: Build Phase

### Trigger: Onboarding form completed + assets received

**Website Build:**
1. Select template from demo library matching niche + style preferences
   - Source: jarvis-invictus/invictus-dental-demos (191 niches available)
2. Customize with client's:
   - Logo, colors, fonts
   - Business name, address, phone, email
   - Service descriptions + pricing
   - Photos (real photos > stock wherever possible)
   - Testimonials
   - Call-to-action buttons (Book Now, Call Us, WhatsApp)
3. SEO fundamentals:
   - Title tags: "[Service] in [City] | [Business Name]"
   - Meta descriptions with local keywords
   - Schema markup (LocalBusiness)
   - Alt tags on all images
   - Mobile responsive verification
4. Pipeline move: → Step 2 (92f5724b)

**CRM Setup (if Growth/Scale tier):**
1. Configure GHL pipeline stages for client's business
2. Create intake/booking forms
3. Set up appointment calendar
4. Configure notification preferences
5. Build lead capture form for website

**Automation Setup (if Growth/Scale tier):**
1. Missed call text-back
2. New lead notification (WhatsApp + email)
3. Appointment reminders (24h + 1h before)
4. Post-visit review request (24h after)
5. Follow-up sequence for no-shows

---

## Day 5-7: First Review

### Trigger: Build complete

**Actions:**
1. **Internal QA Check:**
   - [ ] All pages load correctly
   - [ ] Mobile responsive on 3 device sizes
   - [ ] All links work (no 404s)
   - [ ] Forms submit correctly
   - [ ] Page speed > 80 (Lighthouse)
   - [ ] Contact info accurate
   - [ ] No lorem ipsum or placeholder content
   - [ ] SSL certificate active
   - [ ] Analytics/tracking installed

2. **Client Review Session** (20-30 min video call):
   - Screen share the live preview
   - Walk through every page
   - Collect feedback section by section
   - Document all change requests
   - Set revision deadline (2-3 days)
   - Pipeline move: → Step 3 (7970ef01)

3. **Revision Document:**
   - Itemized list of requested changes
   - Priority: must-have vs nice-to-have
   - Estimated completion time
   - Max 2 rounds of revisions included (per agreement)

---

## Day 7-10: Revisions & Final Approval

**Actions:**
1. Implement all requested revisions
2. Second QA pass
3. Send final preview link to client
4. Request written approval (email/WhatsApp confirmation)
5. If approved → Pipeline move: → Step 4 (1fe4b13f)

**If client requests additional rounds:**
- Round 3+: Communicate that additional revisions are billable
- Document scope creep and get approval before proceeding

---

## Day 10-14: Go Live & Handover

### Trigger: Final approval received

**Go Live Checklist:**
1. **Domain Setup:**
   - [ ] Domain purchased/transferred (client's domain or our subdomain)
   - [ ] DNS records configured (A record, CNAME)
   - [ ] SSL certificate provisioned (Let's Encrypt auto via Traefik)
   - [ ] Old website redirects (if replacing)

2. **Deployment:**
   - [ ] Push to production (GitHub Pages / Vercel / VPS)
   - [ ] Verify live URL works
   - [ ] Test all forms on live site
   - [ ] Verify Google Analytics tracking
   - [ ] Submit sitemap to Google Search Console

3. **CRM Handover (Growth/Scale):**
   - [ ] Client login credentials created
   - [ ] GHL mobile app installed on client's phone
   - [ ] Pipeline stages explained
   - [ ] Test incoming lead notification

4. **Training Call** (30-45 min):
   - How to update basic content (if applicable)
   - How to use GHL dashboard
   - How to view leads/appointments
   - How to respond to automated messages
   - Emergency contact for issues

5. **Handover Documentation:**
   - Login credentials (encrypted)
   - What's automated vs what they manage
   - Support contact and hours
   - FAQ document

6. **Collect Final Payment:**
   - Send remaining 50% invoice
   - Razorpay payment link
   - Site remains on staging until payment cleared

7. **Pipeline move:** → Onboarded (c06bd721)

---

## Day 14+: Ongoing Support

**Monthly Recurring Clients (Growth/Scale):**
- Monthly performance report (traffic, leads, conversions)
- Proactive optimization suggestions
- Content updates (up to X per month per tier)
- Priority support response (< 4 hours)
- Quarterly strategy review call

**Starter Tier (no monthly):**
- 30-day post-launch support for bugs/issues
- Email support for critical issues
- Upsell touchpoint at Day 30, 60, 90

---

## Escalation Triggers

| Situation | Action | Timeline |
|-----------|--------|----------|
| Client unresponsive > 3 days | Personal call + WhatsApp | Immediate |
| Client unresponsive > 7 days | Account manager escalation | Same day |
| Client unresponsive > 14 days | Project paused, move to Limbo | Notify client |
| Scope creep detected | Document + get approval | Before starting work |
| Client unhappy with design | Offer alternative template | Within 24h |
| Technical issue post-launch | Priority fix | < 4 hours |
| Payment overdue > 7 days | Payment follow-up sequence | Automated |
| Payment overdue > 30 days | Service suspension warning | Account manager |

---

## GHL Pipeline Stage Mapping

| Day | Stage | Stage ID | Trigger |
|-----|-------|----------|---------|
| 0 | Agreement | b18bc20f | Agreement form sent |
| 0 | Paid | 3a073acd | Payment confirmed |
| 1 | Onboarding Scheduled | c56da4e2 | Onboarding call booked |
| 2 | Intake Form | 4d4c4dbd | Onboarding form completed |
| 3-5 | Step 2 (Building) | 92f5724b | Build phase started |
| 5-7 | Step 3 (Review) | 7970ef01 | Client review scheduled |
| 7-10 | Step 4 (Revisions) | 1fe4b13f | Revisions in progress |
| 10-14 | Wrapped-Up | c6d1e531 | Going live |
| 14 | Onboarded | c06bd721 | Handover complete |
| — | No-Show | d79e49a8 | Client missed onboarding call |
| — | Limbo | 83daa0e8 | Client unresponsive > 14 days |

---

*Last Updated: April 10, 2026*
*Version: 1.0*
*Owner: Invictus AI — Delivery Team*
