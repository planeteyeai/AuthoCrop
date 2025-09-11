import React, { useEffect, useState } from "react";
import {
  Cloud,
  Droplets,
  Thermometer,
  Waves,
  AreaChart,
  Gauge,
  Satellite,
} from "lucide-react";

import RainfallCard from "./cards/RainfallCard";
import SoilMoistureCard from "./cards/SoilMoistureCard";
import WaterUptakeCard from "./cards/WaterUptakeCard";
import EvapotranspirationCard from "./cards/EvapotranspirationCard";
import TemperatureCard from "./cards/TemperatureCard";
import HumidityCard from "./cards/HumidityCard";
import SoilMoistureTrendCard from "./cards/SoilMoistureTrendCard";

import "./Irrigation.css";
import { useAppContext } from "../../context/AppContext";
import { getCache, setCache } from "../utils/cache";

interface WeatherData {
  location: string;
  region: string;
  country: string;
  localtime: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  humidity: number;
  wind_kph: number;
  precip_mm: number;
}

interface IrrigationProps {
  selectedPlotName?: string | null;
  moistGroundPercent?: number | null; // NEW
}

const Irrigation: React.FC<IrrigationProps> = ({
  selectedPlotName,
  moistGroundPercent,
}) => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  const weatherData = appState.weatherData || null;
  const [loading, setLoading] = useState<boolean>(!weatherData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const cacheKey = "weather_nasik";
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({ ...prev, weatherData: cached.data }));
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWeatherData();
    // eslint-disable-next-line
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://dev-currentw.cropeye.ai/current-weather?lat=19.99727&lon=73.79096`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      const data = await response.json();
      setAppState((prev: any) => ({ ...prev, weatherData: data }));
      setLastUpdated(new Date());
      setError(null);
      // Save to context cache and localStorage
      const payload = { data, timestamp: Date.now() };
      setCached("weather_nasik", payload);
    } catch (err) {
      setError("Error fetching weather data. Please try again later.");
      console.error("Error fetching weather data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const mockData = {
    soilMoisture: 65,
    waterUptake: {
      current: 1.2,
      average: 1.5,
      efficiency: 80,
    },
    evapotranspiration: {
      value: 3.8,
      average: 2.6,
    },
    waterLevel: {
      percentage: 85,
      current: 850,
      max: 1000,
    },
  };

  if (loading && !weatherData) {
    return (
      <div className="irrigation-loading">
        <div className="loading-spinner">
          <Satellite className="w-8 h-8 animate-spin text-blue-500" />
        </div>
        <p>Loading irrigation data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="irrigation-error">{error}</div>;
  }

  return (
    <div className="irrigation-container">
      <div className="irrigation-header">
        <h1>Irrigation Status</h1>
        <span className="date">{formattedDate}</span>
        {selectedPlotName && (
          <span className="plot-indicator">Plot: {selectedPlotName}</span>
        )}
      </div>

      <div className="card-row">
        <RainfallCard
          value={weatherData?.precip_mm || 0}
          lastUpdated={lastUpdated}
        />
        <TemperatureCard
          value={weatherData?.temperature_c || 0}
          lastUpdated={lastUpdated}
        />
        <HumidityCard
          value={weatherData?.humidity || 0}
          lastUpdated={lastUpdated}
        />
      </div>

      <div className="card-row">
        <EvapotranspirationCard />
        <SoilMoistureCard
          optimalRange={[50, 60]}
          moistGroundPercent={moistGroundPercent}
        />
        <WaterUptakeCard />
      </div>

      <div className="trend-card-row">
        <SoilMoistureTrendCard selectedPlotName={selectedPlotName} />
      </div>

      <div className="refresh-section">
        <button onClick={fetchWeatherData} className="refresh-button">
          Refresh Data
        </button>
        <span className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default Irrigation;
