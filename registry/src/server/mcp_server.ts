import { LexiconDoc } from '@atproto/lexicon'

export const NSID = 'app.mcp.server'

export const lexicon: LexiconDoc = {
  lexicon: 1,
  id: NSID,
  description: 'A record representing an MCP server package',
  defs: {
    main: {
      type: 'record',
      key: 'main',
      record: {
        type: 'object',
        required: ['name', 'package', '$type', 'createdAt'],
        properties: {
          name: {
            type: 'string',
            description: 'Human-readable name of the MCP server'
          },
          installation: {
            type: 'string',
            description: 'Command or instructions to install and run the server (e.g. "uv run script.py" or "npx -y @package/name")'
          },
          $type: {
            type: 'string',
            description: 'Type identifier (e.g., app.mcp.server)'
          },
          version: {
            type: 'string',
            description: 'Package version'
          },
          description: {
            type: 'string',
            description: 'Description of server capabilities'
          },
          tools: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of available tools'
          },
          createdAt: {
            type: 'string',
            format: 'datetime',
            description: 'Timestamp when this record was created'
          },
          lastRegisteredAt: {
            type: 'string',
            format: 'datetime',
            description: 'Timestamp when this server was last registered'
          },
          commitSha: {
            type: 'string',
            description: 'Git commit SHA for reproducible installation'
          },
          language: {
            type: 'string',
            description: 'Programming language of the server implementation'
          },
          publisher: {
            type: 'object',
            description: 'Information about the server publisher',
            required: ['did'],
            properties: {
              did: {
                type: 'string',
                description: 'Publisher DID'
              },
              handle: {
                type: 'string',
                description: 'Publisher handle'
              },
              verifiedDomain: {
                type: 'string',
                description: 'Verified domain if handle contains a dot'
              }
            }
          }
        }
      }
    }
  }
}
