# --- Remote state bucket ---
# Versioned so a bad `apply` that corrupts state can be recovered from a
# prior version; encrypted at rest; no public access — this bucket holds
# the blueprint of your entire AWS account's chess infrastructure, which is
# sensitive even though none of it is secret-secret.

resource "aws_s3_bucket" "tfstate" {
  bucket = "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- State lock table ---
# On-demand billing, not provisioned — the two game tables already use the
# entire always-free 25 WCU/25 RCU account-wide allowance (split 15/10
# between them), and this table's traffic is a handful of requests per CI
# run, not worth provisioning fixed capacity for. "LockID" is the exact
# attribute name Terraform's S3 backend requires for locking.

resource "aws_dynamodb_table" "tfstate_lock" {
  name         = "${var.project_name}-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
