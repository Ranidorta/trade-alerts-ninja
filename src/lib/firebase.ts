
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { config } from "@/config/env";
import { updateStrategyStatistics } from "./firebaseFunctions";
import { TradingSignal } from "./types";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
  measurementId: config.firebase.measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize analytics only if supported by the browser
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

// Configure Google provider to request additional scopes if needed
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Utility function to log trading signals to Firebase
export async function logTradeSignal(signalData: TradingSignal) {
  try {
    // Import these functions here to avoid issues with SSR
    const { logEvent } = await import("firebase/analytics");
    const { doc, setDoc } = await import("firebase/firestore");
    
    // 1. Log to Analytics if supported
    const analyticsInstance = await analytics;
    if (analyticsInstance) {
      logEvent(analyticsInstance, 'trade_signal', signalData);
    }

    // 2. Save details to Firestore
    const signalId = signalData.id || `signal_${Date.now()}`;
    await setDoc(doc(db, "signals", signalId), {
      asset: signalData.symbol || signalData.pair || "UNKNOWN",
      direction: signalData.direction || "UNKNOWN",
      timestamp: new Date(),
      symbol: signalData.symbol || signalData.pair,
      entryPrice: signalData.entryPrice,
      stopLoss: signalData.stopLoss,
      takeProfit: signalData.takeProfit || 
        (signalData.targets ? signalData.targets.map(t => t.price) : []),
      result: signalData.result !== undefined ? 
        (typeof signalData.result === 'number' ? (signalData.result === 1 ? "win" : "loss") : signalData.result) : 
        "pending",
      strategy: signalData.strategy || "default",
      profit: signalData.profit,
      leverage: signalData.leverage || 1,
      timeframe: signalData.timeframe || "1h",
      status: signalData.status,
      createdAt: new Date(signalData.createdAt),
      hitTargets: signalData.hitTargets,
      verifiedAt: signalData.verifiedAt ? new Date(signalData.verifiedAt) : null
    });
    
    // 3. Update strategy statistics (similar to Firebase Functions trigger)
    if (signalData.result !== undefined) {
      await updateStrategyStatistics(signalData);
    }
    
    console.log("Signal logged to Firebase:", signalData.symbol);
    return true;
  } catch (error) {
    console.error("Error logging signal to Firebase:", error);
    return false;
  }
}

// Create a component to trigger the verification process for new signals
export async function triggerSignalVerification(signalId: string): Promise<boolean> {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    
    // Get the signal document
    const signalRef = doc(db, "signals", signalId);
    const snapshot = await getDoc(signalRef);
    
    if (!snapshot.exists()) {
      console.error(`Signal ${signalId} not found`);
      return false;
    }
    
    // Import verifyTradingSignal dynamically to avoid circular imports
    const { verifyTradingSignal } = await import("./firebaseFunctions");
    
    // Convert Firestore document to TradingSignal type
    const signalData = snapshot.data() as TradingSignal;
    
    // Ensure the ID is included
    signalData.id = signalId;
    
    // Verify the signal
    await verifyTradingSignal(signalData);
    
    return true;
  } catch (error) {
    console.error("Error triggering signal verification:", error);
    return false;
  }
}
