# The credential Terraform runs as

`terraform apply` for this project used to need an account administrator. This
stack creates `courtpot-infra` instead: a user that can manage this
project's resources and nothing else in an account that also carries several
unrelated products.

It is a **separate stack, applied by an administrator**, and deliberately not
part of `../`. A user that could apply the stack which defines its own policy
could widen that policy, which is the whole thing this is trying to prevent.
Run it once, then never again except to change what the infra user may do.

## Why a permissions boundary and not just a narrow policy

The project stack creates IAM users — that is where `courtpot-deployer` and
`courtpot-api` come from. So the infra user needs `iam:CreateUser`,
`iam:PutUserPolicy` and `iam:CreateAccessKey`, and **any principal holding
those three can mint itself an administrator**. A narrow-looking policy without
a boundary is escalation-equivalent to admin: it prevents accidents, not an
attacker.

The boundary closes that. `courtpot-boundary` is the ceiling on every
principal the infra user creates, it denies `iam:*` outright, and the infra
user is denied every action that could edit or detach it. So the worst a
stolen infra key can build is another principal that is also confined to this
project's buckets.

Three things make the deny half work, and all three matter:

- The infra user sits at path `/infra/`, while everything it manages sits at
  `/courtpot/`. Its own `iam:*` grant therefore does not describe itself.
- `iam:CreateUser` and `iam:PutUserPermissionsBoundary` carry a condition on
  `iam:PermissionsBoundary`, so a principal cannot be created without the
  boundary or moved to a different one.
- `iam:DeleteUserPermissionsBoundary` and every write on the boundary policy
  are explicitly denied. An explicit deny cannot be overridden.

## Applying it

```sh
cd deployment/terraform/infra-identity
terraform init -backend-config="bucket=courtpot-tfstate-<account-id>"
terraform apply                       # as an administrator

terraform output -raw infra_access_key_id
terraform output -raw infra_secret_access_key
```

Put those in `~/.aws/credentials` as a named profile and use it for the project
stack — never in a file inside the repository:

```ini
[courtpot-infra]
aws_access_key_id     = ...
aws_secret_access_key = ...
```

```sh
AWS_PROFILE=courtpot-infra terraform -chdir=deployment/terraform \
  plan -var="domain_name=courtpot.com"
```

## What it cannot do, on purpose

- **The shared Lightsail host**, whose stack sits next door in
  `../shared-host`. It belongs to neither application — interestled runs on the
  same instance — so it stays an administrator's job. A credential named for
  one of the two applications should not be able to rebuild the box the other
  one is serving from.
- **Delete this project's buckets' contents at will.** It has full S3 on them
  because Terraform genuinely needs it, which is worth knowing: the audio
  bucket holds recordings that cost money to make and cannot be rebuilt.
- **Read any other product's data.** RDS, the other buckets in this account,
  and every unrelated distribution are outside its policy entirely.
