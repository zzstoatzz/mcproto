import React, { useEffect, useState } from 'react'
import { Server, SortOption } from '../types'
import { ServerCard } from './ServerCard/'
import { PublisherModal } from './PublisherModal'
import { AttestModal } from './AttestModal'
import { AuthProvider, useAuth } from '../contexts/AuthContext'

interface MCPServerRecord {
    name: string
    package: string
    $type: string  // Changed from type to $type to match ATProto spec
    version?: string
    description?: string
    tools?: string[]
    createdAt: string
    lastRegisteredAt: string
    commitSha?: string  // Git commit SHA for reproducible installs
    language: string    // Programming language of the server implementation
    // Publisher information
    publisher: {
        did: string
        handle?: string
        displayName?: string
        verifiedDomain?: string
    }
}

const sortOptions: SortOption[] = [
    { key: 'lastRegisteredAt', label: 'Last Registered', direction: 'desc' },
    { key: 'name', label: 'Name', direction: 'asc' }
]

function AppContent() {
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>(sortOptions[0])
    const [selectedPublisher, setSelectedPublisher] = useState<Server['value']['publisher'] | null>(null)
    const [groupByPublisher, setGroupByPublisher] = useState(false)
    const [attestServer, setAttestServer] = useState<Server | null>(null)
    const { currentUser } = useAuth()

    useEffect(() => {
        fetchServers()
    }, [])

    const fetchServers = async () => {
        try {
            const response = await fetch('/api/servers')
            if (!response.ok) {
                throw new Error('Failed to fetch servers')
            }
            const data = await response.json()
            setServers(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (uri: string) => {
        if (!currentUser) {
            setError('You must be logged in to delete a server')
            return
        }

        try {
            const response = await fetch(`/api/servers/${encodeURIComponent(uri)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentUser.did}`
                }
            })

            if (response.status === 403) {
                setError('You can only delete your own server records')
                return
            }

            if (!response.ok) {
                throw new Error('Failed to delete server')
            }

            await fetchServers()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete server')
        }
    }

    const handlePublisherClick = (publisher: Server['value']['publisher']) => {
        setSelectedPublisher(publisher)
    }

    const filteredAndSortedServers = servers
        .filter(server => {
            const searchLower = searchTerm.toLowerCase()
            return (
                server.value.name.toLowerCase().includes(searchLower) ||
                server.value.description?.toLowerCase().includes(searchLower) ||
                server.value.publisher?.handle?.toLowerCase().includes(searchLower) ||
                server.uri.toLowerCase().includes(searchLower)
            )
        })
        .sort((a, b) => {
            const aValue = a.value[sortBy.key as keyof typeof a.value]
            const bValue = b.value[sortBy.key as keyof typeof b.value]

            if (!aValue || !bValue) return 0

            // Handle date comparisons
            if (sortBy.key === 'lastRegisteredAt' || sortBy.key === 'createdAt') {
                const aDate = new Date(aValue as string).getTime()
                const bDate = new Date(bValue as string).getTime()
                return sortBy.direction === 'asc' ? aDate - bDate : bDate - aDate
            }

            // Handle name comparison
            if (sortBy.key === 'name') {
                return sortBy.direction === 'asc'
                    ? (aValue as string).localeCompare(bValue as string)
                    : (bValue as string).localeCompare(aValue as string)
            }

            // Default string comparison
            const comparison = String(aValue).localeCompare(String(bValue))
            return sortBy.direction === 'asc' ? comparison : -comparison
        })

    // Group servers by publisher if enabled
    const groupedServers = groupByPublisher
        ? filteredAndSortedServers.reduce((groups, server) => {
            const publisherId = server.value.publisher?.handle || server.value.publisher?.did || 'unknown'
            if (!groups[publisherId]) {
                groups[publisherId] = []
            }
            groups[publisherId].push(server)
            return groups
        }, {} as Record<string, Server[]>)
        : null

    if (loading) {
        return <div className="loading">Loading servers...</div>
    }

    if (error) {
        return <div className="error">{error}</div>
    }

    return (
        <div className="app">
            <div className="controls">
                <input
                    type="text"
                    placeholder="Search servers..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select
                    value={sortOptions.findIndex(opt => opt.key === sortBy.key)}
                    onChange={e => setSortBy(sortOptions[parseInt(e.target.value)])}
                    className="sort-select"
                >
                    {sortOptions.map((option, index) => (
                        <option key={option.key} value={index}>
                            Sort by {option.label}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => setGroupByPublisher(!groupByPublisher)}
                    className={`group-toggle ${groupByPublisher ? 'active' : ''}`}
                >
                    {groupByPublisher ? 'Ungroup' : 'Group by Publisher'}
                </button>
            </div>

            <div className={`servers-container ${groupByPublisher ? 'grouped' : ''}`}>
                {groupByPublisher ? (
                    Object.entries(groupedServers || {}).map(([publisherId, publisherServers]) => (
                        <div key={publisherId} className="publisher-group">
                            <div className="publisher-group-header">
                                <h2>{publisherServers[0].value.publisher?.handle || publisherId}</h2>
                                <span className="server-count">
                                    {publisherServers.length} server{publisherServers.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="servers-grid">
                                {publisherServers.map(server => (
                                    <ServerCard
                                        key={server.uri}
                                        server={server}
                                        onDelete={handleDelete}
                                        onPublisherClick={handlePublisherClick}
                                        onAttest={setAttestServer}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="servers-grid">
                        {filteredAndSortedServers.map(server => (
                            <ServerCard
                                key={server.uri}
                                server={server}
                                onDelete={handleDelete}
                                onPublisherClick={handlePublisherClick}
                                onAttest={setAttestServer}
                            />
                        ))}
                    </div>
                )}
                {(groupByPublisher ? Object.keys(groupedServers || {}).length === 0 : filteredAndSortedServers.length === 0) && (
                    <div className="no-results">
                        {searchTerm ? 'No servers match your search' : 'No servers found'}
                    </div>
                )}
            </div>

            {selectedPublisher && (
                <PublisherModal
                    publisher={selectedPublisher}
                    isOpen={true}
                    onClose={() => setSelectedPublisher(null)}
                />
            )}

            {attestServer && (
                <AttestModal
                    server={attestServer}
                    isOpen={true}
                    onClose={() => setAttestServer(null)}
                />
            )}
        </div>
    )
}

export function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
} 