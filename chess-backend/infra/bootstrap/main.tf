terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Deliberately no backend block here — this config creates the S3 bucket
  # and DynamoDB table that the MAIN project's backend will use. It has to
  # bootstrap itself with local state first; you can't point Terraform at a
  # remote backend that doesn't exist yet. This state file only ever
  # changes when the bootstrap resources themselves change (rare), so
  # keeping it local and out of version control is fine.
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
