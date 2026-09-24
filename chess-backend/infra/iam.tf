data "aws_caller_identity" "current" {}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access, scoped to just the two tables this project owns
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "${var.project_name}-dynamodb-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ]
      Resource = [
        aws_dynamodb_table.games.arn,
        aws_dynamodb_table.connections.arn,
      ]
    }]
  })
}

# Lets handleGameSetup and handleMove push messages back down open WebSocket
# connections via the API Gateway Management API (postToConnection).
resource "aws_iam_role_policy" "websocket_management" {
  name = "${var.project_name}-websocket-management"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "execute-api:ManageConnections"
      Resource = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.chess_ws.id}/*"
    }]
  })
}
