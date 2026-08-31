terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # This stack is shared: it belongs to neither application, so its state is
  # kept in its own bucket rather than under either project's name. Create it
  # with deployment/scripts/bootstrap-state-bucket.sh shared-host, then:
  #   terraform init -backend-config="bucket=shared-host-tfstate-<account-id>"
  #
  # Both application stacks read this state (read-only, via
  # terraform_remote_state) to learn the instance's static IP.
  backend "s3" {
    key     = "shared-host/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
