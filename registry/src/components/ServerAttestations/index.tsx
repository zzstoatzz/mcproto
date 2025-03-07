import React, { useEffect, useState } from 'react'
import { Server } from '../../types'

interface Attestation {
    uri: string
    cid: string
    value: {
        serverUri: string
        rating: number
        comment?: string
        timestamp: string
        usage?: {
            toolsUsed?: string[]
            duration?: string
        }
    }
    publisher: {
        did: string
        handle?: string
        displayName?: string
    }
}

interface ServerAttestationsProps {
    server: Server
}

const INITIAL_SHOW_COUNT = 3

export function ServerAttestations({ server }: ServerAttestationsProps) {
    const [attestations, setAttestations] = useState<Attestation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showAll, setShowAll] = useState(false)

    useEffect(() => {
        const fetchAttestations = async () => {
            try {
                const response = await fetch(`/api/servers/${encodeURIComponent(server.uri)}/attestations`)
                if (!response.ok) {
                    throw new Error('Failed to fetch attestations')
                }
                const data = await response.json()

                // Deduplicate attestations by publisher, keeping the most recent one
                const latestByPublisher = data.reduce((acc: { [key: string]: Attestation }, curr: Attestation) => {
                    const publisherId = curr.publisher.did
                    if (!acc[publisherId] || new Date(curr.value.timestamp) > new Date(acc[publisherId].value.timestamp)) {
                        acc[publisherId] = curr
                    }
                    return acc
                }, {})

                // Convert back to array and sort by timestamp (newest first)
                const deduped = Object.values(latestByPublisher).sort((a, b) =>
                    new Date(b.value.timestamp).getTime() - new Date(a.value.timestamp).getTime()
                )

                setAttestations(deduped)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch attestations')
            } finally {
                setLoading(false)
            }
        }

        fetchAttestations()
    }, [server.uri])

    if (loading) {
        return (
            <div className="attestations-section">
                <div className="attestations-header">
                    <h3>Attestations</h3>
                    <span className="attestation-count">-</span>
                </div>
                <div className="attestations-loading">Loading attestations...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="attestations-section">
                <div className="attestations-header">
                    <h3>Attestations</h3>
                    <span className="attestation-count">0</span>
                </div>
                <div className="attestations-error">{error}</div>
            </div>
        )
    }

    if (attestations.length === 0) {
        return (
            <div className="attestations-section">
                <div className="attestations-header">
                    <h3>Attestations</h3>
                    <span className="attestation-count">0</span>
                </div>
                <div className="no-attestations">No attestations yet</div>
            </div>
        )
    }

    const visibleAttestations = showAll ? attestations : attestations.slice(0, INITIAL_SHOW_COUNT)
    const hasMore = attestations.length > INITIAL_SHOW_COUNT

    return (
        <div className="attestations-section">
            <div className="attestations-header">
                <h3>Attestations</h3>
                <span className="attestation-count">{attestations.length}</span>
            </div>
            <div className="attestations-list">
                {visibleAttestations.map(attestation => (
                    <div key={attestation.uri} className="attestation-item">
                        <div className="attestation-header">
                            <div className="attestation-publisher">
                                {attestation.publisher.displayName || attestation.publisher.handle || attestation.publisher.did}
                            </div>
                            <div className="attestation-rating">
                                {(attestation.value.rating * 100).toFixed(0)}%
                            </div>
                        </div>
                        {attestation.value.comment && (
                            <div className="attestation-comment">
                                "{attestation.value.comment}"
                            </div>
                        )}
                        {attestation.value.usage && (
                            <div className="attestation-usage">
                                <div className="usage-meta">
                                    {attestation.value.usage.duration && (
                                        <div className="usage-duration">
                                            {attestation.value.usage.duration}
                                        </div>
                                    )}
                                    <div className="attestation-timestamp">
                                        {new Date(attestation.value.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                {attestation.value.usage.toolsUsed && attestation.value.usage.toolsUsed.length > 0 && (
                                    <div className="tools-used">
                                        {attestation.value.usage.toolsUsed.map(tool => (
                                            <span key={tool} className="tool-tag">{tool}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {hasMore && (
                <button
                    className="show-more-btn"
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Show less' : `Show ${attestations.length - INITIAL_SHOW_COUNT} more`}
                </button>
            )}
        </div>
    )
} 