variable "aws_region" {
  description = "AWS region — must match the main project's region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used on resource names — must match the main project's var.project_name"
  type        = string
  default     = "chess"
}

variable "github_owner" {
  description = "GitHub account/org that owns the repo"
  type        = string
  default     = "stevenwaldron"
}

variable "github_repo" {
  description = "Repo name (without owner)"
  type        = string
  default     = "aws-multiplayer-chess"
}

# GitHub now issues OIDC tokens with an immutable owner/repo ID embedded in
# the subject claim for any repo created after 2026-07-15 (this one was).
# The classic name-only format (repo:owner/repo:...) that most tutorials and
# older AWS docs show will NOT match tokens from a repo this new — the trust
# policy has to use this ID-based format instead. Fetch these once with:
#   curl -s https://api.github.com/repos/<owner>/<repo> | grep -E '"id"|"login"' | head -4
variable "github_owner_id" {
  description = "Immutable numeric GitHub owner ID (from the repos API, not the username)"
  type        = string
  default     = "57245025"
}

variable "github_repo_id" {
  description = "Immutable numeric GitHub repository ID (from the repos API)"
  type        = string
  default     = "1385821024"
}
