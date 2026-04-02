variable "netlify_token" {
  description = "Netlify personal access token — set via TF_VAR_netlify_token env var or Terraform Cloud variable"
  type        = string
  sensitive   = true
}

variable "netlify_site_name" {
  description = "Netlify site name (appears in default subdomain: name.netlify.app)"
  type        = string
  default     = "creditpath"
}

variable "github_repo" {
  description = "GitHub repo path in format 'username/reponame'"
  type        = string
}

variable "terraform_cloud_org" {
  description = "Terraform Cloud organization name"
  type        = string
}
