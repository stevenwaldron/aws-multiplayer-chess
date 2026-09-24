resource "aws_apigatewayv2_api" "chess_ws" {
  name                       = "${var.project_name}-ws-api"
  protocol_type              = "WEBSOCKET"
  # API Gateway picks a route by reading this field out of the message body,
  # so every client message needs an "action" field — this is what makes
  # {"action": "move", ...} land on the "move" route.
  route_selection_expression = "$request.body.action"
}

# --- One integration per Lambda function ---

resource "aws_apigatewayv2_integration" "on_connect" {
  api_id                    = aws_apigatewayv2_api.chess_ws.id
  integration_type          = "AWS_PROXY"
  integration_uri           = aws_lambda_function.on_connect.invoke_arn
  content_handling_strategy = "CONVERT_TO_TEXT"
}

resource "aws_apigatewayv2_integration" "on_disconnect" {
  api_id                    = aws_apigatewayv2_api.chess_ws.id
  integration_type          = "AWS_PROXY"
  integration_uri           = aws_lambda_function.on_disconnect.invoke_arn
  content_handling_strategy = "CONVERT_TO_TEXT"
}

resource "aws_apigatewayv2_integration" "handle_game_setup" {
  api_id                    = aws_apigatewayv2_api.chess_ws.id
  integration_type          = "AWS_PROXY"
  integration_uri           = aws_lambda_function.handle_game_setup.invoke_arn
  content_handling_strategy = "CONVERT_TO_TEXT"
}

resource "aws_apigatewayv2_integration" "handle_move" {
  api_id                    = aws_apigatewayv2_api.chess_ws.id
  integration_type          = "AWS_PROXY"
  integration_uri           = aws_lambda_function.handle_move.invoke_arn
  content_handling_strategy = "CONVERT_TO_TEXT"
}

# --- Routes ---
# $connect and $disconnect are reserved route keys API Gateway always
# recognizes for WebSocket connection lifecycle, regardless of
# route_selection_expression. create/join/reconnect all point at the same
# handleGameSetup integration; it switches on the action internally.

resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.on_connect.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.on_disconnect.id}"
}

resource "aws_apigatewayv2_route" "create" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "create"
  target    = "integrations/${aws_apigatewayv2_integration.handle_game_setup.id}"
}

resource "aws_apigatewayv2_route" "join" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "join"
  target    = "integrations/${aws_apigatewayv2_integration.handle_game_setup.id}"
}

resource "aws_apigatewayv2_route" "reconnect" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "reconnect"
  target    = "integrations/${aws_apigatewayv2_integration.handle_game_setup.id}"
}

resource "aws_apigatewayv2_route" "ping" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "ping"
  target    = "integrations/${aws_apigatewayv2_integration.handle_game_setup.id}"
}

resource "aws_apigatewayv2_route" "move" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "move"
  target    = "integrations/${aws_apigatewayv2_integration.handle_move.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.chess_ws.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.handle_game_setup.id}"
}

# --- Permissions: let API Gateway invoke each Lambda ---

resource "aws_lambda_permission" "on_connect" {
  statement_id  = "AllowAPIGatewayInvokeConnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.on_connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chess_ws.execution_arn}/*/*"
}

resource "aws_lambda_permission" "on_disconnect" {
  statement_id  = "AllowAPIGatewayInvokeDisconnect"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.on_disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chess_ws.execution_arn}/*/*"
}

resource "aws_lambda_permission" "handle_game_setup" {
  statement_id  = "AllowAPIGatewayInvokeGameSetup"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.handle_game_setup.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chess_ws.execution_arn}/*/*"
}

resource "aws_lambda_permission" "handle_move" {
  statement_id  = "AllowAPIGatewayInvokeMove"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.handle_move.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chess_ws.execution_arn}/*/*"
}

# --- Stage ---
# auto_deploy pushes route/integration changes live immediately, which is
# the right trade-off for a solo portfolio project; a team would likely want
# an explicit aws_apigatewayv2_deployment step for more controlled rollouts.

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.chess_ws.id
  name        = var.stage_name
  auto_deploy = true
}
