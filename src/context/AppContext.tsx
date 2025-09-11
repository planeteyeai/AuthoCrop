import React, { createContext, useContext, useState } from "react";
import { getCache, setCache } from "../components/utils/cache";

// Define a generic cache type
interface GlobalCache {
  [key: string]: any;
}

// Example of extensible global state (add more as needed)
interface AppState {
  weatherData?: any;
  soilAnalysis?: any;
  fieldScore?: any;
  [key: string]: any;
}

interface AppContextType {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  globalCache: GlobalCache;
  setGlobalCache: React.Dispatch<React.SetStateAction<GlobalCache>>;
  getCached: (key: string, maxAgeMs?: number) => any;
  setCached: (key: string, data: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [appState, setAppState] = useState<AppState>({});
  const [globalCache, setGlobalCache] = useState<GlobalCache>({});

  // Helper to get from cache (context first, then localStorage)
  const getCached = (key: string, maxAgeMs?: number) => {
    if (globalCache[key]) return globalCache[key];
    return getCache(key, maxAgeMs);
  };

  // Helper to set cache (context and localStorage)
  const setCached = (key: string, data: any) => {
    setGlobalCache((prev) => ({ ...prev, [key]: data }));
    setCache(key, data);
  };

  return (
    <AppContext.Provider
      value={{
        appState,
        setAppState,
        globalCache,
        setGlobalCache,
        getCached,
        setCached,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within an AppProvider");
  return context;
};
