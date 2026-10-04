# Trusts GitHub's OIDC token issuer. This is what lets a GitHub Actions
# workflow request temporary AWS credentials without any long-lived access
# key ever being stored as a GitHub secret.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# The role GitHub Actions assumes. The trust policy's condition is the
# actual security boundary here — only a token whose subject claim matches
# exactly this repo, on exactly the main branch, can assume this role.
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # Immutable ID-based subject claim (see variables.tf for why the
          # classic owner/repo-name format won't work for this repo).
          # Two valid shapes for this one role: jobs with no "environment:"
          # (validate, plan) get a ref-based subject; the deploy job, which
          # sets environment: production, gets an environment-based subject
          # instead — GitHub's default behavior once a job references an
          # environment. Both have to be allowed since all three jobs share
          # this one role.
          "token.actions.githubusercontent.com:sub" = [
            "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repo_id}:ref:refs/heads/main",
            "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repo_id}:environment:production",
          ]
        }
      }
    }]
  })
}

# Permissions scoped by resource-name prefix ("chess-*"/"${var.project_name}-*")
# everywhere AWS's IAM model actually supports it. Two service families —
# API Gateway v2 and CloudFront — don't support fine-grained resource-level
# permissions for most control-plane actions (this is an AWS API Gateway/
# CloudFront limitation, not a shortcut taken here), so those two are
# necessarily broader; every other statement is scoped to this project's
# own resources only.
resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "${var.project_name}-deploy-permissions"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformStateAccess"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.tfstate.arn,
          "${aws_s3_bucket.tfstate.arn}/*",
        ]
      },
      {
        Sid      = "TerraformStateLock"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = aws_dynamodb_table.tfstate_lock.arn
      },
      {
        Sid    = "DynamoDBTables"
        Effect = "Allow"
        Action = ["dynamodb:*"]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-*"
        ]
      },
      {
        Sid    = "LambdaFunctionsAndLayers"
        Effect = "Allow"
        Action = ["lambda:*"]
        Resource = [
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-*",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:layer:${var.project_name}-*",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:layer:${var.project_name}-*:*"
        ]
      },
      {
        Sid      = "ManageOwnLambdaExecRole"
        Effect   = "Allow"
        Action   = ["iam:GetRole", "iam:CreateRole", "iam:DeleteRole", "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy", "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:TagRole", "iam:PassRole"]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-*"
      },
      {
        # API Gateway v2's control-plane actions (CreateApi, CreateRoute,
        # etc.) don't support resource-level ARN restriction — AWS's IAM
        # reference for apigateway lists these as requiring Resource: "*".
        Sid      = "ApiGatewayManagement"
        Effect   = "Allow"
        Action   = ["apigateway:*"]
        Resource = "*"
      },
      {
        Sid    = "FrontendAndReleaseBuckets"
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          "arn:aws:s3:::${var.project_name}-frontend-*",
          "arn:aws:s3:::${var.project_name}-frontend-*/*",
          "arn:aws:s3:::${var.project_name}-frontend-releases-*",
          "arn:aws:s3:::${var.project_name}-frontend-releases-*/*"
        ]
      },
      {
        # Same story as API Gateway — most CloudFront control-plane actions
        # require Resource: "*" per AWS's own IAM reference.
        Sid      = "CloudFrontManagement"
        Effect   = "Allow"
        Action   = ["cloudfront:*"]
        Resource = "*"
      },
      {
        Sid      = "CallerIdentity"
        Effect   = "Allow"
        Action   = "sts:GetCallerIdentity"
        Resource = "*"
      }
    ]
  })
}
