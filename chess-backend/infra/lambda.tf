# --- Shared dependency layer ---
# Builds nodejs/node_modules by running `npm install` and copying our own
# shared/ code into place, then zips it into a layer all four functions
# attach to. This is what keeps chess.js and the AWS SDK clients out of every
# individual function's zip.

resource "null_resource" "build_layer" {
  triggers = {
    package_json_hash = filemd5("${path.module}/../layer/nodejs/package.json")
    shared_src_hash = join(",", [
      for f in fileset("${path.module}/../shared-src", "*")
      : filemd5("${path.module}/../shared-src/${f}")
    ])
  }

  provisioner "local-exec" {
    command = <<-EOT
      cd ${path.module}/../layer/nodejs
      npm install --production --no-audit --no-fund
      mkdir -p node_modules/shared
      cp ../../shared-src/*.js ../../shared-src/package.json node_modules/shared/
    EOT
  }
}

data "archive_file" "layer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../layer"
  output_path = "${path.module}/build/layer.zip"

  depends_on = [null_resource.build_layer]
}

resource "aws_lambda_layer_version" "shared_deps" {
  layer_name          = "${var.project_name}-shared-deps"
  filename            = data.archive_file.layer_zip.output_path
  source_code_hash    = data.archive_file.layer_zip.output_base64sha256
  compatible_runtimes = ["nodejs20.x"]
}

# --- Function packages (just each function's own index.js) ---

data "archive_file" "on_connect_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/onConnect"
  output_path = "${path.module}/build/onConnect.zip"
}

data "archive_file" "on_disconnect_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/onDisconnect"
  output_path = "${path.module}/build/onDisconnect.zip"
}

data "archive_file" "handle_game_setup_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/handleGameSetup"
  output_path = "${path.module}/build/handleGameSetup.zip"
}

data "archive_file" "handle_move_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../functions/handleMove"
  output_path = "${path.module}/build/handleMove.zip"
}

locals {
  common_env = {
    GAMES_TABLE       = aws_dynamodb_table.games.name
    CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
  }
}

resource "aws_lambda_function" "on_connect" {
  function_name    = "${var.project_name}-on-connect"
  filename         = data.archive_file.on_connect_zip.output_path
  source_code_hash = data.archive_file.on_connect_zip.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  layers           = [aws_lambda_layer_version.shared_deps.arn]
  timeout          = 10

  environment {
    variables = local.common_env
  }
}

resource "aws_lambda_function" "on_disconnect" {
  function_name    = "${var.project_name}-on-disconnect"
  filename         = data.archive_file.on_disconnect_zip.output_path
  source_code_hash = data.archive_file.on_disconnect_zip.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  layers           = [aws_lambda_layer_version.shared_deps.arn]
  timeout          = 10

  environment {
    variables = local.common_env
  }
}

resource "aws_lambda_function" "handle_game_setup" {
  function_name    = "${var.project_name}-handle-game-setup"
  filename         = data.archive_file.handle_game_setup_zip.output_path
  source_code_hash = data.archive_file.handle_game_setup_zip.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  layers           = [aws_lambda_layer_version.shared_deps.arn]
  timeout          = 10

  environment {
    variables = local.common_env
  }
}

resource "aws_lambda_function" "handle_move" {
  function_name    = "${var.project_name}-handle-move"
  filename         = data.archive_file.handle_move_zip.output_path
  source_code_hash = data.archive_file.handle_move_zip.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.lambda_exec.arn
  layers           = [aws_lambda_layer_version.shared_deps.arn]
  timeout          = 10

  environment {
    variables = local.common_env
  }
}
