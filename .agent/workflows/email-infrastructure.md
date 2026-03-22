---
description: Nuomoria email infrastructure setup and support email configuration
---

# Nuomoria Email Infrastructure

## Current Setup

### 1. ImprovMX — Email Forwarding (FREE)
- **Domain:** `nuomoria.lt` (Email forwarding active ✅)
- **Aliases configured:**
  - `dmarc@nuomoria.lt` → `juozaskazukauskas501@gmail.com`
  - `noreply@nuomoria.lt` → `juozaskazukauskas501@gmail.com`
  - `owner@nuomoria.lt` → `juozaskazukauskas501@gmail.com`
  - `support@nuomoria.lt` → `juozaskazukauskas501@gmail.com`
- **Result:** All emails sent TO any `@nuomoria.lt` address arrive in Gmail

### 2. Resend — Transactional Email API
- **Domain:** `nuomoria.lt` (verified via DNS)
- **From address:** `Nuomoria <noreply@nuomoria.lt>`
- **API Key:** stored as `RESEND_API_KEY` in Supabase Edge Function secrets
- **Edge Function:** `send-invitation-email` — sends tenant invitation emails
- **Free tier:** 3000 emails/month

### 3. Proton Mail — Backup Account
- **Address:** `nuomoria@proton.me` (Free plan)
- **Use:** Backup/alternative support channel

### 4. Gmail — Primary Inbox
- **Address:** `juozaskazukauskas501@gmail.com`
- **Receives:** All forwarded `@nuomoria.lt` emails via ImprovMX

## How to Send Support Emails AS support@nuomoria.lt

### Option A: Gmail "Send mail as" + Resend SMTP (FREE)
1. Gmail → Settings → Accounts → "Send mail as" → Add
2. Name: `Nuomoria Support`
3. Email: `support@nuomoria.lt`
4. SMTP server: `smtp.resend.com`
5. Port: `587` (TLS)
6. Username: `resend`
7. Password: Resend API key
8. Done — can now send FROM `support@nuomoria.lt` via Gmail

### Option B: Direct Resend API (for automated emails)
- Used by Edge Functions for transactional emails
- Currently: invitation emails only
- Can be extended for: welcome emails, invoice notifications, reminders

## Email Flow Diagram

```
RECEIVING:
  Someone → support@nuomoria.lt → ImprovMX → juozaskazukauskas501@gmail.com

SENDING (manual support):
  Gmail "Send as" → Resend SMTP → support@nuomoria.lt → recipient

SENDING (automated):
  Edge Function → Resend API → noreply@nuomoria.lt → recipient
```

## Future Improvements (when revenue grows)
- Upgrade ImprovMX to Premium ($9/mo) for SMTP sending
- OR upgrade Proton to Plus (€4/mo) for custom domain inbox
- OR Google Workspace (€8/mo) for full Gmail experience
- Add more Edge Functions: welcome email, invoice email, payment receipt, trial expiry
