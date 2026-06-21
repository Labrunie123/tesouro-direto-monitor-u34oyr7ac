import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'

export interface User {
  id: string
  name: string
  email: string
  role: 'Admin' | 'User'
  status: 'Active' | 'Inactive'
}

interface UserState {
  users: User[]
  searchQuery: string
  filteredUsers: User[]
  setSearchQuery: (query: string) => void
  addUser: (user: Omit<User, 'id'>) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void
}

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Admin Principal', email: 'admin@tesouro.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'João Investidor', email: 'joao@exemplo.com', role: 'User', status: 'Active' },
  { id: '3', name: 'Maria Silva', email: 'maria@exemplo.com', role: 'User', status: 'Inactive' },
]

const UserContext = createContext<UserState | undefined>(undefined)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:users')
      return saved ? JSON.parse(saved) : INITIAL_USERS
    } catch {
      return INITIAL_USERS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:users', JSON.stringify(users))
    } catch (e) {
      console.warn('Failed to save users to local storage', e)
    }
  }, [users])
  const [searchQuery, setSearchQuery] = useState('')

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [users, searchQuery])

  const addUser = (user: Omit<User, 'id'>) => {
    setUsers((prev) => [...prev, { ...user, id: crypto.randomUUID() }])
  }

  const updateUser = (id: string, user: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...user } : u)))
  }

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return React.createElement(
    UserContext.Provider,
    {
      value: {
        users,
        searchQuery,
        filteredUsers,
        setSearchQuery,
        addUser,
        updateUser,
        deleteUser,
      },
    },
    children,
  )
}

export default function useUserStore() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUserStore must be used within a UserProvider')
  return context
}
