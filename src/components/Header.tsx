import React, { useEffect, useState } from 'react';
import { Menu, X, Cloud, Thermometer, Wind, Eye, Gauge, Droplet, CloudRain, Sun } from 'lucide-react';
import cropeyecLogo from './icons/CROPEYE Updated.png';
import './Header.css';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

// Define the interface for your API response
interface WeatherData {
  temp_C?: string;
  wind_km_h?: string;
  rain_mm?: number;
  humidity_percent?: string;
  // Actual API field names
  temperature_c?: number;
  humidity?: number;
  wind_kph?: number;
  precip_mm?: number;
  // Alternative field names that might exist
  temperature?: string;
  wind_speed?: string;
  precipitation?: number;
  // Add any other fields that might be present
  [key: string]: any;
} 

const API_URL = "http://192.168.41.120:8007/current-weather?lat=19.9993&lon=73.7900";

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        console.log('Attempting to fetch weather from:', API_URL);
        
        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add this if you're having CORS issues in development
          // mode: 'cors',
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Weather data received:', data);
        console.log('Data type:', typeof data);
        console.log('Data keys:', data ? Object.keys(data) : 'No data');
        
        // Validate the data structure
        if (data && typeof data === 'object') {
          // Normalize the data to handle different field names
          const normalizedData: WeatherData = {
            temp_C: data.temperature_c || data.temp_C || data.temperature || data.temp,
            wind_km_h: data.wind_kph || data.wind_km_h || data.wind_speed || data.wind,
            rain_mm: data.precip_mm || data.rain_mm || data.precipitation || data.rain,
            humidity_percent: data.humidity || data.humidity_percent || data.humid,
            ...data // Keep any other fields
          };
          
          console.log('Normalized weather data:', normalizedData);
          
          // Check if we have at least some weather data
          if (normalizedData.temp_C || normalizedData.wind_km_h || normalizedData.rain_mm || normalizedData.humidity_percent) {
            setWeather(normalizedData);
            setLoading(false);
          } else {
            console.warn('Weather data missing required fields. Available fields:', Object.keys(data));
            console.warn('Full data structure:', data);
            setError("Weather data format is invalid - missing required fields");
            setLoading(false);
          }
        } else {
          console.warn('Invalid weather data format:', data);
          setError("Weather data format is invalid - not an object");
          setLoading(false);
        }
      } catch (err) {
        console.error('Weather fetch error details:', err);
        
        // More specific error messages
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          setError("Network error: Unable to reach weather server");
        } else if (err instanceof Error) {
          setError(`Error: ${err.message}`);
        } else {
          setError("Failed to fetch weather data");
        }
        
        setLoading(false);
      }
    };

    fetchWeather();
    
    // Optional: Set up periodic refresh every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const WeatherMarqueeContent = () => (
    <div className="weather-marquee-item">
      {weather && (
        <>
          {/* Weather Icons based on conditions */}
          {weather.rain_mm !== undefined && weather.rain_mm > 1 && (
            <div className="weather-item weather-rainy">
              <CloudRain className="weather-icon" size={18} />
              <span className="weather-text">Rainy</span>
            </div>
          )}
          
          {/* Check if temperature is hot */}
          {weather.temp_C && (
            (typeof weather.temp_C === 'string' ? parseInt(weather.temp_C.replace('°', '')) : Number(weather.temp_C)) > 35 && (
              <div className="weather-item weather-hot">
                <Sun className="weather-icon" size={18} />
                <span className="weather-text">Hot</span>
              </div>
            )
          )}

          {/* Temperature */}
          {weather.temp_C && (
            <div className="weather-item weather-temp">
              <Thermometer className="weather-icon" size={18} />
              <span className="weather-text">
                {typeof weather.temp_C === 'string' ? weather.temp_C : `${weather.temp_C}°C`}
              </span>
            </div>
          )}

          {/* Humidity */}
          {weather.humidity_percent && (
            <div className="weather-item weather-humidity">
              <Cloud className="weather-icon" size={18} />
              <span className="weather-text">
                {typeof weather.humidity_percent === 'string' ? weather.humidity_percent : `${weather.humidity_percent}%`}
              </span>
            </div>
          )}

          {/* Wind Speed */}
          {weather.wind_km_h && (
            <div className="weather-item weather-wind">
              <Wind className="weather-icon" size={18} />
              <span className="weather-text">
                {typeof weather.wind_km_h === 'string' ? weather.wind_km_h : `${weather.wind_km_h}`} km/h
              </span>
            </div>
          )}

          {/* Precipitation */}
{weather.rain_mm !== undefined && (
  <div className="weather-item weather-precipitation">
    <Droplet className="weather-icon" size={18} />
    <span className="weather-text">
      {typeof weather.rain_mm === 'string'
        ? parseFloat(weather.rain_mm).toFixed(1)
        : weather.rain_mm.toFixed(1)} mm
    </span>
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
            {loading ? (
              <div className="loading-text">Loading weather...</div>
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