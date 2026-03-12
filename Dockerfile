FROM python:3.11-slim

LABEL maintainer="Novyx Labs <blake@novyxlabs.com>"
LABEL org.opencontainers.image.source="https://github.com/novyxlabs/novyx-mcp-desktop"
LABEL org.opencontainers.image.description="Novyx MCP — persistent memory for AI agents"
LABEL org.opencontainers.image.licenses="MIT"

RUN pip install --no-cache-dir novyx-mcp==2.1.4

ENTRYPOINT ["python", "-m", "novyx_mcp"]
