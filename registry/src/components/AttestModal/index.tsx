import React, { useState } from 'react'
import { Server } from '../../types'
import { BskyAgent } from '@atproto/api'
import { useAuth } from '../../contexts/AuthContext'

interface AttestModalProps {
    server: Server
    isOpen: boolean
    onClose: () => void
}

export function AttestModal({ server, isOpen, onClose }: AttestModalProps) {
    const { login, currentUser } = useAuth()
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [credentials, setCredentials] = useState({ identifier: '', password: '' })
    const [attestation, setAttestation] = useState({
        rating: 1,
        comment: '',
        toolsUsed: [] as string[],
        duration: ''
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsAuthenticating(true)

        try {
            let agent: BskyAgent;

            if (!currentUser) {
                // If not logged in, authenticate through the context first
                await login(credentials.identifier, credentials.password)

                // Create new agent with the same credentials
                agent = new BskyAgent({
                    service: 'https://bsky.social'
                })
                await agent.login(credentials)
            } else {
                // If already logged in, just create agent with stored credentials
                agent = new BskyAgent({
                    service: 'https://bsky.social'
                })
                await agent.login({
                    identifier: currentUser.handle,
                    password: credentials.password
                })
            }

            // Create the attestation record
            await agent.api.com.atproto.repo.createRecord({
                repo: agent.session?.did || '',
                collection: 'app.mcp.server.attestation',
                record: {
                    serverUri: server.uri,
                    rating: attestation.rating,
                    comment: attestation.comment,
                    timestamp: new Date().toISOString(),
                    usage: {
                        toolsUsed: attestation.toolsUsed,
                        duration: attestation.duration
                    }
                }
            })

            setSuccess(true)
            setTimeout(() => {
                onClose()
                setSuccess(false)
                setCredentials({ identifier: '', password: '' })
                setAttestation({ rating: 1, comment: '', toolsUsed: [], duration: '' })
            }, 2000)

        } catch (err) {
            console.error('Attestation error:', err)
            setError(err instanceof Error ? err.message : 'Failed to submit attestation')
        }
        setIsAuthenticating(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Vouch for {server.value.name}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {success ? (
                    <div className="success-message">
                        ✅ Attestation published successfully!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="auth-section">
                            <p className="auth-info">
                                {currentUser
                                    ? `Logged in as ${currentUser.handle}`
                                    : 'Sign in with your Bluesky account to publish an attestation.'}
                            </p>
                            {!currentUser && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Bluesky handle or email"
                                        value={credentials.identifier}
                                        onChange={e => setCredentials(c => ({ ...c, identifier: e.target.value }))}
                                        required
                                    />
                                </>
                            )}
                            <input
                                type="password"
                                placeholder="Password"
                                value={credentials.password}
                                onChange={e => setCredentials(c => ({ ...c, password: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="attestation-form">
                            <div className="rating-input">
                                <label>Rating:</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={attestation.rating}
                                    onChange={e => setAttestation(a => ({ ...a, rating: parseFloat(e.target.value) }))}
                                />
                                <span>{(attestation.rating * 100).toFixed(0)}%</span>
                            </div>

                            <div className="tools-input">
                                <label>Tools Used:</label>
                                <div className="tools-grid">
                                    {server.value.tools?.map(tool => (
                                        <label key={tool} className="tool-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={attestation.toolsUsed.includes(tool)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setAttestation(a => ({
                                                            ...a,
                                                            toolsUsed: [...a.toolsUsed, tool]
                                                        }))
                                                    } else {
                                                        setAttestation(a => ({
                                                            ...a,
                                                            toolsUsed: a.toolsUsed.filter(t => t !== tool)
                                                        }))
                                                    }
                                                }}
                                            />
                                            {tool}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="duration-input">
                                <label>Usage Duration:</label>
                                <select
                                    value={attestation.duration}
                                    onChange={e => setAttestation(a => ({ ...a, duration: e.target.value }))}
                                >
                                    <option value="">Select duration...</option>
                                    <option value="< 1 week">Less than a week</option>
                                    <option value="1-4 weeks">1-4 weeks</option>
                                    <option value="1-3 months">1-3 months</option>
                                    <option value="3+ months">3+ months</option>
                                </select>
                            </div>

                            <textarea
                                placeholder="Share your experience with this server... (optional)"
                                value={attestation.comment}
                                onChange={e => setAttestation(a => ({ ...a, comment: e.target.value }))}
                                rows={4}
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button
                            type="submit"
                            className="submit-button"
                            disabled={isAuthenticating}
                        >
                            {isAuthenticating ? 'Publishing...' : 'Publish Attestation'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
} 