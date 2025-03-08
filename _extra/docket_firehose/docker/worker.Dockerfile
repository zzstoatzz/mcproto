# syntax=docker/dockerfile:1.9
FROM docket-firehose-base

CMD ["uv", "run", "-m", "docket_firehose.worker"] 