terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  # Its own state, beside the project's, because this stack is applied by an
  # administrator and the project stack is not.
  #   terraform init -backend-config="bucket=courtpot-tfstate-<account-id>"
  backend "s3" {
    key     = "infra-identity/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
