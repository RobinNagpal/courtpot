output "boundary_policy_arn" {
  description = "Every principal the project stack creates must carry this."
  value       = aws_iam_policy.boundary.arn
}

output "infra_user_arn" {
  description = "The identity `terraform apply` should run as for ../."
  value       = aws_iam_user.infra.arn
}

output "infra_access_key_id" {
  description = "Put in ~/.aws/credentials as a named profile — never in a file inside the repository."
  value       = var.create_infra_access_key ? aws_iam_access_key.infra[0].id : null
}

output "infra_secret_access_key" {
  description = "As above. Stored in this stack's state, which is why that state is encrypted and private."
  value       = var.create_infra_access_key ? aws_iam_access_key.infra[0].secret : null
  sensitive   = true
}
