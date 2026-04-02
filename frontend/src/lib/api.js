/**
 * API client — all requests go through here
 * Credentials: 'include' sends the httpOnly JWT cookie on every request
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 35000, // iSoftpull has a 30s timeout — give 5s buffer
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
