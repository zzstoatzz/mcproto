"""logging configuration for the docket firehose package."""

import logging


def setup_logging(level: int = logging.INFO) -> None:
    """configure logging for the application."""

    # configure root logger
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # quiet noisy loggers
    for name in ["websockets", "docket"]:
        logging.getLogger(name).setLevel(logging.WARNING)
