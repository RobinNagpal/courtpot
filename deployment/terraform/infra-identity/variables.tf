variable "app_name" {
  description = "Prefix for every resource name, and the IAM path this user may manage."
  type        = string
  default     = "courtpot"
}

variable "aws_region" {
  description = "Region for the project's resources."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Apex domain, used to find the hosted zone this user may change."
  type        = string
  default     = "courtpot.com"
}

variable "shared_host_state_bucket" {
  description = <<-EOT
    The shared host's state bucket. The project stack reads it to find the
    instance's IP, so the infra user needs to read that one object — and only
    read it: the host belongs to neither application.
  EOT
  type        = string
  default     = "shared-host-tfstate-729763663166"
}

variable "create_infra_access_key" {
  description = "Create an access key and expose it as sensitive outputs. The key is stored in this stack's state."
  type        = bool
  default     = true
}
