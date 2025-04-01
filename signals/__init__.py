
"""
Signals package for Trade Alerts Ninja.

This package contains modules for signal generation, conflict resolution,
volume analysis, and signal diversification.
"""

from signals.conflict_resolver import ConflictResolver
from signals.volume_analyzer import VolumeAnalyzer
from signals.diversifier import SignalDiversifier
from signals.generator_v2 import SignalGenerator

# Make sure to create the directory structure for ML signals and services
import os
os.makedirs("ml", exist_ok=True)
os.makedirs("signals", exist_ok=True)
os.makedirs("services", exist_ok=True)

__all__ = ['ConflictResolver', 'VolumeAnalyzer', 'SignalDiversifier', 'SignalGenerator']
