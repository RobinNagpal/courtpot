variable "aws_region" {
  description = "Region for the Lightsail instance. Keep it with the rest of the estate."
  type        = string
  default     = "us-east-1"
}

variable "availability_zone" {
  description = "Must be a zone inside aws_region."
  type        = string
  default     = "us-east-1a"
}

variable "instance_name" {
  description = "Lightsail instance name. Deliberately neutral — no application owns this host."
  type        = string
  default     = "shared-apps"
}

variable "blueprint_id" {
  description = "Lightsail OS image. Ubuntu because provision.sh is written against apt."
  type        = string
  default     = "ubuntu_24_04"
}

variable "bundle_id" {
  description = <<-EOT
    Instance size. medium_3_0 is 4 GB / 2 vCPU / 80 GB at $24 a month, which is
    the one recurring cost of running both applications.

    Lightsail cannot resize in place: changing this destroys and recreates the
    instance. The static IP survives (it is attached, not owned, by the
    instance) and no data is lost — every application's state is in RDS and its
    code is re-pushed by CI — but both APIs are down until each project's deploy
    workflow runs again.
  EOT
  type        = string
  default     = "medium_3_0"
}

variable "acme_email" {
  description = "Contact address Let's Encrypt uses for expiry warnings on the API certificates."
  type        = string
  default     = "robinnagpal.tiet@gmail.com"
}

variable "apps" {
  description = <<-EOT
    Every application sharing this host, keyed by name.

    `port` is what the application's own process listens on — this is the whole
    point of the shared host, so no two may collide — and `api_host` is the
    hostname Caddy terminates TLS for and reverse-proxies to that port. Each
    application's own Terraform stack creates the matching A record and points
    its CloudFront `/api/*` origin at the same hostname.

    Adding an application is one entry here plus a re-run of provision.sh. Note
    that changing this map changes user_data, which forces the instance to be
    recreated — see the bundle_id note, and prefer re-running provision.sh over
    SSH for a routine addition.
  EOT
  type = map(object({
    port     = number
    api_host = string
  }))

  default = {
    courtpot = {
      port     = 7071
      api_host = "api.courtpot.com"
    }
    interestled = {
      port     = 7072
      api_host = "api.interestled.com"
    }
  }

  validation {
    condition     = length(distinct([for app in var.apps : app.port])) == length(var.apps)
    error_message = "Each application needs its own port — two entries share one."
  }
}
