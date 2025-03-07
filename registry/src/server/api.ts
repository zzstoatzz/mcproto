import { Router } from 'express'
import { BskyAgent } from '@atproto/api'
import { NSID } from './mcp_server'

interface MCPServerRecord {
  name: string
  package: string
  $type: string
  version?: string
  description?: string
  tools?: string[]
  createdAt: string
}

interface AttestationRecord {
  $type: 'app.mcp.server.attestation'
  serverUri: string
  rating: number
  comment?: string
  timestamp: string
  usage?: {
    toolsUsed?: string[]
    duration?: string
  }
}

export function createApiRouter(agent: BskyAgent) {
  const router = Router()

  // Middleware to ensure agent is authenticated
  router.use(async (req, res, next) => {
    try {
      if (!agent.session) {
        // Re-authenticate if session is lost
        await agent.login({
          identifier: process.env.BSKY_HANDLE || '',
          password: process.env.BSKY_PASSWORD || ''
        })
      }
      next()
    } catch (error) {
      console.error('Authentication failed:', error)
      res.status(401).json({ error: 'Authentication failed' })
    }
  })

  // List MCP server records from all repos
  router.get('/servers', async (req, res) => {
    try {
      // First get our own records
      const ownRecords = await agent.api.com.atproto.repo.listRecords({
        repo: agent.session?.did || '',
        collection: NSID
      });

      // Then search for all MCP server records
      const { data: searchResults } = await agent.api.app.bsky.feed.searchPosts({
        q: `type:${NSID}`,
        limit: 100  // Adjust limit as needed
      });

      // Combine and deduplicate records
      const seenUris = new Set<string>();
      const allServers = [];

      // Add own records first
      for (const record of ownRecords.data.records) {
        seenUris.add(record.uri);
        allServers.push({
          uri: record.uri,
          value: record.value as MCPServerRecord
        });
      }

      // Add records from search results
      for (const post of searchResults.posts) {
        if (!seenUris.has(post.uri)) {
          seenUris.add(post.uri);
          // Fetch the actual record since search results don't include full record data
          try {
            const [did, collection, rkey] = post.uri.split('/').slice(-3);
            const { data: record } = await agent.api.com.atproto.repo.getRecord({
              repo: did,
              collection: NSID,
              rkey
            });
            if (record) {
              allServers.push({
                uri: post.uri,
                value: record.value as MCPServerRecord
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch record ${post.uri}:`, error);
          }
        }
      }

      res.json(allServers);
    } catch (error) {
      console.error('Failed to fetch servers:', error);
      res.status(500).json({ error: 'Failed to fetch servers' });
    }
  });

  // Delete a server record
  router.delete('/servers/:uri(*)', async (req, res) => {
    try {
      const { uri } = req.params
      
      // Get the record to verify ownership
      const record = await agent.api.com.atproto.repo.getRecord({
        repo: uri.split('/')[2],
        collection: NSID,
        rkey: uri.split('/').pop() || ''
      })

      // Verify the requester owns the record
      if (!agent.session || record.data.uri.split('/')[2] !== agent.session.did) {
        return res.status(403).json({ 
          error: 'Unauthorized: You can only delete your own server records' 
        })
      }

      await agent.api.com.atproto.repo.deleteRecord({
        repo: agent.session.did,
        collection: NSID,
        rkey: uri.split('/').pop() || ''
      })

      res.status(200).json({ success: true })
    } catch (err) {
      console.error('Failed to delete server record:', err)
      res.status(500).json({ error: 'Failed to delete server record' })
    }
  })

  // Fetch attestations for a server
  router.get('/servers/:uri(*)/attestations', async (req, res) => {
    try {
      const uri = req.params.uri
      const allAttestations = []

      // First get attestations from our own repo
      try {
        const { data: ownAttestations } = await agent.api.com.atproto.repo.listRecords({
          repo: agent.session?.did || '',
          collection: 'app.mcp.server.attestation',
          limit: 100
        })

        // Filter and add our own attestations
        for (const record of ownAttestations.records) {
          const value = record.value as AttestationRecord
          if (value.serverUri === uri) {
            allAttestations.push({
              uri: record.uri,
              cid: record.cid,
              value,
              publisher: {
                did: agent.session?.did,
                handle: agent.session?.handle
              }
            })
          }
        }
      } catch (error) {
        console.warn('Failed to fetch own attestations:', error)
      }

      // Then try to find other attestations via search
      try {
        const { data: searchResults } = await agent.api.app.bsky.feed.searchPosts({
          q: `collection:app.mcp.server.attestation "${uri}"`,
          limit: 50
        })

        // Fetch full attestation records from search results
        await Promise.all(
          searchResults.posts.map(async (post) => {
            try {
              const [did, collection, rkey] = post.uri.split('/').slice(-3)
              
              // Skip if it's our own attestation (we already have it)
              if (did === agent.session?.did) return

              const { data: record } = await agent.api.com.atproto.repo.getRecord({
                repo: did,
                collection: 'app.mcp.server.attestation',
                rkey
              })
              
              const value = record.value as AttestationRecord
              if (value && value.serverUri === uri) {
                allAttestations.push({
                  uri: post.uri,
                  cid: post.cid,
                  value,
                  publisher: {
                    did: did,
                    handle: post.author.handle,
                    displayName: post.author.displayName
                  }
                })
              }
            } catch (error) {
              console.warn(`Failed to fetch attestation record ${post.uri}:`, error)
            }
          })
        )
      } catch (error) {
        console.warn('Failed to fetch attestations via search:', error)
      }

      // Sort attestations by timestamp, newest first
      allAttestations.sort((a, b) => {
        return new Date(b.value.timestamp).getTime() - new Date(a.value.timestamp).getTime()
      })

      res.json(allAttestations)
    } catch (error) {
      console.error('Failed to fetch attestations:', error)
      res.status(500).json({ error: 'Failed to fetch attestations' })
    }
  })

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  return router
} 