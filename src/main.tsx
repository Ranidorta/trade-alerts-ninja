
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CryptoMarket from "./pages/CryptoMarket";
import SignalsDashboard from "./pages/SignalsDashboard";
import SignalsHistory from "./pages/SignalsHistory";
import Admin from "./pages/Admin";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import NotFound from "./pages/NotFound";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase"; // Import the auth instance from firebase.ts
import BacktestingDashboard from "./pages/BacktestingDashboard";

// Firebase is already initialized in lib/firebase.ts, so we use the auth instance from there
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, see docs for a list of available properties
    // https://firebase.google.com/docs/reference/js/auth.usercredential
    const uid = user.uid;
    // ...
  } else {
    // User is signed out
    // ...
  }
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/market",
    element: <CryptoMarket />,
  },
  {
    path: "/signals",
    element: <SignalsDashboard />,
  },
  {
    path: "/history",
    element: <SignalsHistory />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
  {
    path: "/performance",
    element: <PerformanceDashboard />,
  },
  {
    path: "/backtest",
    element: <BacktestingDashboard />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
