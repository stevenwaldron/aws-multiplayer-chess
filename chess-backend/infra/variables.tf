variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used on all resource names"
  type        = string
  default     = "chess"
}

variable "stage_name" {
  description = "API Gateway deployment stage name"
  type        = string
  default     = "prod"
}
