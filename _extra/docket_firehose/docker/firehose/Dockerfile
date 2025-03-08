# syntax=docker/dockerfile:1.9
FROM docket-firehose-base

CMD ["python3", "-c", "from tasks.firehose import consume_firehose; import asyncio; asyncio.run(consume_firehose(frozenset({'app.mcp.server'})))"] 