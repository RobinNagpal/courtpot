# The one host both applications share, and the only recurring cost in this
# arrangement. Each application keeps its own CloudFront distribution, S3
# bucket, certificate and DNS — those are per-project and near-free — and runs
# only its API process here, on its own port.

locals {
  # provision.sh is a plain shell file rather than a template so it stays
  # readable and re-runnable by hand; its configuration arrives as the three
  # exported variables below. jsonencode is safe inside single quotes because it
  # never emits one.
  #
  # It is written to disk and then invoked, rather than concatenated and run
  # directly, for two reasons. Lightsail prepends its own `#!/bin/sh` block to
  # whatever user_data it is given, so the interpreter is dash no matter what
  # shebang this string starts with, and provision.sh needs bash. And leaving
  # the file at /root/provision.sh is what makes adding an application later a
  # re-run over SSH instead of a user_data change, which would destroy and
  # recreate the instance.
  user_data = join("\n", [
    "export APPS_JSON='${jsonencode(var.apps)}'",
    "export DEPLOY_PUBLIC_KEY='${trimspace(tls_private_key.deploy.public_key_openssh)}'",
    "export ACME_EMAIL='${var.acme_email}'",
    "cat > /root/provision.sh <<'SHARED_HOST_PROVISION'",
    file("${path.module}/provision.sh"),
    "SHARED_HOST_PROVISION",
    "chmod 700 /root/provision.sh",
    "bash /root/provision.sh",
  ])
}

# Used by both projects' GitHub Actions. One host, one deploy identity — the
# private key is a repository secret in each, and the public half is installed
# on the `deploy` user by provision.sh.
resource "tls_private_key" "deploy" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Separate from the deploy key on purpose: this one is for a human on the
# `ubuntu` account, which has full sudo. CI never gets it.
resource "aws_lightsail_key_pair" "admin" {
  name = "${var.instance_name}-admin"
}

resource "aws_lightsail_instance" "host" {
  name              = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = aws_lightsail_key_pair.admin.name
  user_data         = local.user_data
}

# A static IP so both projects' A records survive the instance being recreated.
# Lightsail's default public IP does not.
resource "aws_lightsail_static_ip" "host" {
  name = "${var.instance_name}-ip"
}

resource "aws_lightsail_static_ip_attachment" "host" {
  static_ip_name = aws_lightsail_static_ip.host.name
  instance_name  = aws_lightsail_instance.host.name

  lifecycle {
    # Replacing the instance silently detaches the address, and neither
    # argument above changes when it does — both are names, which Lightsail
    # reuses — so without this the attachment looks up to date while the IP
    # actually points at nothing and both APIs are dark. The ARN carries a
    # per-instance UUID, so it is the value that genuinely changes.
    replace_triggered_by = [aws_lightsail_instance.host.arn]
  }
}

# Authoritative: this resource replaces Lightsail's whole firewall, so the list
# is everything that is reachable. The application ports (7071, 7072) are
# deliberately absent — they are bound behind Caddy and reached over loopback.
#
# 443 is open to the internet rather than to CloudFront's published ranges. That
# matches what the Lambda Function URL it replaces already allowed: the API's
# own bearer-token auth is the access control, and locking the origin to
# CloudFront would also lock out `curl` when diagnosing a bad deploy.
resource "aws_lightsail_instance_public_ports" "host" {
  instance_name = aws_lightsail_instance.host.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
  }

  # Needed by Let's Encrypt's HTTP-01 challenge as well as by Caddy's
  # redirect to https.
  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }
}
