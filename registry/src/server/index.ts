import { BskyAgent } from '@atproto/api'
import { createServer } from './server'

async function main() {
    const agent = new BskyAgent({
        service: 'https://bsky.social'
    })

    // Login with credentials
    if (!process.env.BSKY_HANDLE || !process.env.BSKY_PASSWORD) {
        console.error('Missing BSKY_HANDLE or BSKY_PASSWORD environment variables')
        process.exit(1)
    }

    try {
        await agent.login({
            identifier: process.env.BSKY_HANDLE,
            password: process.env.BSKY_PASSWORD
        })
        
        await createServer(agent)
    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

main() 