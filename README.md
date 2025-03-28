
# Trading Signals App

This application allows you to view and analyze trading signals for cryptocurrency markets.

## Features

- View trading signals with detailed information
- Track performance metrics and historical data
- Analyze win/loss ratios and target hits
- Works in both online and offline mode

## Working Offline

This application is designed to work without requiring a backend server connection:

1. **Local Storage**: All signals are cached in your browser's local storage
2. **Automatic Fallback**: If the API is unavailable, the app will automatically use cached data
3. **Demo Mode**: If no cached data exists, the app will generate demo data for you to explore the interface

### To Use Local Mode:

- If you see a connection error, click the "Continue with Local Mode" button
- The app will work with locally stored data and/or generate demo data
- You can always try reconnecting to the API by clicking "Try API Again"

## Development

This project is built with:

- React + TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts for data visualization

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## API Configuration

The app will try to connect to a backend API at the URL specified in your .env file:

```
VITE_SIGNALS_API_URL=http://localhost:5000/api
```

You can change this URL to point to your own API server if needed.

## License

MIT
