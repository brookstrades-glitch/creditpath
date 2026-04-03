terraform {
  required_version = ">= 1.6"

  required_providers {
    netlify = {
      source  = "netlify/netlify"
      version = "~> 0.1"
    }
  }

  # Terraform Cloud — stores state remotely (free tier)
  # Setup:
  #   1. Create a free account at app.terraform.io
  #   2. Create an organization, note the exact org name
  #   3. Replace YOUR_ORG_NAME below with your actual org name (string literal only — no variables allowed in backend blocks)
  #   4. Run: terraform login
  #   5. Run: terraform init
  backend "remote" {
    organization = "YOUR_ORG_NAME"   # ← Replace with your Terraform Cloud org name

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
  values  = [{ value = "22", context = "all" }]
}
