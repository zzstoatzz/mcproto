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

  // Delete a server record by URI
  router.delete('/servers/:uri(*)', async (req, res) => {
    try {
      const uri = req.params.uri
      const [did, collection, rkey] = uri.split('/').slice(-3)

      // Only allow deletion if we own the record
      if (did !== agent.session?.did) {
        return res.status(403).json({ error: 'Not authorized to delete this server' })
      }

      await agent.api.com.atproto.repo.deleteRecord({
        repo: did,
        collection,
        rkey
      })
      
      res.status(204).send()
    } catch (error) {
      console.error('Failed to delete server:', error)
      res.status(500).json({ error: 'Failed to delete server' })
    }
  })

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  return router
} 