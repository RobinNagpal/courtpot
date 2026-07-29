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

variable "database_url" {
  description = <<-EOT
    Postgres connection string for the API Lambda. May be left empty at first
    apply — the function's environment is in `ignore_changes`, so a value set
    later in the AWS console (or via `aws lambda update-function-configuration`)
    survives future applies.
  EOT
  type        = string
  default     = ""
  sensitive   = true
}

variable "lambda_memory_mb" {
  description = "Memory for the API Lambda (CPU scales with it)."
  type        = number
  default     = 512
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
