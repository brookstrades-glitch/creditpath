terraform {
  required_version = ">= 1.6"

  required_providers {
    netlify = {
      source  = "netlify/netlify"
      version = "~> 0.4"
    }
  }

  backend "remote" {
    organization = "creditpath"

    workspaces {
      name = "creditpath"
    }
  }
}

provider "netlify" {
  token = var.netlify_token
}

# ── Look up the existing Netlify site (created manually in the UI) ────────────
data "netlify_site" "creditpath" {
  name      = var.netlify_site_name
  team_slug = var.netlify_team_slug
}

# ── Build Settings ────────────────────────────────────────────────────────────
resource "netlify_site_build_settings" "creditpath" {
  site_id            = data.netlify_site.creditpath.id
  base_directory     = "frontend"
  build_command      = "npm run build"
  publish_directory  = "dist"
  production_branch  = "master"
}

# ── Build Environment Variables (non-secret) ──────────────────────────────────
# Secrets (VITE_CLERK_PUBLISHABLE_KEY, VITE_API_URL) are set in Netlify UI
# to avoid storing them in Terraform state
resource "netlify_environment_variable" "node_version" {
  site_id = data.netlify_site.creditpath.id
  team_id = var.netlify_team_id
  key     = "NODE_VERSION"
  values  = [{ value = "22", context = "all" }]
}
