terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.45" }
  }
}

variable "environment" { type = string }
variable "purpose" {
  type        = string
  description = "One of: database, documents, fields, audit"
}
variable "key_admin_arns" { type = list(string) }
variable "key_usage_arns" { type = list(string) }
variable "deletion_window_days" {
  type    = number
  default = 30
}

locals {
  name = "legacyvault-${var.purpose}-${var.environment}"
  tags = {
    Environment = var.environment
    Service     = "legacyvault"
    Purpose     = var.purpose
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_key" "this" {
  description              = "LegacyVault ${var.purpose} CMK (${var.environment})"
  enable_key_rotation      = true
  deletion_window_in_days  = var.deletion_window_days
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
  key_usage                = "ENCRYPT_DECRYPT"
  multi_region             = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableRootAccount"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "KeyAdmin"
        Effect    = "Allow"
        Principal = { AWS = var.key_admin_arns }
        Action = [
          "kms:Create*","kms:Describe*","kms:Enable*","kms:List*","kms:Put*",
          "kms:Update*","kms:Revoke*","kms:Disable*","kms:Get*","kms:Delete*",
          "kms:ScheduleKeyDeletion","kms:CancelKeyDeletion","kms:TagResource","kms:UntagResource"
        ]
        Resource = "*"
      },
      {
        Sid       = "KeyUsage"
        Effect    = "Allow"
        Principal = { AWS = var.key_usage_arns }
        Action    = ["kms:Encrypt","kms:Decrypt","kms:ReEncrypt*","kms:GenerateDataKey*","kms:DescribeKey"]
        Resource  = "*"
      }
    ]
  })

  tags = local.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.this.key_id
}

data "aws_caller_identity" "current" {}

output "key_id"  { value = aws_kms_key.this.key_id }
output "key_arn" { value = aws_kms_key.this.arn }
output "alias"   { value = aws_kms_alias.this.name }
