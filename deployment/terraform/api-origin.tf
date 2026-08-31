# The API used to be a Lambda in this stack. It now runs on the shared Lightsail
# instance — one host, one bill, both projects — which lives in its own stack at
# deployment/terraform/shared-host. Everything else here is unchanged and stays
# per-project: this distribution, this bucket, this certificate, this zone.
#
# Read-only: this stack never writes the shared host's state, it only needs the
# address to point a record at.
data "terraform_remote_state" "shared_host" {
  backend = "s3"

  config = {
    bucket = var.shared_host_state_bucket
    key    = "shared-host/terraform.tfstate"
    region = var.aws_region
  }
}

locals {
  # Caddy on the shared host holds a Let's Encrypt certificate for this name and
  # reverse-proxies it to the courtpot API's own port. It must match the
  # api_host in the shared-host stack's `apps` variable.
  api_host = "api.${var.domain_name}"
}

# A plain A record, not an alias: the target is a Lightsail static IP rather
# than an AWS-hosted zone target.
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.api_host
  type    = "A"
  ttl     = 300
  records = [data.terraform_remote_state.shared_host.outputs.static_ip]
}
