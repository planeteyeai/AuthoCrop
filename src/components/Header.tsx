import React, { useEffect, useState } from 'react';
import { Menu, X, Cloud, Thermometer, Wind, Droplet } from 'lucide-react';
import cropeyecLogo from './icons/CROPEYE Updated.png';
import './Header.css';
import { fetchCurrentWeather, formatTemperature, formatWindSpeed, formatHumidity, formatPrecipitation, getWeatherIcon, getWeatherCondition, type WeatherData as WeatherServiceData } from '../services/weatherService';
import { useFarmerProfile } from '../hooks/useFarmerProfile';
import { useAppContext } from '../context/AppContext';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const [weather, setWeather] = useState<WeatherServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, loading: profileLoading } = useFarmerProfile();
  const { getCached, setCached } = useAppContext();

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Wait for profile to load
        if (profileLoading || !profile) {
          console.log('🌤️ Waiting for farmer profile to load...');
          return;
        }

        // Get farmer's location from their first plot
        if (!profile.plots || profile.plots.length === 0) {
          console.warn('🌤️ No plots found in farmer profile');
          setError("No location data available for weather");
          setLoading(false);
          return;
        }

        const firstPlot = profile.plots[0];
        const coordinates = firstPlot.coordinates?.location?.coordinates;
        
        if (!coordinates || coordinates.length !== 2) {
          console.warn('🌤️ Invalid coordinates in farmer profile:', coordinates);
          setError("Invalid location data for weather");
          setLoading(false);
          return;
        }

        const [longitude, latitude] = coordinates;
        console.log('🌤️ Fetching weather for farmer location:', { latitude, longitude });
        console.log('🌤️ Farmer location:', firstPlot.address?.full_address || 'Unknown location');
        
        // Check cache first (same as Irrigation component)
        const cacheKey = `weather_${latitude}_${longitude}`;
        const cached = getCached(cacheKey);
        if (cached) {
          console.log('🌤️ Using cached weather data');
          setWeather(cached.data);
          setError(null);
          setLoading(false);
          return;
        }
        
        // Fetch weather data using the new service
        const weatherData = await fetchCurrentWeather(latitude, longitude);
        console.log('🌤️ Weather data received:', weatherData);
        
        setWeather(weatherData);
        setError(null);
        setLoading(false);
        
        // Cache the data (same as Irrigation component)
        const payload = { data: weatherData, timestamp: Date.now() };
        setCached(cacheKey, payload);
        
      } catch (err) {
        console.error('🌤️ Weather fetch error:', err);
        
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to fetch weather data");
        }
        
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Set up periodic refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [profile, profileLoading]);

  const WeatherMarqueeContent = () => (
    <div className="weather-marquee-item">
      {weather && (
        <>
         

          {/* Weather Icon and Condition */}
          <div className="weather-item weather-condition">
            <span className="weather-icon-text">{getWeatherIcon(weather.temperature_c, weather.humidity, weather.precip_mm)}</span>
            <span className="weather-text">{getWeatherCondition(weather.temperature_c, weather.humidity, weather.precip_mm)}</span>
          </div>

          {/* Temperature */}
          <div className="weather-item weather-temp">
            <Thermometer className="weather-icon" size={18} />
            <span className="weather-text">{formatTemperature(weather.temperature_c)}</span>
          </div>

          {/* Humidity */}
          <div className="weather-item weather-humidity">
            <Cloud className="weather-icon" size={18} />
            <span className="weather-text">{formatHumidity(weather.humidity)}</span>
          </div>

          {/* Wind Speed */}
          <div className="weather-item weather-wind">
            <Wind className="weather-icon" size={18} />
            <span className="weather-text">{formatWindSpeed(weather.wind_kph)}</span>
          </div>

          {/* Precipitation */}
          {weather.precip_mm > 0 && (
            <div className="weather-item weather-precipitation">
              <Droplet className="weather-icon" size={18} />
              <span className="weather-text">{formatPrecipitation(weather.precip_mm)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <header className="header-container bg-blue-100">
      {/* Main Header Section */}
      <div className="header-main">
        {/* Left side - Menu Button */}
        <button onClick={toggleSidebar} className="menu-button">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Center - Weather Marquee */}
        <div className="marquee-section">
          <div className="marquee-container">
            {profileLoading ? (
              <div className="loading-text">Loading farmer profile...</div>
            ) : loading ? (
              <div className="loading-text">Loading weather data...</div>
            ) : error ? (
              <div className="error-text">{error}</div>
            ) : (
              <div className="marquee-content">
                <WeatherMarqueeContent />
                {/* Duplicate content for seamless loop */}
                <WeatherMarqueeContent />
              </div>
            )}
          </div>
        </div>

        {/* Right side - Fixed Logo */}
        <div className="logo-container">
          <img src={cropeyecLogo} alt="CropEye Logo" className="logo-image" />
        </div>
      </div>
    </header>
  );
};

export default Header;