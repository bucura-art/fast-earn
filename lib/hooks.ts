'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth'
import { isUserAdmin } from '@/lib/admin'
import { User } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          setIsAuthenticated(true)
          const adminStatus = await isUserAdmin(currentUser.id)
          setIsAdmin(adminStatus)
        } else {
          setUser(null)
          setIsAuthenticated(false)
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setUser(null)
        setIsAuthenticated(false)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      router.push('/en')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return { user, isAuthenticated, isAdmin, loading, logout: handleLogout }
}

// Protected route wrapper for regular users
export function useProtectedRoute() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/en')
    }
  }, [isAuthenticated, loading, router])

  return { user, isProtected: !loading && isAuthenticated, loading }
}

// Protected route wrapper for admin users
export function useAdminRoute() {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/en/dashboard')
    }
  }, [isAdmin, loading, router])

  return { user, isProtected: !loading && isAdmin }
}
