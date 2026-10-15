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

    Adding an application is one entry here plus a re-run of provision.sh over
    SSH (see deployment/README.md). This map is part of user_data, which
    instance.tf ignores after creation, so `terraform apply` neither applies the
    change to the running host nor recreates it; the entry is what the next
    instance is built with.

    Optional, per application (unset renders exactly what it always did):
      redirect_hosts   — hostnames that 308 to https://<api_host>{uri}
      on_demand_suffix — also serve every single-label subdomain of this
                         domain, each with a certificate Caddy obtains at its
                         first handshake (on-demand TLS, approved by a
                         loopback-only ask endpoint in Caddy itself)
      node_heap_mb     — NODE_OPTIONS=--max-old-space-size for the service
      memory_max       — systemd MemoryMax for the service, e.g. "1200M"

    academy-ui and simulations are Next.js servers from
    github.com/RobinNagpal/dodao-ui (deployments/shared-host-apps there). They
    have no CloudFront in front: api_host is the public site itself.
  EOT
  type = map(object({
    port             = number
    api_host         = string
    redirect_hosts   = optional(list(string), [])
    on_demand_suffix = optional(string)
    node_heap_mb     = optional(number)
    memory_max       = optional(string)
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
    # tidbitshub.org, plus <space>.tidbitshub.org for every space: the app
    # resolves the space from the Host header.
    academy-ui = {
      port             = 7073
      api_host         = "tidbitshub.org"
      redirect_hosts   = ["www.tidbitshub.org"]
      on_demand_suffix = "tidbitshub.org"
      node_heap_mb     = 768
      memory_max       = "1200M"
    }
    simulations = {
      port         = 7074
      api_host     = "simulations.koalagains.com"
      node_heap_mb = 512
      memory_max   = "900M"
    }
  }

  validation {
    condition     = length(distinct([for app in var.apps : app.port])) == length(var.apps)
    error_message = "Each application needs its own port — two entries share one."
  }

  validation {
    condition = alltrue([
      for app in var.apps : app.on_demand_suffix == null || can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?([.][a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", app.on_demand_suffix))
    ])
    error_message = "on_demand_suffix must be a bare domain name, e.g. example.com."
  }
}
