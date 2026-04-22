terraform {
  backend "s3" {
    # Fill in via `terraform init -backend-config=...`
    # bucket         = "legacyvault-tfstate-<account-id>"
    # key            = "dev/terraform.tfstate"
    # region         = "us-east-1"
    # dynamodb_table = "legacyvault-tfstate-lock"
    # encrypt        = true
  }
}
