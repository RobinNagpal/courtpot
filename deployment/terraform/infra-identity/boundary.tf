# The ceiling on every IAM principal `courtpot-infra` creates.
#
# A permissions boundary is not a grant. It is the maximum a principal can ever
# have, whatever policy is attached to it — so this is deliberately wider than
# courtpot-deployer or courtpot-api actually get, and still narrow enough
# that nothing created here can reach another product in this account.
#
# The `iam:*` deny is the point of the whole file: it is what stops a principal
# created by the infra user from creating principals of its own, which is the
# escalation path a boundary exists to close.

locals {
  account = data.aws_caller_identity.current.account_id

  # Only the web bucket: courtpot has no audio bucket. Adding one means adding
  # it here as well, or the deploy user is capped below what it needs.
  project_buckets = [
    "arn:aws:s3:::${var.app_name}-web-${local.account}",
  ]
  project_bucket_objects = [for arn in local.project_buckets : "${arn}/*"]
}

data "aws_iam_policy_document" "boundary" {
  statement {
    sid       = "ProjectBuckets"
    actions   = ["s3:*"]
    resources = concat(local.project_buckets, local.project_bucket_objects)
  }

  # CloudFront has no resource-level authorisation for most actions, so this
  # cannot be narrowed to one distribution. It is capped at the two calls a
  # deploy makes rather than left open.
  statement {
    sid = "Invalidation"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:GetDistribution",
    ]
    resources = ["*"]
  }

  # Nothing created by the infra user may create anything itself. Without this
  # the boundary is decorative: a bounded user could make an unbounded one.
  statement {
    sid       = "NeverIam"
    effect    = "Deny"
    actions   = ["iam:*"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "boundary" {
  name        = "${var.app_name}-boundary"
  path        = "/${var.app_name}/"
  description = "Permissions boundary every ${var.app_name} principal must carry. Editable only by an administrator."
  policy      = data.aws_iam_policy_document.boundary.json
}
