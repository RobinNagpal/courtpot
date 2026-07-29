locals {
  s3_origin_id  = "web-s3"
  api_origin_id = "api-lambda"

  # aws_lambda_function_url.function_url is "https://<id>.lambda-url.<region>.on.aws/";
  # CloudFront wants just the hostname.
  api_origin_domain = trimsuffix(trimprefix(aws_lambda_function_url.api.function_url, "https://"), "/")

  # AWS-managed policies (fixed, documented IDs).
  cache_policy_caching_optimized = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  cache_policy_caching_disabled  = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  # Forwards everything except Host — required for Lambda Function URL
  # origins, whose TLS cert only matches their own hostname.
  origin_policy_all_viewer_except_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
}

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${var.app_name}-web-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Rewrites extension-less paths to /index.html so client-side routes work on
# the single-page Expo export. Deliberately a viewer-request function rather
# than distribution-wide custom_error_responses: those would also rewrite the
# API's 403s into the SPA page.
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.app_name}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/functions/spa-rewrite.js")
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.app_name} web + API"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = [var.domain_name, "www.${var.domain_name}"]

  origin {
    origin_id                = local.s3_origin_id
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  origin {
    origin_id   = local.api_origin_id
    domain_name = local.api_origin_domain

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = local.cache_policy_caching_optimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.api_origin_id
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_policy_caching_disabled
    origin_request_policy_id = local.origin_policy_all_viewer_except_host
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.web.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
