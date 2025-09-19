import React, { useEffect, useState } from "react";
import { Satellite } from "lucide-react";

import RainfallCard from "./cards/RainfallCard";
import SoilMoistureCard from "./cards/SoilMoistureCard";
import WaterUptakeCard from "./cards/WaterUptakeCard";
import EvapotranspirationCard from "./cards/EvapotranspirationCard";
import TemperatureCard from "./cards/TemperatureCard";
import HumidityCard from "./cards/HumidityCard";
import SoilMoistureTrendCard from "./cards/SoilMoistureTrendCard";

import "./Irrigation.css";
import { useAppContext } from "../../context/AppContext";
import { useFarmerProfile } from "../../hooks/useFarmerProfile";
import { fetchCurrentWeather } from "../../services/weatherService";

interface IrrigationProps {
  selectedPlotName?: string | null;
  moistGroundPercent?: number | null; // NEW
}

const Irrigation: React.FC<IrrigationProps> = ({
  selectedPlotName,
  moistGroundPercent,
}) => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  const { profile, loading: profileLoading } = useFarmerProfile();
  const weatherData = appState.weatherData || null;
  const [loading, setLoading] = useState<boolean>(!weatherData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    // Wait for farmer profile to load
    if (profileLoading || !profile) {
      console.log('🌤️ Irrigation: Waiting for farmer profile to load...');
      return;
    }

    // Get farmer's location from their first plot
    if (!profile.plots || profile.plots.length === 0) {
      console.warn('🌤️ Irrigation: No plots found in farmer profile');
      setError("No location data available for weather");
      setLoading(false);
      return;
    }

    const firstPlot = profile.plots[0];
    const coordinates = firstPlot.coordinates?.location?.coordinates;
    
    if (!coordinates || coordinates.length !== 2) {
      console.warn('🌤️ Irrigation: Invalid coordinates in farmer profile:', coordinates);
      setError("Invalid location data for weather");
      setLoading(false);
      return;
    }

    const [longitude, latitude] = coordinates;
    const cacheKey = `weather_${latitude}_${longitude}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({ ...prev, weatherData: cached.data }));
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetchWeatherData(latitude, longitude);
    // eslint-disable-next-line
  }, [profile, profileLoading]);

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      console.log('🌤️ Irrigation: Fetching weather for coordinates:', { lat, lon });
      
      // Use the same weather service as Header component
      const data = await fetchCurrentWeather(lat, lon);
      console.log('🌤️ Irrigation: Weather data received:', data);
      
      setAppState((prev: any) => ({ ...prev, weatherData: data }));
      setLastUpdated(new Date());
      setError(null);
      
      // Save to context cache and localStorage with location-specific key
      const cacheKey = `weather_${lat}_${lon}`;
      const payload = { data, timestamp: Date.now() };
      setCached(cacheKey, payload);
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


  if (profileLoading || (loading && !weatherData)) {
    return (
      <div className="irrigation-loading">
        <div className="loading-spinner">
          <Satellite className="w-8 h-8 animate-spin text-blue-500" />
        </div>
        <p>{profileLoading ? 'Loading farmer profile...' : 'Loading irrigation data...'}</p>
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
        <button 
          onClick={() => {
            if (profile?.plots?.[0]?.coordinates?.location?.coordinates) {
              const [longitude, latitude] = profile.plots[0].coordinates.location.coordinates;
              fetchWeatherData(latitude, longitude);
            }
          }} 
          className="refresh-button"
        >
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
