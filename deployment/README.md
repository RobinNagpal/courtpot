# Deployment

Everything runs on AWS under **https://courtpot.com**:

```
courtpot.com (Route 53 → CloudFront, ACM cert)
├── /*      → S3 bucket        (Expo web export, private, read via OAC)
└── /api/*  → Lambda Function URL (Hono server, nodejs22.x arm64)
```

- The Lambda **Function URL** is free and permanent — it never changes for the
  lifetime of the function, so nothing has to be re-wired between deploys.
  Clients never see it anyway; CloudFront serves the API on the same domain as
  the app, which also means there is no CORS in production.
- The web build is a static single-page app (`expo export --platform web`).
  A CloudFront function rewrites extension-less paths to `/index.html` so
  client-side routes work on refresh.
- Postgres is **not** provisioned here — bring a connection string (Neon and
  Supabase free tiers work well) and set it as the Lambda's `DATABASE_URL`.

## One-time setup

Run Terraform with **admin** credentials (your own, not the deployer's) from
`deployment/terraform`:

```sh
cd deployment/terraform
terraform init
terraform apply
```

That creates the bucket, distribution, certificate (DNS-validated
automatically in the existing `courtpot.com` hosted zone), Route 53 records
for `courtpot.com` + `www.courtpot.com`, the `courtpot-api` Lambda with its
Function URL, and a `courtpot-deployer` IAM user whose policy is scoped to
exactly: sync that bucket, invalidate that distribution, update that
function's code.

> The first apply takes ~5–10 minutes (certificate validation + CloudFront).

Then wire up GitHub Actions (repo **Settings → Secrets and variables →
Actions**) from the Terraform outputs:

| Kind | Name | From |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | `terraform output deployer_access_key_id` |
| Secret | `AWS_SECRET_ACCESS_KEY` | `terraform output -raw deployer_secret_access_key` |
| Variable | `S3_BUCKET` | `terraform output -raw web_bucket` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |

Finally point the API at your database (Terraform ignores later changes to
the function's environment, so this survives future applies):

```sh
aws lambda update-function-configuration \
  --function-name courtpot-api \
  --environment 'Variables={DATABASE_URL=<postgres-connection-string>}'
```

Use a **pooled** connection string if your provider offers one (Neon/Supabase
poolers) — each concurrent Lambda holds its own connection. Run migrations
from your machine against the same database:

```sh
DATABASE_URL=<postgres-connection-string> pnpm --filter server db:migrate
```

## Every deploy after that

Push to `main`. `.github/workflows/deploy.yml` exports the web app with
`EXPO_PUBLIC_API_URL=https://courtpot.com` baked in, syncs it to S3,
invalidates CloudFront, bundles `apps/server/src/lambda.ts` with esbuild
(`deployment/scripts/build-lambda.sh`), and updates the Lambda code.

## Notes

- **Terraform state** lives wherever you ran `apply` (it is gitignored). It
  also contains the deployer's secret key when
  `create_deployer_access_key = true` (the default; set it to `false` and
  mint the key in the IAM console if you prefer). Keep the state file, or
  enable the commented S3 backend in `versions.tf`.
- **Costs**: everything here sits in the always-free or near-free tier at
  small scale — S3 pennies, CloudFront/Lambda free tiers, the Route 53 hosted
  zone's $0.50/month you already pay. The database is the only real decision.
- The Function URL is public (`authorization_type = "NONE"`) — the API's own
  auth (PIN login → bearer token) is the access control, same as any public
  API host. CloudFront's OAC-signed alternative breaks POST bodies for
  browser clients, so it is deliberately not used here.
