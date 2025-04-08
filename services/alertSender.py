import requests
from typing import Dict

class SignalSender:
    def __init__(self, config: Dict):
        self.telegram_url = config.get("telegram_webhook")
        self.discord_url = config.get("discord_webhook")

    def send_signal(self, signal: Dict):
        message = f"📊 SINAL {signal['direction']} {signal['symbol']}\nEntry: {signal['entry_price']}\nTP: {signal['tp']} | SL: {signal['sl']}"
        if self.telegram_url:
            requests.post(self.telegram_url, json={"text": message})
        if self.discord_url:
            requests.post(self.discord_url, json={"content": message})
