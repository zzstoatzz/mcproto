import React, { useEffect, useState } from 'react'

interface MCPServerRecord {
    name: string
    package: string
    type: string
    version?: string
    description?: string
    tools?: string[]
    createdAt: string
    lastRegisteredAt: string
    commitSha?: string  // Git commit SHA for reproducible installs
    // Publisher information
    publisher: {
        did: string
        handle?: string
        displayName?: string
        verifiedDomain?: string
    }
}

interface Server {
    uri: string
    value: MCPServerRecord
}

interface HandleCache {
    [did: string]: string | null
}

// Sorting options
interface SortOption {
    key: keyof MCPServerRecord | 'reputation'
    label: string
    direction?: 'asc' | 'desc'
}

const sortOptions: SortOption[] = [
    { key: 'lastRegisteredAt', label: 'Last Active', direction: 'desc' },
    { key: 'createdAt', label: 'Oldest First', direction: 'asc' },
    { key: 'name', label: 'Name', direction: 'asc' },
    { key: 'reputation', label: 'Reputation', direction: 'desc' }
]

export function App() {
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState<SortOption>(sortOptions[0])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadServers()
        const interval = setInterval(loadServers, 30000)
        return () => clearInterval(interval)
    }, [])

    async function loadServers() {
        try {
            const res = await fetch('/api/servers')
            const data = await res.json()
            setServers(data)
        } catch (error) {
            console.error('Failed to load servers:', error)
        } finally {
            setLoading(false)
        }
    }

    async function deleteServer(uri: string) {
        if (!confirm('Are you sure you want to delete this server record?')) {
            return
        }

        try {
            const res = await fetch(`/api/servers/${encodeURIComponent(uri)}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setServers(servers => servers.filter(s => s.uri !== uri))
            } else {
                const data = await res.json()
                alert(`Failed to delete server: ${data.error}`)
            }
        } catch (e) {
            alert('Failed to delete server. Make sure you own this server record.')
        }
    }

    const sortedServers = React.useMemo(() => {
        let sorted = [...servers]

        // Apply search filter if any
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            sorted = sorted.filter(server =>
                server.value.name.toLowerCase().includes(query) ||
                server.value.description?.toLowerCase().includes(query) ||
                server.value.publisher.handle?.toLowerCase().includes(query) ||
                server.value.tools?.some(tool => tool.toLowerCase().includes(query))
            )
        }

        // Apply sorting
        sorted.sort((a, b) => {
            const direction = sortBy.direction === 'asc' ? 1 : -1

            if (sortBy.key === 'reputation') {
                const aRep = a.value.stats?.successRate ?? 0
                const bRep = b.value.stats?.successRate ?? 0
                return (bRep - aRep) * direction
            }

            const aVal = a.value[sortBy.key as keyof MCPServerRecord]
            const bVal = b.value[sortBy.key as keyof MCPServerRecord]

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal) * direction
            }

            return 0
        })

        return sorted
    }, [servers, sortBy, searchQuery])

    if (loading) {
        return (
            <div className="container">
                <h1>MCP Server Registry</h1>
                <div className="loading">Loading servers...</div>
            </div>
        )
    }

    return (
        <div className="container" style={{
            fontFamily: 'Menlo, Monaco, "JetBrains Mono", "Fira Code", "Roboto Mono", "Droid Sans Mono", Consolas, monospace',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            letterSpacing: '-0.02em',
            lineHeight: '1.5'
        }}>
            <h1 style={{
                fontSize: '1.75rem',
                fontWeight: 500,
                marginBottom: '1.5rem'
            }}>MCP Server Registry</h1>

            <div className="intro">
                <p style={{ fontSize: '0.95rem' }}>
                    This registry displays MCP servers discovered via AT Protocol.
                    Each server is published as a record in the app.mcp.server collection
                    and provides AI tools and services via the MCP standard.
                </p>
            </div>

            <div className="controls" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '2rem',
                width: '100%',
                maxWidth: '600px'
            }}>
                <input
                    type="text"
                    placeholder="Search servers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'transparent',
                        color: 'inherit',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit'
                    }}
                />
                <select
                    value={sortBy.key}
                    onChange={(e) => setSortBy(sortOptions.find(opt => opt.key === e.target.value) || sortOptions[0])}
                    style={{
                        padding: '0.5rem 0.75rem',
                        border: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'transparent',
                        color: 'inherit',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        width: 'auto',
                        alignSelf: 'flex-end',
                        fontFamily: 'inherit'
                    }}
                >
                    {sortOptions.map(option => (
                        <option key={option.key} value={option.key} style={{ fontFamily: 'inherit' }}>
                            Sort: {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="servers">
                {sortedServers.length === 0 ? (
                    <div className="no-servers">
                        <p>No MCP servers found.</p>
                    </div>
                ) : (
                    sortedServers.map(server => (
                        <ServerCard
                            key={server.uri}
                            server={server}
                            onDelete={deleteServer}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

interface ServerCardProps {
    server: Server
    onDelete: (uri: string) => void
}

function ServerCard({ server, onDelete }: ServerCardProps) {
    const { publisher } = server.value
    const did = server.uri.split('/')[2]

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString()
    }

    const getPackageInfo = (pkg: string, commitSha?: string): { type: string, displayName: string, installCommand: string } => {
        if (pkg.startsWith('@')) {
            return {
                type: 'NPM package',
                displayName: pkg,
                installCommand: `npm install ${pkg}`
            }
        }
        if (pkg.includes('github.com')) {
            // Extract the branch from the URL
            const branchMatch = pkg.match(/\/(main|master|blob)\//)
            const currentBranch = branchMatch ? branchMatch[1] : 'main'

            // Show either the commit SHA or the branch name
            const ref = commitSha ? `${currentBranch}@${commitSha.slice(0, 7)}` : currentBranch
            const displayUrl = pkg.replace(/\/(main|master|blob)\//, `/${ref}/`)

            // For installation, use the commit SHA if available
            const installUrl = commitSha ?
                pkg.replace(/\/(main|master|blob)\//, `/tree/${commitSha}/`) :
                pkg;

            return {
                type: 'GitHub repository',
                displayName: displayUrl,
                installCommand: `uv run ${installUrl}`
            }
        }
        return {
            type: 'Package',
            displayName: pkg,
            installCommand: pkg
        }
    }

    const { type: packageType, displayName, installCommand } = getPackageInfo(server.value.package, server.value.commitSha)

    return (
        <div className="server" style={{ fontSize: '0.9rem' }}>
            <div className="server-header">
                <div className="server-meta">
                    <div className="publisher-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <a
                                href={`https://bsky.app/profile/${publisher?.handle || did}`}
                                target="_blank"
                                rel="noopener"
                                title="View publisher's profile"
                                className="publisher"
                                style={{ fontFamily: 'inherit' }}
                            >
                                {publisher?.handle || did}
                            </a>
                            {publisher?.verifiedDomain && (
                                <span className="verified-domain" title="Verified domain" style={{ fontFamily: 'inherit' }}>
                                    ✓
                                </span>
                            )}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            fontFamily: 'inherit'
                        }}>
                            {did}
                        </div>
                    </div>
                    <div className="server-type" title="ATProto record collection type" style={{ fontFamily: 'inherit' }}>
                        {server.value.type}
                    </div>
                </div>
                <button
                    className="delete-btn"
                    onClick={() => onDelete(server.uri)}
                    title="Delete this server record (only available to the publisher)"
                    style={{ fontFamily: 'inherit' }}
                >
                    Delete
                </button>
            </div>

            <div className="server-content">
                <div className="server-name" style={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    marginBottom: '0.75rem'
                }}>
                    {server.value.name}
                    {server.value.version &&
                        <span className="version" style={{ fontFamily: 'inherit' }}>v{server.value.version}</span>
                    }
                </div>

                <div className="package-info">
                    <div className="package-label" style={{ fontFamily: 'inherit' }}>
                        {packageType}
                        <span className="help-text" title={`Install with: ${installCommand}`}>
                            ℹ️
                        </span>
                        {server.value.commitSha && (
                            <span className="commit-sha" title="Git commit SHA for reproducible install" style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--package-bg)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '0.25rem',
                                marginLeft: '0.5rem'
                            }}>
                                {server.value.commitSha.slice(0, 7)}
                            </span>
                        )}
                    </div>
                    <code className="package-name no-scrollbar" style={{
                        display: 'block',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        fontFamily: 'inherit'
                    }}>
                        {displayName}
                    </code>
                </div>

                {server.value.description && (
                    <div className="server-description" style={{
                        fontFamily: 'inherit',
                        opacity: 0.8
                    }}>
                        {server.value.description}
                    </div>
                )}

                <div className="server-timestamps" style={{ fontFamily: 'inherit', opacity: 0.7 }}>
                    <div className="timestamp">
                        <span className="timestamp-label">Last Registered:</span>
                        <span className="timestamp-value" title={server.value.lastRegisteredAt}>
                            {formatDate(server.value.lastRegisteredAt)}
                        </span>
                    </div>
                </div>

                {server.value.tools && server.value.tools.length > 0 && (
                    <div className="tools-container">
                        <div className="tools-label" style={{ fontFamily: 'inherit' }}>
                            Available Tools
                            <span className="help-text" title="Tools this MCP server provides to AI agents">
                                ℹ️
                            </span>
                        </div>
                        <div className="server-tools">
                            {server.value.tools.map(tool => (
                                <span key={tool} className="tool" title={`Tool: ${tool}`} style={{ fontFamily: 'inherit' }}>
                                    {tool}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 