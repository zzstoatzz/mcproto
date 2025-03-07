export interface Publisher {
    did: string
    handle?: string
    displayName?: string
    verifiedDomain?: string
}

export interface MCPServerRecord {
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
    publisher: Publisher
}

export interface Server {
    uri: string
    value: MCPServerRecord
}

// Sorting options
export interface SortOption {
    key: keyof MCPServerRecord | 'reputation'
    label: string
    direction?: 'asc' | 'desc'
} 