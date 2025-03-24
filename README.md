
# Welcome to Trade Alerts Ninja

## Project Overview

Trade Alerts Ninja is an advanced crypto trading signals platform that combines multiple strategies to generate buy and sell alerts. The system uses technical analysis, machine learning, and backtesting to identify potential trading opportunities across multiple timeframes.

**URL**: https://lovable.dev/projects/7b4df4ca-7be6-47b1-a4af-c062340d3efc

## Architecture

The project consists of two main components:

1. **Python Backend**:
   - Signal generation engine with multiple strategies
   - Flask API for serving signals and performance metrics
   - SQLite database for storing signals and performance data

2. **React Frontend**:
   - Dashboard for viewing signals and performance
   - Strategy comparisons and analysis tools
   - User authentication and personalization

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Bybit API    │◄────┤ Signal Engine │◄────┤   Database    │
└───────────────┘     └───────┬───────┘     └───────────────┘
                            ▲
                            │
                            ▼
                      ┌─────────────┐
                      │  Flask API  │
                      └──────┬──────┘
                            ▲
                            │
                            ▼
                      ┌─────────────┐
                      │React Frontend│
                      └─────────────┘
```

## Available Trading Strategies

The system implements the following strategies:

1. **CLASSIC**: Combines RSI, Moving Averages, and MACD
2. **FAST**: Uses RSI and MACD for faster signals 
3. **RSI_MACD**: RSI extreme levels with MACD confirmation
4. **BREAKOUT_ATR**: Price breakouts with ATR volatility filter
5. **TREND_ADX**: Trend following with ADX strength filter
6. **BOLLINGER_BANDS**: Mean reversion with volume confirmation

## Getting Started

### Backend Setup

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Install required Python packages
pip install -r requirements.txt

# Run the signal generator
python trade_alerts_upgrade.py

# Start the Flask API server
python flask_api.py
```

### Frontend Setup

```sh
# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start the development server
npm run dev
```

## Testing

The project includes automated tests for signal generation and strategy evaluation:

```sh
# Run all tests
pytest tests/

# Run with coverage report
pytest tests/ --cov=./ --verbose
```

## Contributing

We welcome contributions to Trade Alerts Ninja! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-strategy`)
3. Implement your changes, including tests
4. Ensure all tests pass
5. Submit a pull request

### Coding Standards

- Use Google-style docstrings for all functions and classes
- Write unit tests for new functionality
- Follow PEP 8 style guidelines for Python code
- Use TypeScript for frontend code

### Adding a New Strategy

To add a new trading strategy:

1. Create a new file in the `strategies/` directory based on the template
2. Implement your strategy logic
3. Add the strategy to the factory in `strategies/__init__.py`
4. Add tests for your strategy in `tests/test_signals.py`
5. Update the documentation

Example strategy implementation:

```python
def my_new_strategy(row):
    """
    New strategy documentation here.
    
    Args:
        row: DataFrame row with indicators
    
    Returns:
        int: Signal (1=buy, -1=sell, 0=neutral)
    """
    # Strategy logic here
    return signal
```

## Performance Analysis

The system includes comprehensive performance analysis tools:

- Sharpe Ratio calculation
- Maximum Drawdown analysis
- Win Rate tracking
- Walk-forward testing

To run a performance analysis:

```python
from backtesting.performance import generate_performance_report

# Generate a report
report = generate_performance_report(signals_df)
print(report)
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
