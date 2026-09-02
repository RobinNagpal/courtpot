# The user `terraform apply` runs as for ../ — everything this project owns,
# and nothing else in an account shared with several unrelated products.
#
# Path /infra/ rather than /<app>/ on purpose: its own IAM grant below is
# written against /<app>/, so putting it there would let it rewrite its own
# policy. The explicit denies at the end close the same door a second time.

resource "aws_iam_user" "infra" {
  name = "${var.app_name}-infra"
  path = "/infra/"
}

data "aws_route53_zone" "main" {
  name = var.domain_name
}

data "aws_iam_policy_document" "infra" {
  # --- the project's own storage -------------------------------------------
  statement {
    sid       = "ProjectBuckets"
    actions   = ["s3:*"]
    resources = concat(local.project_buckets, local.project_bucket_objects)
  }

  # Creating a bucket cannot be scoped to a name that does not exist yet, so
  # this is the one broad S3 grant. It is create-and-inspect only: the
  # destructive verbs stay on the named buckets above.
  statement {
    sid = "CreateProjectBuckets"
    actions = [
      "s3:CreateBucket",
      "s3:ListAllMyBuckets",
      "s3:GetBucketLocation",
    ]
    resources = ["*"]
  }

  # --- terraform state ------------------------------------------------------
  statement {
    sid     = "OwnState"
    actions = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [
      "arn:aws:s3:::${var.app_name}-tfstate-${local.account}",
      "arn:aws:s3:::${var.app_name}-tfstate-${local.account}/*",
    ]
  }

  # Read-only, and only the one object: ../ reads this to learn the shared
  # host's IP. The host itself is courtpot's stack and an administrator's job.
  statement {
    sid       = "SharedHostStateReadOnly"
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.shared_host_state_bucket}/shared-host/terraform.tfstate"]
  }

  statement {
    sid       = "SharedHostStateList"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.shared_host_state_bucket}"]
  }

  # --- the distribution, its function, and the certificate ------------------
  # CloudFront and ACM authorise almost nothing at resource level, and both
  # create resources whose ARNs do not exist until they are made. This is the
  # part that cannot be tightened further without a service that supports it.
  statement {
    sid       = "Cdn"
    actions   = ["cloudfront:*"]
    resources = ["*"]
  }

  statement {
    sid       = "Certificates"
    actions   = ["acm:*"]
    resources = ["*"]
  }

  # --- DNS, scoped to this project's zone -----------------------------------
  statement {
    sid = "OwnZone"
    actions = [
      "route53:ChangeResourceRecordSets",
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets",
      # Reading a zone by name reads its tags too, so a data source fails
      # without this even though nothing here writes a tag.
      "route53:ListTagsForResource",
    ]
    resources = ["arn:aws:route53:::hostedzone/${data.aws_route53_zone.main.zone_id}"]
  }

  # Finding a zone by name, and following a change to INSYNC, are account-wide
  # reads with no resource form.
  statement {
    sid       = "FindZones"
    actions   = ["route53:ListHostedZones", "route53:ListHostedZonesByName", "route53:GetChange"]
    resources = ["*"]
  }

  # --- the two principals the project stack owns ----------------------------
  statement {
    sid = "ReadIam"
    actions = [
      "iam:GetUser",
      "iam:GetUserPolicy",
      "iam:ListUsers",
      "iam:ListUserPolicies",
      "iam:ListAttachedUserPolicies",
      "iam:ListAccessKeys",
      "iam:GetAccessKeyLastUsed",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:ListPolicyVersions",
      "iam:ListUserTags",
    ]
    resources = ["*"]
  }

  # A new principal must be born with the boundary. Without this condition the
  # infra user could create an unbounded one and attach anything to it.
  statement {
    sid       = "CreateBoundedPrincipals"
    actions   = ["iam:CreateUser", "iam:PutUserPermissionsBoundary"]
    resources = ["arn:aws:iam::${local.account}:user/${var.app_name}/*"]

    condition {
      test     = "StringEquals"
      variable = "iam:PermissionsBoundary"
      values   = [aws_iam_policy.boundary.arn]
    }
  }

  # Attaching a wide policy here is harmless: the boundary still caps whatever
  # is attached, which is exactly what a boundary is for.
  statement {
    sid = "ManageBoundedPrincipals"
    actions = [
      "iam:DeleteUser",
      "iam:TagUser",
      "iam:UntagUser",
      "iam:PutUserPolicy",
      "iam:DeleteUserPolicy",
      "iam:AttachUserPolicy",
      "iam:DetachUserPolicy",
      "iam:CreateAccessKey",
      "iam:DeleteAccessKey",
      "iam:UpdateAccessKey",
    ]
    resources = ["arn:aws:iam::${local.account}:user/${var.app_name}/*"]
  }

  # --- the denies that make the rest true -----------------------------------
  # An explicit deny beats every allow, here and in any policy added later.

  # Detaching the boundary would turn a bounded principal into an unbounded one.
  statement {
    sid       = "NeverDropTheBoundary"
    effect    = "Deny"
    actions   = ["iam:DeleteUserPermissionsBoundary"]
    resources = ["*"]
  }

  # Rewriting the boundary is the same escalation by another route: a new
  # default version saying "Allow *" lifts the ceiling on everything at once.
  statement {
    sid    = "NeverEditTheBoundary"
    effect = "Deny"
    actions = [
      "iam:CreatePolicyVersion",
      "iam:DeletePolicyVersion",
      "iam:SetDefaultPolicyVersion",
      "iam:DeletePolicy",
    ]
    resources = [aws_iam_policy.boundary.arn]
  }

  # And it may not touch itself. The allows above are written against
  # /<app>/ so they already exclude /infra/, but this is the one mistake worth
  # failing closed on twice.
  statement {
    sid     = "NeverItself"
    effect  = "Deny"
    actions = ["iam:*"]
    resources = [
      "arn:aws:iam::${local.account}:user/infra/*",
      # Its own grant is a managed policy now, so the ARN to protect is a
      # policy as well as a user — otherwise it could rewrite what it may do.
      "arn:aws:iam::${local.account}:policy/infra/*",
    ]
  }
}

# A managed policy rather than an inline one: IAM caps an inline user policy at
# 2048 bytes and this is comfortably past that, which surfaces as a LimitExceeded
# at apply rather than as anything about size.
resource "aws_iam_policy" "infra" {
  name        = "${var.app_name}-infra"
  path        = "/infra/"
  description = "Everything ${var.app_name}'s Terraform manages, and nothing else in this account."
  policy      = data.aws_iam_policy_document.infra.json
}

resource "aws_iam_user_policy_attachment" "infra" {
  user       = aws_iam_user.infra.name
  policy_arn = aws_iam_policy.infra.arn
}

resource "aws_iam_access_key" "infra" {
  count = var.create_infra_access_key ? 1 : 0
  user  = aws_iam_user.infra.name
}
