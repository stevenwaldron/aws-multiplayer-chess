output "tfstate_bucket_name" {
  description = "Put this in main.tf's backend \"s3\" block (bucket = ...)"
  value       = aws_s3_bucket.tfstate.id
}

output "tfstate_lock_table_name" {
  description = "Put this in main.tf's backend \"s3\" block (dynamodb_table = ...)"
  value       = aws_dynamodb_table.tfstate_lock.name
}

output "github_actions_role_arn" {
  description = "Set as the role-to-assume in the GitHub Actions workflow"
  value       = aws_iam_role.github_actions.arn
}
