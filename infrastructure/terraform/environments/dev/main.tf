terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.45" }
  }
  # Backend config intentionally lives in backend.tf; swap per-environment.
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Environment = "dev"
      Service     = "legacyvault"
      ManagedBy   = "terraform"
    }
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "app_iam_role_arn" {
  type        = string
  description = "IAM role assumed by the API task. Pre-created for dev."
}

# ---- KMS ----
module "kms_documents" {
  source                = "../../modules/kms"
  environment           = "dev"
  purpose               = "documents"
  key_admin_arns        = [] # fill with your admin user/role ARNs
  key_usage_arns        = [var.app_iam_role_arn]
  deletion_window_days  = 7 # shorter in dev to allow cleanup
}

module "kms_fields" {
  source                = "../../modules/kms"
  environment           = "dev"
  purpose               = "fields"
  key_admin_arns        = []
  key_usage_arns        = [var.app_iam_role_arn]
  deletion_window_days  = 7
}

# ---- S3 ----
module "s3_documents" {
  source                      = "../../modules/s3-docs"
  environment                 = "dev"
  bucket_name                 = "legacyvault-documents-dev"
  kms_key_arn                 = module.kms_documents.key_arn
  allowed_iam_principal_arns  = [var.app_iam_role_arn]
}

output "documents_kms_arn" { value = module.kms_documents.key_arn }
output "fields_kms_arn"    { value = module.kms_fields.key_arn }
output "documents_bucket"  { value = module.s3_documents.bucket_id }
