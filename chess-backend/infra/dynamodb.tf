# Provisioned capacity is split between the two tables to stay inside
# DynamoDB's always-free 25 WCU / 25 RCU allowance, which is shared across
# the whole account per region — not granted per table. Games gets the
# larger share since it's read/written on every move; Connections only sees
# traffic on connect/disconnect/game-setup.

resource "aws_dynamodb_table" "games" {
  name           = "${var.project_name}-games"
  billing_mode   = "PROVISIONED"
  read_capacity  = 15
  write_capacity = 15
  hash_key       = "game_id"

  attribute {
    name = "game_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false # keep this off to avoid backup storage costs on a portfolio project
  }

  tags = {
    Project = var.project_name
  }
}

resource "aws_dynamodb_table" "connections" {
  name           = "${var.project_name}-connections"
  billing_mode   = "PROVISIONED"
  read_capacity  = 10
  write_capacity = 10
  hash_key       = "connection_id"

  attribute {
    name = "connection_id"
    type = "S"
  }

  tags = {
    Project = var.project_name
  }
}
