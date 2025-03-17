run-registry: 
    #!/bin/bash
    cd registry && bun dev

register-all-servers:
    #!/bin/bash
    cd servers
    for file in *.py; do
        echo "Registering MCP server found in $file"
        uv run --with mcproto-client@git+https://github.com/zzstoatzz/mcproto.git#subdirectory=clients/python mcproto "$file"
    done
