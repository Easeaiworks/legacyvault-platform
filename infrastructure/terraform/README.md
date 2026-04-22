# Infrastructure — LegacyVault Platform

Terraform-managed AWS infrastructure. Multi-region by design to satisfy
Canadian data residency (PIPEDA / Quebec Law 25).

## Regions

| Region        | Purpose                                    |
| ------------- | ------------------------------------------ |
| `us-east-1`   | Primary for US consumers and B2B customers |
| `ca-central-1`| Canadian data residency                    |
| `us-west-2`   | DR / failover for us-east-1                |

## Environments

- `environments/dev`        — single-region dev, small instances
- `environments/staging`    — mirrors prod topology, reduced size
- `environments/prod-us`    — production, us-east-1
- `environments/prod-ca`    — production, ca-central-1

## Modules

- `modules/network`    — VPC, subnets (3 AZs), NAT gateways, flow logs
- `modules/rds`        — PostgreSQL 16, IAM auth, encrypted storage, PITR
- `modules/s3-docs`    — document bucket with SSE-KMS + bucket policies
- `modules/kms`        — CMKs for: database, documents, field-encryption
- `modules/ecs`        — Fargate cluster for the API (see apps/api/Dockerfile)
- `modules/waf`        — CloudFront + WAF for the web app
- `modules/observability` — CloudWatch log groups, alarms, Datadog integration role

## Bootstrapping

State is stored in S3 with DynamoDB locking — one bucket/table pair per AWS account.
See `environments/*/backend.tf` and the `bootstrap/` one-time module.

```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform plan -out=plan.out
terraform apply plan.out
```

## What's NOT here (intentional)

- Secrets. Use AWS Secrets Manager; reference ARNs in Terraform.
- DNS cutover. Do that manually the first time, automate later.
- Billing alerts. Set up once via the AWS console, not per-environment.
