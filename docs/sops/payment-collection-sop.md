# Payment & Collection SOP — Invictus AI

---

## Payment Structure Summary

| Tier | Setup Fee | Monthly | Payment Split |
|------|-----------|---------|---------------|
| Starter | ₹15K-25K | None | 100% upfront OR 50/50 |
| Growth | ₹35K-50K | ₹8K-12K/mo | 50% up + 50% on delivery |
| Scale | ₹75K-1L | ₹15K-25K/mo | 40/30/30 milestone |

---

## Payment Collection Process

### Step 1: Invoice Generation
- Generate invoice immediately after verbal/written agreement
- Include: client name, business name, GSTIN (if available), scope, amount, due date
- Invoice format: `INV-YYYYMM-XXX` (e.g., INV-202604-001)
- Tools: Razorpay invoicing OR manual (Google Docs template → PDF)

### Step 2: Send Payment Link
**Primary method: Razorpay Payment Links**
1. Create payment link in Razorpay dashboard (wa-invictus.in)
2. Include: amount, description, client email, expiry (7 days)
3. Send via WhatsApp (primary) + email (backup)

**Message template (WhatsApp):**
> Hi [Name]! 🙏
> 
> Great to have [Business Name] onboard with Invictus AI! 
> 
> Here's your payment link for the [Tier] package:
> 💳 [Razorpay Link]
> 
> Amount: ₹[Amount]
> Valid till: [Date]
> 
> Once payment is confirmed, we'll kick off your project within 24 hours! Let me know if you have any questions.

**Accepted payment methods:**
- UPI (preferred — instant confirmation)
- Credit/Debit Card
- Net Banking
- Bank Transfer (NEFT/IMPS — share account details on request)

### Step 3: Payment Confirmation
- Razorpay sends automatic receipt to client
- Internal notification via n8n webhook → Slack/Discord
- Update CRM: move opportunity to "Paid" stage
- Update fulfillment tracker: record payment amount + date
- Send thank you message + next steps

---

## Monthly Recurring Collection

### Setup
1. After go-live, set up Razorpay subscription (for Growth/Scale)
2. OR: Manual monthly invoice on 1st of each month
3. Payment due by 5th of each month
4. Auto-reminder on 1st and 3rd

### Monthly Invoice Template:
```
Invoice: INV-YYYYMM-XXX
Client: [Business Name]
Period: [Month Year]
Package: [Growth/Scale]
Amount: ₹[Amount]
Due: [5th of month]

Services included:
- Website hosting & maintenance
- CRM management
- [X] content updates used this month
- Automation monitoring
- Support hours: [X]h used
```

---

## Overdue Payment Follow-Up Cadence

| Day | Action | Channel | Tone |
|-----|--------|---------|------|
| Due date | Invoice sent with payment link | WhatsApp + Email | Friendly |
| Day +3 | Gentle reminder | WhatsApp | "Just checking in — did you see the invoice?" |
| Day +7 | Follow-up call | Phone | Professional concern |
| Day +10 | Second reminder with urgency | Email + WhatsApp | "Your account is past due..." |
| Day +15 | Account manager escalation | Phone call | Firm but fair |
| Day +21 | Service pause warning | Email (formal) | "We'll need to pause services on [date]" |
| Day +30 | Service paused | Email (formal) | "Services have been paused until payment" |
| Day +45 | Final notice | Email (legal tone) | "Final notice before account termination" |
| Day +60 | Account terminated | Email | Formal closure |

### Escalation Templates:

**Day +3 (WhatsApp):**
> Hi [Name]! Just a quick reminder — your invoice of ₹[Amount] for [Month] is pending. Here's the payment link: [Link]. Let me know if there are any issues! 🙏

**Day +7 (Phone script):**
> "Hi [Name], this is [Agent] from Invictus AI. I'm calling about the invoice we sent on [Date] for ₹[Amount]. I wanted to check if everything is okay and if you received the payment link. Is there anything on your end that's holding up the payment?"

**Day +21 (Email — formal):**
> Subject: Important: Service Pause Notice — [Business Name]
> 
> Dear [Name],
> 
> We hope this message finds you well. This is regarding the outstanding invoice INV-[XXX] dated [Date] for ₹[Amount].
> 
> As per our service agreement, payments are due by the 5th of each month. Your account is now [X] days overdue.
> 
> To avoid any interruption to your services, please complete the payment by [Date + 7 days]: [Razorpay Link]
> 
> If there are any concerns or if you'd like to discuss payment arrangements, please don't hesitate to reach out.
> 
> Best regards,
> Invictus AI Team

---

## Payment Tracking System

### CRM Fields for Payment Tracking:
- `payment_status`: paid / pending / overdue / paused
- `total_contract_value`: lifetime value of the deal
- `setup_fee_paid`: amount collected for setup
- `setup_fee_remaining`: outstanding setup balance
- `monthly_rate`: recurring monthly amount
- `last_payment_date`: date of most recent payment
- `next_payment_due`: date of next expected payment
- `total_collected`: all-time collected amount
- `outstanding_balance`: current unpaid amount

### Monthly Revenue Tracking:
Track in fulfillment system:
```json
{
  "clientId": "xxx",
  "payments": [
    {
      "date": "2026-04-10",
      "amount": 25000,
      "type": "setup",
      "method": "razorpay",
      "reference": "pay_XXX",
      "status": "completed"
    },
    {
      "date": "2026-05-01",
      "amount": 10000,
      "type": "monthly",
      "method": "razorpay",
      "reference": "pay_YYY",
      "status": "pending"
    }
  ]
}
```

---

## Refund Policy

| Scenario | Refund |
|----------|--------|
| Cancellation before build starts | Full refund minus ₹5,000 processing fee |
| Cancellation during build (before first review) | 50% refund of setup fee |
| Cancellation after first review | No refund (work delivered) |
| Monthly subscription cancellation | No refund for current month; service runs till end of billing period |
| Dissatisfaction with final product | Offer revision round OR partial credit toward future month |

**Refund process:**
1. Client requests refund in writing (email)
2. Account manager reviews and approves/negotiates
3. Refund processed via original payment method within 7-10 business days
4. CRM updated, pipeline moved to "Lost" with reason code

---

## Financial Reporting

### Weekly:
- Total collected this week
- Outstanding invoices
- Pipeline value (expected collections)

### Monthly:
- MRR (Monthly Recurring Revenue)
- New setup fees collected
- Churn (clients who cancelled)
- Collection rate (% of invoiced amount collected on time)
- Average revenue per client
- Client lifetime value (LTV) trend

### Targets:
- Collection rate target: > 95% on time
- MRR growth target: +20% month-over-month
- Outstanding balance never exceeds 15% of monthly revenue

---

*Last Updated: April 10, 2026*
*Version: 1.0*
*Owner: Invictus AI — Finance Operations*
