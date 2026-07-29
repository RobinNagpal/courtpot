# Alias records pointing the apex and www at CloudFront. Z2FDTNDATAQYW2 is
# CloudFront's fixed hosted zone ID (same for every distribution).
locals {
  cloudfront_zone_id = "Z2FDTNDATAQYW2"
  record_names       = [var.domain_name, "www.${var.domain_name}"]
}

resource "aws_route53_record" "web_a" {
  for_each = toset(local.record_names)

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "web_aaaa" {
  for_each = toset(local.record_names)

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}
