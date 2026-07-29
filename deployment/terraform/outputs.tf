output "site_url" {
  description = "Where the app is served."
  value       = "https://${var.domain_name}"
}

output "web_bucket" {
  description = "S3 bucket for the web build — set as the S3_BUCKET GitHub Actions variable."
  value       = aws_s3_bucket.web.bucket
}

output "cloudfront_distribution_id" {
  description = "Set as the CLOUDFRONT_DISTRIBUTION_ID GitHub Actions variable."
  value       = aws_cloudfront_distribution.web.id
}

output "lambda_function_name" {
  description = "API Lambda function name (the deploy workflow hardcodes this)."
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_url" {
  description = "Stable direct URL of the API Lambda (CloudFront fronts it as /api/*)."
  value       = aws_lambda_function_url.api.function_url
}

output "deployer_access_key_id" {
  description = "Set as the AWS_ACCESS_KEY_ID GitHub Actions secret."
  value       = var.create_deployer_access_key ? aws_iam_access_key.deployer[0].id : null
}

output "deployer_secret_access_key" {
  description = "Set as the AWS_SECRET_ACCESS_KEY GitHub Actions secret."
  value       = var.create_deployer_access_key ? aws_iam_access_key.deployer[0].secret : null
  sensitive   = true
}

output "set_database_url_command" {
  description = "Run this once (with admin credentials) to point the API at your Postgres."
  value       = "aws lambda update-function-configuration --function-name ${aws_lambda_function.api.function_name} --environment 'Variables={DATABASE_URL=<your-postgres-url>}'"
}
