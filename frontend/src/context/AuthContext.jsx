import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api.js'

const AuthContext = createContext(null)

const TOKEN_KEY = 'cp_token'

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // On mount, verify any stored token is still valid
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setIsLoaded(true); return }

    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoaded(true))
  }, [])

  async function signUp(email, password) {
    const { data } = await api.post('/auth/register', { email, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    return data.user
  }

  async function signIn(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    return data.user
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoaded,
      isSignedIn: !!user,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
