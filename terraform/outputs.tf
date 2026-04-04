output "netlify_site_url" {
  description = "The Netlify site URL"
  value       = "https://${data.netlify_site.creditpath.name}.netlify.app"
}

output "netlify_site_id" {
  description = "The Netlify site ID — needed for deploy hooks"
  value       = data.netlify_site.creditpath.id
}
