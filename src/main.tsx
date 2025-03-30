
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
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { config } from "./config/env";
import BacktestingDashboard from "./pages/BacktestingDashboard";

// Use the firebase config object directly from the config file
const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
