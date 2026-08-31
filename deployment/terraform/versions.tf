terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  # State lives in a private, versioned, SSE-encrypted S3 bucket created by
  # deployment/scripts/bootstrap-state-bucket.sh (the state records every
  # resource here, including the deployer's secret key). The bucket name is
  # account-specific, so init with:
  #   terraform init -backend-config="bucket=courtpot-tfstate-<account-id>"
  backend "s3" {
    key     = "courtpot/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
