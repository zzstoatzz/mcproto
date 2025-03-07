import React from 'react'

interface Publisher {
    did: string
    handle?: string
    displayName?: string
    verifiedDomain?: string
}

interface PublisherModalProps {
    publisher: Publisher
    isOpen: boolean
    onClose: () => void
}

export function PublisherModal({ publisher, isOpen, onClose }: PublisherModalProps) {
    if (!isOpen) return null;

    const hasPublisherInfo = publisher.handle || publisher.displayName;
    const hasVerifiedDomain = Boolean(publisher.verifiedDomain);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Publisher Profile</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <div className="publisher-profile">
                    <div className="publisher-header">
                        <h3>
                            {publisher.displayName || publisher.handle || 'Unknown Publisher'}
                            {hasVerifiedDomain && (
                                <span className="verified-badge" title="Verified domain">✓</span>
                            )}
                        </h3>
                    </div>

                    <div className="publisher-details">
                        <div className="detail-row">
                            <span className="detail-label">DID:</span>
                            <span className="detail-value">{publisher.did}</span>
                        </div>
                        {hasVerifiedDomain ? (
                            <div className="detail-row">
                                <span className="detail-label">Verified Domain:</span>
                                <span className="detail-value">{publisher.verifiedDomain}</span>
                            </div>
                        ) : (
                            <div className="publisher-warning">
                                ⚠️ This publisher does not have a verified domain. Exercise caution when using their servers.
                            </div>
                        )}
                        {!hasPublisherInfo && (
                            <div className="publisher-warning">
                                This publisher hasn't set up their Bluesky profile yet.
                            </div>
                        )}
                    </div>

                    <div className="publisher-actions">
                        {hasPublisherInfo ? (
                            <a
                                href={`https://bsky.app/profile/${publisher.handle || publisher.did}`}
                                target="_blank"
                                rel="noopener"
                                className="bluesky-link"
                            >
                                View on Bluesky
                            </a>
                        ) : (
                            <span className="disabled-link" title="Profile not available">
                                Profile Not Available
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 