# mcproto-client: Decentralized MCP Server Registry using AT Protocol

This project aims to create a **decentralized registry for discovering Model Context Protocol (MCP) servers** by leveraging the Authenticated Transfer Protocol (AT Protocol). This README provides an overview of the project, instructions for development setup, and the underlying philosophy.

## Development Setup

To get started with development, follow the instructions below for both the registry (web UI and API) and the Python client.

### Registry (Web UI and API)

The registry is built using Bun.

1.  Navigate to the `registry` directory:
    ```bash
    cd registry
    ```
2.  **Install the necessary dependencies:**
    ```bash
    bun install
    ```
3.  **Run the registry in development mode:** You'll need to set your AT Protocol handle and password as environment variables.
    ```bash
    HANDLE=your.handle PASSWORD=your-password bun dev
    ```
    The registry will then be accessible at [http://localhost:3000](http://localhost:3000) (Web UI) and [http://localhost:3000/api/servers](http://localhost:3000/api/servers) (API).

### Python Client

The Python client (`mcproto-client`) requires Python 3.10 or later. It uses `uv` for managing the Python environment and dependencies.

1.  Navigate to the `clients/python` directory:
    ```bash
    cd clients/python
    ```
2.  It is assumed you have `uv` installed. If not, please follow the installation instructions for `uv`.
3.  **Install the Python dependencies** as specified in `pyproject.toml` and locked in `uv.lock`:
    ```bash
    uv sync
    ```
    This will synchronize your environment with the dependencies listed.
4.  You can then use the `mcproto` script located in `src/mcproto_client/_cli.py` to interact with the registry.

## Philosophy and Manifesto

This project is driven by the vision of a more open and interconnected landscape for AI agents and the tools they utilize.

*   **Decentralization for Robustness and Openness:** We believe that the discovery of AI service providers should not be controlled by any single entity. By leveraging the AT Protocol, we aim to build a **decentralized registry** where the information about MCP servers is distributed across users' personal data servers (PDS). This eliminates single points of failure and fosters a more open and permissionless environment for innovation in AI agent capabilities.

*   **Verifiable Identity and Trust:** A key concern when connecting AI agents to external services is trust. The AT Protocol provides a strong foundation for **identity ownership** through Decentralized Identifiers (DIDs) and verifiable handles. Each MCP server registration in this registry is **cryptographically signed by its publisher's DID**, ensuring that the origin of the server information can be verified. This addresses the need for verifying the identity of MCP servers, as highlighted in our discussions.

*   **Interoperability and Standardization:** The Model Context Protocol (MCP) itself is designed to **standardize AI-agent connectivity**, acting as a "USB-C for AI". This project complements MCP by providing a standardized and decentralized way to discover these MCP-compliant services.

*   **Community-Driven Ecosystem:** By building on open protocols like AT Protocol and MCP, we aim to foster a **community-driven ecosystem** where individuals and organizations can easily publish and discover AI tools. The registry UI shows who published each server, promoting transparency. Future developments could incorporate decentralized reputation mechanisms leveraging AT Protocol's labeling system and social graph.

## The Two Protocols: AT Protocol and Model Context Protocol (MCP)

This project bridges two powerful protocols to achieve its goals:

### AT Protocol (Authenticated Transfer Protocol)

The AT Protocol is a **federated social networking framework** built with **decentralization, user ownership, and interoperability** as core principles. Instead of a single central server, the AT Protocol consists of many independent servers (Personal Data Servers or PDS) where users can host their data.

*   **Decentralized Identity:** Users have portable, self-owned identities secured by **Decentralized Identifiers (DIDs)**. These DIDs are independent of any single server, allowing users to move their identity and data if needed. **Handles** (human-readable identifiers like `your.handle`) are linked to DIDs through verifiable mechanisms like DNS records, providing a user-friendly way to identify accounts.

*   **Data Sovereignty:** All user content (including MCP server registrations in our case) resides in a personal **repository** controlled by the user and hosted on their chosen PDS. This data is **self-authenticating**, cryptographically signed by the user's DID, ensuring its integrity and authenticity.

*   **Extensible and Interoperable:** The AT Protocol is designed to be **modular**, with higher-level features defined in **lexicons** (schema definitions). This allows for the creation of custom data structures, such as the `app.mcp.server` collection used in this project to store MCP server information. The **firehose** provides a real-time stream of all public data across the network, enabling services to index and discover information like MCP server registrations.

*   **Decentralized Trust and Moderation:** AT Protocol incorporates mechanisms for decentralized trust and moderation, including a **labeling system** that allows anyone to attach metadata to content or accounts. This can be used to build decentralized reputation systems for MCP servers in the future.

### Model Context Protocol (MCP)

The Model Context Protocol (MCP) is an **open standard** aimed at providing a **uniform and interoperable way** for AI assistants (like LLM-based agents) to connect with external data sources and tools.

*   **Standardized Interfaces:** MCP defines a common protocol based on **JSON-RPC** for AI clients to communicate with MCP servers. This standardizes how AI agents can list available actions (tools), invoke them, and receive results, regardless of the specific tool or AI model.

*   **Capability Advertisement:** When an AI client connects to an MCP server, the server **advertises its capabilities** (tools, resources, prompts) through an initialization handshake. This allows AI agents to dynamically discover and utilize the functionalities offered by different MCP servers.

*   **Open and Collaborative:** MCP is an **open-source standard** with SDKs in multiple languages, encouraging a collaborative ecosystem where developers can build and share MCP servers for various tools and data sources.

By combining the decentralized data storage and identity of the AT Protocol with the standardized AI-to-tool communication of MCP, this project aims to build a robust and open ecosystem for the next generation of AI applications.