# syntax=docker/dockerfile:1.9
FROM ubuntu:noble AS build

SHELL ["sh", "-exc"]

# Build prep
RUN <<EOT
apt-get update -qy
apt-get install -qyy \
    -o APT::Install-Recommends=false \
    -o APT::Install-Suggests=false \
    build-essential \
    ca-certificates \
    python3-setuptools \
    python3.12-dev
EOT

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# UV configuration
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PYTHON=/usr/bin/python3.12 \
    UV_PROJECT_ENVIRONMENT=/app

# Install dependencies
RUN --mount=type=cache,target=/root/.cache \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync \
    --locked \
    --no-dev \
    --no-install-project

# Install the application
COPY src/ /src/
WORKDIR /src
RUN --mount=type=cache,target=/root/.cache \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync \
    --locked \
    --no-dev \
    --no-editable

##########################################################################

FROM ubuntu:noble

SHELL ["sh", "-exc"]

ENV PATH=/app/bin:$PATH \
    PYTHONPATH=/app/src

# Create non-root user
RUN <<EOT
groupadd -r app
useradd -r -d /app -g app -N app
EOT

# Install runtime dependencies
RUN <<EOT
apt-get update -qy
apt-get install -qyy \
    -o APT::Install-Recommends=false \
    -o APT::Install-Suggests=false \
    python3.12 \
    libpython3.12 \
    ca-certificates

apt-get clean
rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
EOT

# Copy UV from build stage
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy the pre-built /app directory
COPY --from=build --chown=app:app /app /app
COPY --from=build --chown=app:app /src /app/src

# Create data directory with proper permissions
RUN <<EOT
mkdir -p /app/data/firehose
chown -R app:app /app/data
chmod -R 755 /app/data
EOT

USER app
WORKDIR /app

# Smoke test
RUN <<EOT
python -V
python -Im site
python -c 'from docket_firehose.tasks.firehose import consume_firehose'
EOT

STOPSIGNAL SIGTERM 