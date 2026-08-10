# /shared

Mongoose models and DB connection utility used by BOTH `/web` (Next.js app)
and `/worker` (scraper). This is the single source of truth for schemas —
never duplicate a model file into `/web` or `/worker` directly.

## Suggested monorepo layout

```
dse-app/
├── shared/          <- this folder
│   ├── db.js
│   ├── index.js
│   └── models/
│       ├── Company.js
│       ├── Price.js
│       ├── PriceHistory.js
│       ├── User.js
│       ├── Transaction.js
│       └── Watchlist.js
├── web/             <- Next.js app
│   └── ...
└── worker/          <- scraper
    └── ...
```

## Usage

From `/web` (Next.js API routes) or `/worker` (scraper script):

```js
import { connectDB, Company, Price, Transaction } from "../shared/index.js";

await connectDB();
const companies = await Company.find({ isActive: true });
```

Adjust the relative path (`../shared/index.js`) based on where the importing
file actually lives.

## Env vars required

Both `/web/.env.local` and `/worker/.env` need:

```
MONGODB_URI=your-atlas-connection-string
```

## Notes

- **Price** = latest snapshot only, one doc per stock, upserted every scrape
  cycle. This is what your screener/dashboard reads for "current price."
- **PriceHistory** = time-series collection, one point appended per stock per
  scrape cycle. This is what you'll query later for charts. Don't read this
  for "current price" — read `Price` instead, it's a single indexed lookup
  vs. scanning for the latest history point.
- **Transaction** = every buy/sell is its own document. Current holdings,
  avg. cost, and P/L are all derived by aggregating these at query time —
  there's no mutable "quantity" field stored anywhere.
- **User.password** — only used for the email/password (Credentials) login
  flow. Google OAuth users won't have this field populated. See the comment
  in `User.js` about not creating a duplicate user record across the two
  auth methods — NextAuth's `@auth/mongodb-adapter` already manages a
  `users` collection, so make sure both flows agree on collection name and
  identity (match on email).
