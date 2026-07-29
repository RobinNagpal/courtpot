locals {
  function_name = "${var.app_name}-api"
}

resource "aws_iam_role" "lambda" {
  name = "${local.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14
}

# Placeholder code so the function can be created before the first CI deploy.
# GitHub Actions replaces it with the real bundle via update-function-code.
data "archive_file" "bootstrap" {
  type        = "zip"
  source_dir  = "${path.module}/bootstrap"
  output_path = "${path.module}/.terraform/bootstrap.zip"
}

resource "aws_lambda_function" "api" {
  function_name = local.function_name
  role          = aws_iam_role.lambda.arn

  filename         = data.archive_file.bootstrap.output_path
  source_code_hash = data.archive_file.bootstrap.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  memory_size      = var.lambda_memory_mb
  timeout          = 15

  environment {
    variables = {
      DATABASE_URL = var.database_url
    }
  }

  lifecycle {
    # Code is owned by CI (update-function-code) and DATABASE_URL may be set
    # by hand in the console — terraform must not revert either.
    ignore_changes = [filename, source_code_hash, environment]
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.lambda,
  ]
}

# The stable public URL. It never changes for the lifetime of the function
# URL resource; CloudFront fronts it so clients only ever see courtpot.com.
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "public_function_url" {
  statement_id           = "AllowPublicFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}
