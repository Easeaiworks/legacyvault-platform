terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.45" }
  }
}

variable "environment" { type = string }
variable "bucket_name" { type = string }
variable "kms_key_arn" { type = string }
variable "allowed_iam_principal_arns" {
  type        = list(string)
  description = "IAM principals (service roles) allowed to read/write objects."
}

resource "aws_s3_bucket" "docs" {
  bucket        = var.bucket_name
  force_destroy = var.environment == "dev"

  tags = {
    Environment = var.environment
    Service     = "legacyvault"
    Purpose     = "documents"
    ManagedBy   = "terraform"
  }
}

# Block ALL public access — defense-in-depth.
resource "aws_s3_bucket_public_access_block" "docs" {
  bucket                  = aws_s3_bucket.docs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning — required for SOC 2 and for point-in-time recovery of documents.
resource "aws_s3_bucket_versioning" "docs" {
  bucket = aws_s3_bucket.docs.id
  versioning_configuration { status = "Enabled" }
}

# SSE-KMS with our CMK — no SSE-S3, no bucket-owner-preferred.
resource "aws_s3_bucket_server_side_encryption_configuration" "docs" {
  bucket = aws_s3_bucket.docs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    bucket_key_enabled = true
  }
}

# Enforce TLS and HTTPS-only.
resource "aws_s3_bucket_policy" "docs" {
  bucket = aws_s3_bucket.docs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonSecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.docs.arn,
          "${aws_s3_bucket.docs.arn}/*",
        ]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "AllowApplicationAccess"
        Effect    = "Allow"
        Principal = { AWS = var.allowed_iam_principal_arns }
        Action    = ["s3:GetObject","s3:PutObject","s3:DeleteObject"]
        Resource  = "${aws_s3_bucket.docs.arn}/*"
      }
    ]
  })
}

# Lifecycle — move old versions to cheaper storage after a while.
resource "aws_s3_bucket_lifecycle_configuration" "docs" {
  bucket = aws_s3_bucket.docs.id

  rule {
    id     = "noncurrent-to-glacier"
    status = "Enabled"
    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }
    noncurrent_version_expiration { noncurrent_days = 365 * 7 }
    filter {}
  }
}

# Log all object-level access to a separate audit bucket (configured elsewhere).
resource "aws_s3_bucket_logging" "docs" {
  count         = var.environment == "dev" ? 0 : 1
  bucket        = aws_s3_bucket.docs.id
  target_bucket = "legacyvault-access-logs-${var.environment}"
  target_prefix = "docs/"
}

output "bucket_id"  { value = aws_s3_bucket.docs.id }
output "bucket_arn" { value = aws_s3_bucket.docs.arn }
