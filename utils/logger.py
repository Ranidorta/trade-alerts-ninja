
import logging
import os
import json
from datetime import datetime

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), '../config.json')
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {"log_file": "logs/agent.log"}

# Ensure log directory exists
log_file = config.get("log_file", "logs/agent.log")
os.makedirs(os.path.dirname(os.path.abspath(log_file)), exist_ok=True)

# Configure logger
logger = logging.getLogger("trade_signal_agent")
logger.setLevel(logging.INFO)

# File handler
file_handler = logging.FileHandler(log_file)
file_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# Console handler
console_handler = logging.StreamHandler()
console_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(console_formatter)
logger.addHandler(console_handler)
