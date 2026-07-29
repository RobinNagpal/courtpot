# CI deploy user for GitHub Actions. Scoped to exactly the three things a
# deploy does: sync the web bucket, invalidate the distribution, and push new
# Lambda code. It cannot touch anything else in the account.
resource "aws_iam_user" "deployer" {
  name = "${var.app_name}-deployer"
  path = "/${var.app_name}/"
}

data "aws_iam_policy_document" "deployer" {
  statement {
    sid       = "WebBucketList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.web.arn]
  }

  statement {
    sid = "WebBucketWrite"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.web.arn}/*"]
  }

  statement {
    sid = "InvalidateCache"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
    ]
    resources = [aws_cloudfront_distribution.web.arn]
  }

  statement {
    sid = "UpdateLambdaCode"
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
    ]
    resources = [aws_lambda_function.api.arn]
  }
}

resource "aws_iam_user_policy" "deployer" {
  name   = "${var.app_name}-deploy"
  user   = aws_iam_user.deployer.name
  policy = data.aws_iam_policy_document.deployer.json
}

resource "aws_iam_access_key" "deployer" {
  count = var.create_deployer_access_key ? 1 : 0
  user  = aws_iam_user.deployer.name
}
