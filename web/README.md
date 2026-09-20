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
