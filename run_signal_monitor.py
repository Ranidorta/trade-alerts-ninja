
#!/usr/bin/env python3
"""
Run script for the signal monitoring service.
This script starts the background process for continuous signal evaluation.
"""

import os
import sys
import logging
from services.signal_evaluator_loop import main

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(message)s',
        handlers=[
            logging.FileHandler("signal_monitor.log"),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger = logging.getLogger("signal_monitor")
    logger.info("Starting signal monitoring service")
    
    try:
        main()
    except Exception as e:
        logger.error(f"Error in signal monitoring service: {e}")
        sys.exit(1)
