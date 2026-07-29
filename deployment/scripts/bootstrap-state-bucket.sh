#!/usr/bin/env bash
# One-time, idempotent: creates the private, versioned, encrypted S3 bucket
# that holds the Terraform state, then prints the terraform init command.
# Run with admin credentials before the first `terraform init`.
set -euo pipefail

region="${AWS_DEFAULT_REGION:-us-east-1}"
account_id="$(aws sts get-caller-identity --query Account --output text)"
bucket="courtpot-tfstate-$account_id"

if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
  echo "Bucket $bucket already exists — skipping creation."
else
  if [[ "$region" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$bucket" --region "$region"
  else
    aws s3api create-bucket --bucket "$bucket" --region "$region" \
      --create-bucket-configuration "LocationConstraint=$region"
  fi
fi

aws s3api put-bucket-versioning --bucket "$bucket" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$bucket" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
aws s3api put-public-access-block --bucket "$bucket" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "State bucket ready: $bucket"
echo "Init the backend with:"
echo "  terraform init -backend-config=\"bucket=$bucket\""
