import { LexiconDoc } from '@atproto/lexicon'

export const NSID = 'app.mcp.server.attestation'

export const lexicon: LexiconDoc = {
  lexicon: 1,
  id: NSID,
  description: 'A record representing user attestation of an MCP server',
  defs: {
    main: {
      type: 'record',
      key: 'attestation',
      record: {
        type: 'object',
        required: ['serverUri', 'timestamp'],
        properties: {
          serverUri: {
            type: 'string',
            description: 'AT Protocol URI of the attested MCP server'
          },
          rating: {
            type: 'number',
            description: 'Optional rating (0-1)',
            minimum: 0,
            maximum: 1
          },
          comment: {
            type: 'string',
            description: 'Optional feedback about experience with the server'
          },
          timestamp: {
            type: 'string',
            format: 'datetime',
            description: 'When this attestation was created'
          },
          // Include metadata about the attestation
          usage: {
            type: 'object',
            description: 'Optional details about server usage',
            properties: {
              toolsUsed: {
                type: 'array',
                items: { type: 'string' },
                description: 'Which tools from the server were used'
              },
              duration: {
                type: 'string',
                description: 'How long they used the server (e.g. "2 weeks", "3 months")'
              }
            }
          }
        }
      }
    }
  }
} 