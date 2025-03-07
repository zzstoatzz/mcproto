import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { BskyAgent } from '@atproto/api'

interface AuthContextType {
    isAuthenticated: boolean
    currentUser: {
        did: string
        handle: string
    } | null
    login: (identifier: string, password: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Create a shared agent instance
const agent = new BskyAgent({
    service: 'https://bsky.social'
})

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<AuthContextType['currentUser']>(() => {
        const saved = localStorage.getItem('auth')
        return saved ? JSON.parse(saved) : null
    })

    // Try to restore session on mount
    useEffect(() => {
        const restoreSession = async () => {
            const credentials = localStorage.getItem('credentials')
            if (credentials && !agent.session) {
                try {
                    const { identifier, password } = JSON.parse(credentials)
                    await agent.login({ identifier, password })
                } catch (error) {
                    console.error('Failed to restore session:', error)
                    localStorage.removeItem('auth')
                    localStorage.removeItem('credentials')
                    setCurrentUser(null)
                }
            }
        }
        restoreSession()
    }, [])

    const login = useCallback(async (identifier: string, password: string) => {
        try {
            const { data } = await agent.login({ identifier, password })

            const user = {
                did: data.did,
                handle: identifier
            }

            // Store both the user info and credentials
            localStorage.setItem('auth', JSON.stringify(user))
            localStorage.setItem('credentials', JSON.stringify({ identifier, password }))

            setCurrentUser(user)
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('auth')
        localStorage.removeItem('credentials')
        agent.session = undefined
        setCurrentUser(null)
    }, [])

    return (
        <AuthContext.Provider value={{
            isAuthenticated: !!currentUser,
            currentUser,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    )
} 