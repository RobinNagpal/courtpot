variable "app_name" {
  description = "Prefix for every resource name."
  type        = string
  default     = "courtpot"
}

variable "aws_region" {
  description = "Region for the Lambda function and S3 bucket."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Apex domain, already hosted in Route 53."
  type        = string
  default     = "courtpot.com"
}

variable "shared_host_state_bucket" {
  description = <<-EOT
    Terraform state bucket of the shared Lightsail host, read to find the
    instance's static IP. The host is shared with interestled, so its state
    lives under neither project's name — create it with
    `deployment/scripts/bootstrap-state-bucket.sh shared-host`.

    No database or LLM settings appear in this stack any more: the API is a
    process on that host, and its environment is written to /etc/courtpot-api.env
    by the deploy workflow from repository secrets.
  EOT
  type        = string
  default     = "shared-host-tfstate-729763663166"
}

variable "create_deployer_access_key" {
  description = <<-EOT
    Create an access key for the CI deployer user and expose it as (sensitive)
    outputs. Set to false if you prefer to mint the key yourself in the IAM
    console; the key created here is also stored in the terraform state.
  EOT
  type        = bool
  default     = true
}
