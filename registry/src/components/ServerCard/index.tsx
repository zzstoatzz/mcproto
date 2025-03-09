import React from 'react'
import { Server } from '../../types'
import { ServerAttestations } from '../ServerAttestations'
import { useAuth } from '../../contexts/AuthContext'

interface ServerCardProps {
    server: Server
    onDelete: (uri: string) => void
    onPublisherClick: (publisher: Server['value']['publisher']) => void
    onAttest: (server: Server) => void
}

function getInstallationInfo(installation: string, language?: string): { type: string, displayName: string } {
    if (language?.toLowerCase() === 'typescript') {
        return {
            type: 'npx command',
            displayName: installation
        }
    }
    return {
        type: 'uv command',
        displayName: installation
    }
}

export function ServerCard({ server, onDelete, onPublisherClick, onAttest }: ServerCardProps) {
    const { publisher } = server.value
    const did = server.uri.split('/')[2]
    const { currentUser } = useAuth()

    // Debug logging
    console.log('Server Card Debug:', {
        serverDid: did,
        publisherDid: publisher.did,
        currentUserDid: currentUser?.did,
        canDelete: currentUser?.did === publisher.did,
        server: server,
        publisher: publisher,
        currentUser: currentUser,
        didMatch: currentUser?.did === publisher.did
    })

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString()
    }

    const { type: installationType, displayName } = getInstallationInfo(
        server.value.installation,
        server.value.language
    )

    const canDelete = currentUser?.did === publisher.did

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
                <div className="server-actions">
                    <div className="action-buttons">
                        <button
                            className="action-btn vouch-btn"
                            onClick={() => onAttest(server)}
                            title="Vouch for this server with your Bluesky identity"
                        >
                            Vouch
                        </button>
                        {canDelete && (
                            <button
                                className="action-btn delete-btn"
                                onClick={() => onDelete(server.uri)}
                                title="Delete this server record (only available to the publisher)"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
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
                        {installationType}
                        <span className="help-text" title="Command to install and run this server">
                            ℹ️
                        </span>
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

                <ServerAttestations server={server} />
            </div>
        </div>
    )
} 