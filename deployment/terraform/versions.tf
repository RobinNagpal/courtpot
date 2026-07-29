terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6"
    }
  }

  # The state file records every resource this config manages (and the
  # deployer's secret key, if created here) — keep it somewhere durable.
  # Uncomment to store it in S3 instead of on the machine running terraform:
  #
  # backend "s3" {
  #   bucket = "<your-terraform-state-bucket>"
  #   key    = "courtpot/terraform.tfstate"
  #   region = "us-east-1"
  # }
}
