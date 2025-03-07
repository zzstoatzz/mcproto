import React from 'react'
import { Server } from '../../types'

interface ServerCardProps {
    server: Server
    onDelete: (uri: string) => void
    onPublisherClick: (publisher: Server['value']['publisher']) => void
}

function getPackageInfo(pkg: string, commitSha?: string, language?: string): { type: string, displayName: string, installCommand: string } {
    if (pkg.startsWith('@')) {
        return {
            type: 'NPM package',
            displayName: pkg,
            installCommand: `npm install ${pkg}`
        }
    }
    if (pkg.includes('github.com')) {
        // For installation, use the commit SHA if available
        const installUrl = commitSha ?
            pkg.replace(/\/(main|master|blob)\//, `/tree/${commitSha}/`) :
            pkg;

        // Language-specific installation instructions
        const installCommand = language?.toLowerCase() === 'typescript' ?
            `git clone ${pkg} && cd $(basename ${pkg} .git) && bun install && bun run examples/example-server.ts` :
            `uv run ${installUrl}`;

        return {
            type: 'GitHub repository',
            displayName: pkg,
            installCommand
        }
    }
    return {
        type: 'Package',
        displayName: pkg,
        installCommand: pkg
    }
}

export function ServerCard({ server, onDelete, onPublisherClick }: ServerCardProps) {
    const { publisher } = server.value
    const did = server.uri.split('/')[2]

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString()
    }

    const { type: packageType, displayName, installCommand } = getPackageInfo(
        server.value.package,
        server.value.commitSha,
        server.value.language
    )

    return (
        <div className="server">
            <div className="server-header">
                <div className="server-meta">
                    <div className="publisher-info">
                        <div className="publisher-row">
                            <button
                                onClick={() => onPublisherClick(publisher)}
                                className="publisher-button"
                                title="View publisher details"
                            >
                                {publisher?.handle || did}
                            </button>
                            {publisher?.verifiedDomain && (
                                <span className="verified-domain" title="Verified domain">✓</span>
                            )}
                        </div>
                        <div className="did-text">{did}</div>
                    </div>
                    <div className="badge-container">
                        <div className="server-type" title="ATProto record collection type">
                            {server.value.$type}
                        </div>
                        <div className="server-type" title="Programming language">
                            {server.value.language}
                        </div>
                    </div>
                </div>
                <button
                    className="delete-btn"
                    onClick={() => onDelete(server.uri)}
                    title="Delete this server record (only available to the publisher)"
                >
                    Delete
                </button>
            </div>

            <div className="server-content">
                <div className="server-name">
                    {server.value.name}
                    {server.value.version && (
                        <span className="version">v{server.value.version}</span>
                    )}
                </div>

                <div className="package-info">
                    <div className="package-label">
                        {packageType}
                        <span className="help-text" title={`Install with: ${installCommand}`}>
                            ℹ️
                        </span>
                        {server.value.commitSha && (
                            <span className="commit-sha" title="Git commit SHA for reproducible install">
                                {server.value.commitSha.slice(0, 7)}
                            </span>
                        )}
                    </div>
                    <code className="package-name no-scrollbar">
                        {displayName}
                    </code>
                </div>

                <div className="server-description">
                    {server.value.description || 'No description provided'}
                </div>

                <div className="tools-section">
                    <div className="tools-label">
                        Available Tools
                        <span className="help-text" title="Tools this MCP server provides to AI agents">
                            ℹ️
                        </span>
                    </div>
                    <div className="server-tools">
                        {server.value.tools && server.value.tools.length > 0 ? (
                            server.value.tools.map(tool => (
                                <span key={tool} className="tool" title={`Tool: ${tool}`}>
                                    {tool}
                                </span>
                            ))
                        ) : (
                            <span className="no-tools">No tools available</span>
                        )}
                    </div>
                </div>

                <div className="server-timestamps">
                    <div className="timestamp">
                        <span className="timestamp-label">Last Registered:</span>
                        <span className="timestamp-value" title={server.value.lastRegisteredAt}>
                            {formatDate(server.value.lastRegisteredAt)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
} 