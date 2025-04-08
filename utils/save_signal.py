import json
import os

def save_signal(signal, folder='signals'):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{signal['symbol']}_{signal['timestamp'].replace(':', '-')}.json")
    with open(path, 'w') as f:
        json.dump(signal, f, indent=2)
