terraform {
  required_version = ">= 1.6"

  required_providers {
    netlify = {
      source  = "netlify/netlify"
      version = "~> 0.1"
    }
  }

  # Terraform Cloud — stores state remotely (free tier)
  # Run: terraform login
  # Then: terraform init
  backend "remote" {
    organization = var.terraform_cloud_org

    workspaces {
      name = "creditpath"
    }
  }
}

provider "netlify" {
  token = var.netlify_token
}

# ── Netlify Site ─────────────────────────────────────────────────────────────
resource "netlify_site" "creditpath" {
  name = var.netlify_site_name

  repo {
    provider    = "github"
    repo_path   = var.github_repo          # e.g. "brookXXX/creditpath"
    branch      = "main"
    command     = "npm run build"
    dir         = "dist"
    base        = "frontend"
  }
}

# ── Build Environment Variables (non-secret) ─────────────────────────────────
# Secrets (VITE_CLERK_PUBLISHABLE_KEY, VITE_API_URL) are set in Netlify UI
# to avoid storing them in Terraform state
resource "netlify_environment_variable" "node_version" {
  site_id = netlify_site.creditpath.id
  key     = "NODE_VERSION"
  values  = [{ value = "24", context = "all" }]
}
