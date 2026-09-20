This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Invite Emails

The dashboard invite flow can send real emails via Resend.
Set these variables in `web/.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
INVITE_FROM_EMAIL=CoFoundery <invite@your-domain.com>
```

Notes:
- `INVITE_FROM_EMAIL` must be a verified sender/domain in Resend.
- If one of these variables is missing, invites are still saved in the database, but no email is sent.

## AI analysis on a local model

The model runs on a laptop, not in the cloud. **The laptop asks the database for
work; nothing ever calls the laptop.** No open port, no tunnel, no endpoint a
stranger could reach — and when the laptop is off, work simply waits.

```bash
brew install ollama
ollama serve
ollama pull qwen3.5:4b
```

```bash
npm run ai:eval      # measures the model against the curated term list
npm run ai:worker    # takes work out of the queue
```

The worker needs an account of its own — **not** the service-role key. In the
Supabase dashboard under Authentication → Users, add a user with email and
password (auto-confirm), then put its id on the allowlist:

```sql
insert into public.ai_workers (user_id, label)
values ('<the new user id>', 'Laptop');
```

```bash
AI_WORKER_EMAIL=...
AI_WORKER_PASSWORD=...
AI_MODEL=qwen3.5:4b            # optional, this is the default
OLLAMA_URL=http://127.0.0.1:11434   # optional
```

That account may do exactly three things: take a job, finish it, send a
heartbeat. It cannot even *read* the queue — a pgTAP case pins that. If the
laptop is lost, the damage stops there.

Notes:
- `qwen3.5` reasons before answering, which with a forced schema runs past any
  sane timeout. The client disables it (`think: false`); that is also why no
  hidden chain of thought is ever received or stored.
- The model only ever sees a task plus the person's text as *material*, never as
  instructions, and every suggestion must carry verbatim quotes that are checked
  against the source. Nothing a model produces is authoritative before a person
  confirms it.
- Availability in the app comes from a heartbeat row (`get_ai_availability`),
  not from a health call into the laptop. Two minutes of grace at a 30-second
  beat.
- Measured on 20.09.2026 with `qwen3.5:4b` on an M3/16 GB over ten invented
  cases: model 10/10 found with 1 surplus, term list 3/10 with 8 surplus,
  6–12 s per case.

## Notifications on the device (Web Push)

Generate a VAPID key pair once and put it in the environment:

```bash
node scripts/generate-vapid-keys.mjs
```

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # goes to the browser, that is its purpose
VAPID_PRIVATE_KEY=...              # never with a NEXT_PUBLIC_ prefix
VAPID_SUBJECT=mailto:you@your-domain.com   # falls back to RESEND_FROM_EMAIL
```

Notes:
- A new or changed value only takes effect with the next deploy.
- Generate the pair **once**. A new pair invalidates every subscription a
  browser has already stored - every device would silently stop receiving.
- Without the keys the account page says so and offers no switch; emails are
  unaffected.
- On iPhone and iPad, notifications only work once the site has been added to
  the home screen (iOS 16.4+). In a Safari tab the browser APIs are absent.
- Sending is verified against the worked example in RFC 8291 §5
  (`src/lib/push/__tests__/webPushCrypto.test.ts`) - a mistake there is
  invisible in production, because the push services accept a badly encrypted
  payload and the device drops it silently.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
