import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'

export interface User {
  id: string
  name: string
  email: string
  cpf: string
  role: 'Admin' | 'User'
  status: 'Active' | 'Inactive'
  password?: string
  adminPassword?: string
}

interface UserState {
  users: User[]
  activeUser: User | null
  activeRole: 'Admin' | 'User' | null
  searchQuery: string
  filteredUsers: User[]
  login: (cpf: string, pass: string) => 'Admin' | 'User' | false
  logout: () => void
  setSearchQuery: (query: string) => void
  addUser: (user: Omit<User, 'id'>) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void
}

const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'Admin Principal',
    email: 'admin@tesouro.com',
    cpf: '000.000.000-00',
    role: 'Admin',
    status: 'Active',
    password: 'user123',
    adminPassword: 'admin123',
  },
  {
    id: '2',
    name: 'João Investidor',
    email: 'joao@exemplo.com',
    cpf: '111.111.111-11',
    role: 'User',
    status: 'Active',
    password: '123',
  },
  {
    id: '3',
    name: 'Maria Silva',
    email: 'maria@exemplo.com',
    cpf: '222.222.222-22',
    role: 'User',
    status: 'Inactive',
    password: '123',
  },
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

  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    return localStorage.getItem('@tesouro-vision:activeUserId') || null
  })

  const [activeRole, setActiveRole] = useState<'Admin' | 'User' | null>(() => {
    return (localStorage.getItem('@tesouro-vision:activeRole') as 'Admin' | 'User') || null
  })

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:users', JSON.stringify(users))
    } catch (e) {
      console.warn('Failed to save users to local storage', e)
    }
  }, [users])

  const [searchQuery, setSearchQuery] = useState('')

  const activeUser = useMemo(
    () => users.find((u) => u.id === activeUserId) || null,
    [users, activeUserId],
  )

  const login = (cpf: string, pass: string): 'Admin' | 'User' | false => {
    // Hardcoded check for main admin to prevent localStorage desync issues
    // and serve as a reliable source of truth
    if (cpf === '000.000.000-00') {
      const adminId = '1'
      if (pass === 'admin123') {
        setActiveUserId(adminId)
        setActiveRole('Admin')
        localStorage.setItem('@tesouro-vision:activeUserId', adminId)
        localStorage.setItem('@tesouro-vision:activeRole', 'Admin')
        return 'Admin'
      }
      if (pass === 'user123') {
        setActiveUserId(adminId)
        setActiveRole('User')
        localStorage.setItem('@tesouro-vision:activeUserId', adminId)
        localStorage.setItem('@tesouro-vision:activeRole', 'User')
        return 'User'
      }
    }

    const user = users.find((u) => u.cpf === cpf)
    if (!user) return false

    if (user.role === 'Admin' && user.adminPassword === pass) {
      setActiveUserId(user.id)
      setActiveRole('Admin')
      localStorage.setItem('@tesouro-vision:activeUserId', user.id)
      localStorage.setItem('@tesouro-vision:activeRole', 'Admin')
      return 'Admin'
    }

    if (user.password === pass) {
      setActiveUserId(user.id)
      setActiveRole('User')
      localStorage.setItem('@tesouro-vision:activeUserId', user.id)
      localStorage.setItem('@tesouro-vision:activeRole', 'User')
      return 'User'
    }

    return false
  }

  const logout = () => {
    setActiveUserId(null)
    setActiveRole(null)
    localStorage.removeItem('@tesouro-vision:activeUserId')
    localStorage.removeItem('@tesouro-vision:activeRole')
  }

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.cpf.includes(searchQuery),
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
        activeUser,
        activeRole,
        searchQuery,
        filteredUsers,
        login,
        logout,
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
