output "websocket_url" {
  description = "wss:// URL the frontend connects to"
  value       = "wss://${aws_apigatewayv2_api.chess_ws.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_apigatewayv2_stage.prod.name}"
}

output "games_table_name" {
  value = aws_dynamodb_table.games.name
}

output "connections_table_name" {
  value = aws_dynamodb_table.connections.name
}

output "frontend_bucket_name" {
  description = "Deploy the built frontend here (aws s3 sync)"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_domain_name" {
  description = "The site's URL once deployed"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "Needed for cache invalidation after each frontend deploy"
  value       = aws_cloudfront_distribution.frontend.id
}
