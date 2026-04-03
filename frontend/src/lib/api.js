/**
 * API client — all requests go through here
 *
 * Auth: Clerk JWT is attached via request interceptor.
 * window.Clerk is initialized by ClerkProvider before any API calls are made.
 * This pattern avoids circular deps with React hooks while keeping the
 * axios instance reusable outside component trees (e.g., downloads).
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 35000, // iSoftpull has a 30s timeout — give 5s buffer
})

// Request interceptor — attach Clerk JWT to every outgoing request
api.interceptors.request.use(async (config) => {
  try {
    // window.Clerk is available after ClerkProvider mounts
    const token = await window.Clerk?.session?.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Clerk not ready yet — request will 401 and redirect handled below
  }
  return config
})

// Response interceptor — handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // JWT expired or invalid — redirect to sign-in
      window.location.href = '/sign-in'
    }
    return Promise.reject(error)
  }
)

export default api
