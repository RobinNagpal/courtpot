# Deployment

Everything runs on AWS under **https://courtpot.com**:

```
courtpot.com (Route 53 → CloudFront, ACM cert)
├── /*      → S3 bucket             (Expo web export, private, read via OAC)
└── /api/*  → api.courtpot.com:443  (shared Lightsail host, Caddy → :7071)
```

The API is **not** a Lambda. It is a systemd service on a Lightsail instance
shared with [interestled](https://github.com/RobinNagpal/interestled) — one
box, one application per port:

```
                    shared Lightsail instance  (13.216.34.24, medium_3_0)
                    ┌──────────────────────────────────────────────┐
courtpot.com     ──▶│ Caddy :443   api.courtpot.com    → :7071      │
  CloudFront        │  (Let's       api.interestled.com → :7072      │
                    │   Encrypt)                                    │
interestled.com  ──▶│ systemd  courtpot-api.service    :7071        │
  CloudFront        │ systemd  interestled-api.service :7072        │
                    └──────────────────────────────────────────────┘
```

**Only the instance is shared.** Each project keeps its own distribution,
bucket, certificate, Route 53 zone and deployer user, so the two never contend
over anything but CPU and memory — and the instance is the only meaningful
recurring cost, which is the reason to have one rather than two.

- The instance has its own Terraform stack in
  [`terraform/shared-host`](terraform/shared-host), with its own state bucket.
  It belongs to neither application; interestled's stack reads its state
  read-only to find the same static IP.
- **Caddy terminates TLS on `api.courtpot.com`** with a certificate it obtains
  and renews itself, and CloudFront reaches it over https. Encrypted on both
  hops, and the origin needs no ACM certificate — ACM here covers only
  `courtpot.com` and `www`.
- The `/api/*` origin is reached by **hostname, not IP**: CloudFront requires a
  DNS name for a custom origin, and TLS needs one anyway. `api.courtpot.com` is
  a plain A record to the instance's **static** IP, which survives the instance
  being recreated.
- **`www.courtpot.com` is redirect-only** — a CloudFront viewer-request
  function answers it with a `301` to the apex, preserving path and query
  string, and is attached to both behaviours so `www…/api/*` redirects too.
- The web build is a static single-page app (`expo export --platform web`); the
  same function rewrites extension-less paths to `/index.html` so client routes
  survive a refresh. `/api/*` is excluded, since those have no dot either.
- Postgres is **not** provisioned here — bring a connection string and set it as
  the `DATABASE_URL` repository secret.

`api.courtpot.com` is reachable directly, not only through CloudFront. That is
the same exposure the Lambda Function URL it replaced already had
(`authorization_type = "NONE"`): the API's own PIN-login/bearer-token auth is
the access control. Locking port 443 to CloudFront's published ranges would
also lock out `curl` when diagnosing a bad deploy, which is when you need it.

## The credential Terraform runs as

`terraform apply` for this stack runs as **courtpot-infra**, not an account
administrator. That user is created by
[deployment/terraform/infra-identity](terraform/infra-identity/README.md),
which is a separate stack applied by an administrator — a user that could apply
the stack defining its own policy could widen it.

It carries a **permissions boundary**, and that is the load-bearing part rather
than the narrow policy. This stack creates IAM users, so its credential needs
`iam:CreateUser`, `iam:PutUserPolicy` and `iam:CreateAccessKey` — and anything
holding those three can mint itself an administrator. The boundary caps every
principal created here, denies `iam:*` outright, and cannot be edited or
detached by the user subject to it. Verified by attempting it: creating an
unbounded user, rewriting the boundary, stripping it off an existing user, and
attaching `AdministratorAccess` are all denied, as is reaching the shared RDS
or another project's bucket.

The key belongs in `~/.aws/credentials` as a named profile, and `.envrc` sets
`AWS_PROFILE=courtpot-infra` — nothing else. An `AWS_ACCESS_KEY_ID` in the
environment takes precedence over a profile *and* over `--profile`, so a key
exported there would silently override the scoped identity it replaced.

```sh
cd deployment/terraform/infra-identity
terraform init -backend-config="bucket=courtpot-tfstate-<account-id>"
terraform apply                                    # as an administrator, once
terraform output -raw infra_access_key_id
terraform output -raw infra_secret_access_key
```

Two things stay an administrator's job: this stack, and the shared Lightsail
host, which belongs to neither application.

## One-time setup

Run Terraform with **admin** credentials (your own, not the deployer's). State
lives in private, versioned, SSE-encrypted S3 buckets; create each first.

**1. The shared host** — skip this entirely if interestled already created it;
there is only ever one, and a second `apply` of this stack would build a second
instance.

```sh
bash deployment/scripts/bootstrap-state-bucket.sh shared-host
cd deployment/terraform/shared-host
terraform init -backend-config="bucket=shared-host-tfstate-<account-id>"
terraform apply
```

**2. This project**

```sh
bash deployment/scripts/bootstrap-state-bucket.sh
cd deployment/terraform
terraform init -backend-config="bucket=courtpot-tfstate-<account-id>"
terraform apply
```

That creates the bucket, distribution, certificate (DNS-validated in the
existing `courtpot.com` zone), the `api.courtpot.com` record pointing at the
shared host, and a `courtpot-deployer` IAM user scoped to exactly: sync that
bucket and invalidate that distribution. Nothing in this stack can touch the
shared host — that is what the SSH key is for.

> The first apply takes ~5–10 minutes (certificate validation + CloudFront).

Then wire up GitHub Actions (**Settings → Secrets and variables → Actions**):

| Kind | Name | From |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | `terraform output deployer_access_key_id` |
| Secret | `AWS_SECRET_ACCESS_KEY` | `terraform output -raw deployer_secret_access_key` |
| Secret | `DATABASE_URL` | your Postgres connection string |
| Secret | `SSH_PRIVATE_KEY` | shared-host: `terraform output -raw deploy_private_key` |
| Variable | `S3_BUCKET` | `terraform output -raw web_bucket` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
| Variable | `DEPLOY_HOST` | shared-host: `terraform output -raw static_ip` |
| Variable | `SSH_HOST_KEY` | `ssh-keyscan -t rsa,ecdsa,ed25519 <static-ip>` |

`DATABASE_URL` is a secret because the workflow runs `prisma migrate deploy`
with it before shipping new code, so a deploy that adds a migration applies it.
It is the same string the workflow writes into `/etc/courtpot-api.env`.

`SSH_HOST_KEY` is **pinned** rather than accepted on first use, so a hijacked
record cannot collect a key that can restart both APIs. Recreating the instance
changes it — re-run `ssh-keyscan` and update the variable when that happens, or
every deploy will fail at the SSH step.

## Every deploy after that

Push to `main`. `.github/workflows/deploy.yml`:

1. exports the web app with `EXPO_PUBLIC_API_URL=https://courtpot.com` baked in,
   syncs it to S3 and invalidates CloudFront;
2. runs `prisma migrate deploy`;
3. bundles `apps/server/src/index.ts` with esbuild
   (`deployment/scripts/build-server.sh`);
4. rsyncs the bundle to `/srv/courtpot/next` on the shared host, swaps it into
   `current`, rewrites `/etc/courtpot-api.env`, and restarts `courtpot-api`;
5. polls `https://api.courtpot.com/health` and dumps the service's journal if it
   never answers.

The bundle is staged and swapped rather than written in place, so systemd can
never restart into a half-transferred directory. The environment file is
rewritten every deploy, so the workflow — not a hand edit on the box — decides
what the service runs with.

The bundle ships the **x86_64** Prisma query engine next to `index.js`, because
the bundled client loads its engine from its own directory at runtime. That
target (`debian-openssl-3.0.x`) tracks the host image; an engine built for the
wrong libc or OpenSSL fails at the first query rather than at start-up.

## Operating the shared host

```sh
# Terraform holds both keys; deploy_private_key is CI's, admin is yours.
cd deployment/terraform/shared-host
terraform output -raw admin_private_key > ~/.ssh/shared-apps.pem
chmod 600 ~/.ssh/shared-apps.pem
ssh -i ~/.ssh/shared-apps.pem ubuntu@$(terraform output -raw static_ip)

sudo journalctl -u courtpot-api -f     # this API's logs
sudo journalctl -u caddy -f            # TLS and routing
curl localhost:8080                    # host liveness, no certificate involved
curl localhost:7071/health             # this API, bypassing Caddy
```

**Adding an application, or changing a port**, is an edit to the `apps` map in
`terraform/shared-host/variables.tf` — but apply it by re-running the script on
the box, not with `terraform apply`. The map is part of `user_data`, and
changing `user_data` destroys and recreates the instance:

```sh
ssh -i ~/.ssh/shared-apps.pem ubuntu@<static-ip> \
  "sudo APPS_JSON='<the new map as JSON>' \
        DEPLOY_PUBLIC_KEY=\"\$(cat /home/deploy/.ssh/authorized_keys)\" \
        bash /root/provision.sh"
```

`provision.sh` is idempotent and derives everything it writes from `APPS_JSON`,
so a re-run converges. It leaves a copy at `/root/provision.sh` for exactly
this. Commit the variables change too, so the next instance is built the same.

**Recreating the instance** (a resize, or a rebuild) is safe but not free: no
data is lost, since state is in RDS and code is re-pushed by CI, but both APIs
are down until each project's workflow runs again, and `SSH_HOST_KEY` must be
updated in both repositories.

## Notes

- **Terraform state** lives in `courtpot-tfstate-<account-id>` and
  `shared-host-tfstate-<account-id>` (private, versioned, encrypted). Both
  contain secrets — the deployer's access key here, the SSH private keys there.
- **Costs**: the Lightsail instance is the only real recurring line, and it is
  shared. S3 is pennies, CloudFront sits in its free tier at this scale, and the
  hosted zone is the $0.50/month you already pay. Splitting the two APIs onto
  separate instances would double the one number that matters.
