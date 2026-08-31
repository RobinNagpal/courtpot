output "static_ip" {
  description = <<-EOT
    The address every application's api.<domain> A record points at. Each
    project's stack reads this through terraform_remote_state rather than
    having it pasted in, so recreating the instance cannot leave a stale record
    behind.
  EOT
  value       = aws_lightsail_static_ip.host.ip_address
}

output "api_hosts" {
  description = "Hostname Caddy serves for each application, and the port behind it."
  value       = { for name, app in var.apps : name => "${app.api_host} → 127.0.0.1:${app.port}" }
}

output "deploy_private_key" {
  description = "Set as the SSH_PRIVATE_KEY GitHub Actions secret in every project on this host."
  value       = tls_private_key.deploy.private_key_openssh
  sensitive   = true
}

output "admin_private_key" {
  description = "Human SSH access as `ubuntu` (full sudo). Not given to CI."
  value       = aws_lightsail_key_pair.admin.private_key
  sensitive   = true
}

output "ssh_command" {
  description = "Save admin_private_key to a file first, then this connects."
  value       = "ssh -i <key-file> ubuntu@${aws_lightsail_static_ip.host.ip_address}"
}
