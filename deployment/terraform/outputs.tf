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

output "api_origin_host" {
  description = "Hostname CloudFront sends /api/* to. Caddy on the shared host terminates it."
  value       = local.api_host
}

output "shared_host_ip" {
  description = "Static IP of the shared Lightsail instance — the DEPLOY_HOST Actions variable."
  value       = data.terraform_remote_state.shared_host.outputs.static_ip
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
