import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Cloud,
  Thermometer,
  Wind,
  Droplet,
  MapPin,
  Navigation,
} from "lucide-react";
import cropeyecLogo from "./icons/Cropeye-new.png";
import "./Header.css";
import {
  fetchCurrentWeather,
  formatTemperature,
  formatWindSpeed,
  formatHumidity,
  formatPrecipitation,
  getWeatherIcon,
  getWeatherCondition,
  type WeatherData as WeatherServiceData,
} from "../services/weatherService";
import { useAppContext } from "../context/AppContext";
import { getUserRole, getUserData } from "../utils/auth";
import { useFarmerProfile } from "../hooks/useFarmerProfile";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  isSidebarOpen,
}) => {
  const [weather, setWeather] = useState<WeatherServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompt" | "loading"
  >("prompt");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const { getCached, setCached } = useAppContext();

  // Conditionally use farmer profile hook only for farmers
  const userRole = getUserRole();
  const farmerProfile = useFarmerProfile();
  const { profile: farmerProfileData, loading: farmerProfileLoading } =
    farmerProfile;

  // Get user's current location using geolocation API
  const getUserCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  // Request location permission and get coordinates
  const requestLocationPermission = async () => {
    try {
      setLocationPermission("loading");
      const location = await getUserCurrentLocation();
      setUserLocation(location);
      setLocationPermission("granted");
      setShowLocationPrompt(false);
      console.log("📍 User location obtained:", location);
    } catch (error) {
      console.error("📍 Location access denied or failed:", error);
      setLocationPermission("denied");
      setShowLocationPrompt(false);
    }
  };

  // Get location based on user role
  const getLocationForUser = async (): Promise<{
    latitude: number;
    longitude: number;
    source: string;
  }> => {
    console.log("🌤️ ===== LOCATION DEBUG START =====");
    console.log("🌤️ User role:", userRole);
    console.log("🌤️ Farmer profile data exists:", !!farmerProfileData);
    console.log("🌤️ Farmer profile loading:", farmerProfileLoading);
    console.log("🌤️ User location exists:", !!userLocation);
    console.log("🌤️ Location permission:", locationPermission);

    // For farmers, prioritize farm location over current location
    if (userRole === "farmer") {
      console.log("🌤️ Processing FARMER location logic...");

      // First try farm location
      if (
        farmerProfileData &&
        farmerProfileData.plots &&
        farmerProfileData.plots.length > 0
      ) {
        console.log("🌤️ Farmer has plots:", farmerProfileData.plots.length);
        const firstPlot = farmerProfileData.plots[0];
        console.log("🌤️ First plot data:", firstPlot);
        const coordinates = firstPlot.coordinates?.location?.coordinates;
        console.log("🌤️ Plot coordinates:", coordinates);

        if (coordinates && coordinates.length === 2) {
          const [longitude, latitude] = coordinates;
          console.log("🌤️ ✅ USING FARMER FARM LOCATION:", {
            latitude,
            longitude,
          });
          console.log("🌤️ ===== LOCATION DEBUG END =====");
          return { latitude, longitude, source: "farm" };
        } else {
          console.log("🌤️ ❌ Invalid farm coordinates:", coordinates);
        }
      } else {
        console.log("🌤️ ❌ No farmer profile data or plots available");
        console.log("🌤️ Farmer profile data:", farmerProfileData);
      }

      // If no farm location, try current location
      if (userLocation) {
        console.log(
          "🌤️ ⚠️ USING FARMER CURRENT LOCATION (no farm location available):",
          userLocation
        );
        console.log("🌤️ ===== LOCATION DEBUG END =====");
        return { ...userLocation, source: "current" };
      }

      // If no location available, show prompt
      if (locationPermission === "prompt") {
        console.log("🌤️ ⚠️ No location available, showing prompt");
        setShowLocationPrompt(true);
        throw new Error("Location permission required");
      }

      // Fallback to default location
      console.log("🌤️ ⚠️ USING DEFAULT LOCATION FOR FARMER (Pune, India)");
      console.log("🌤️ ===== LOCATION DEBUG END =====");
      return { latitude: 18.5204, longitude: 73.8567, source: "default" };
    }

    // For non-farmers (manager, field officer, owner), use current location
    console.log("🌤️ Processing NON-FARMER location logic...");
    console.log("🌤️ User role for non-farmer:", userRole);

    if (userLocation) {
      console.log("🌤️ ✅ USING USER CURRENT LOCATION:", userLocation);
      console.log("🌤️ ===== LOCATION DEBUG END =====");
      return { ...userLocation, source: "current" };
    }

    // If no location available, show prompt
    if (locationPermission === "prompt") {
      console.log("🌤️ ⚠️ No location available, showing prompt");
      setShowLocationPrompt(true);
      throw new Error("Location permission required");
    }

    // Fallback to default location (Pune, India)
    console.log("🌤️ ⚠️ USING DEFAULT LOCATION (Pune, India)");
    console.log("🌤️ Default coordinates: 18.5204, 73.8567");
    console.log("🌤️ ===== LOCATION DEBUG END =====");
    return { latitude: 18.5204, longitude: 73.8567, source: "default" };
  };

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = () => {
      const currentUserData = getUserData();
      setUserData(currentUserData);
      console.log("🌤️ User data loaded:", currentUserData);
    };

    loadUserData();
  }, []);

  // Debug farmer profile data
  useEffect(() => {
    if (userRole === "farmer") {
      console.log("🌤️ Farmer profile data:", farmerProfileData);
      console.log("🌤️ Farmer profile loading:", farmerProfileLoading);
      if (farmerProfileData && farmerProfileData.plots) {
        console.log("🌤️ Farmer plots:", farmerProfileData.plots);
        if (farmerProfileData.plots.length > 0) {
          console.log(
            "🌤️ First plot coordinates:",
            farmerProfileData.plots[0].coordinates
          );
        }
      }
    }
  }, [farmerProfileData, farmerProfileLoading, userRole]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);

        // For farmers, wait for profile to load
        if (userRole === "farmer" && farmerProfileLoading) {
          console.log("🌤️ Waiting for farmer profile to load...");
          return;
        }

        // Get location based on user role
        const locationData = await getLocationForUser();
        const { latitude, longitude, source } = locationData;

        console.log("🌤️ ===== WEATHER FETCH DEBUG =====");
        console.log("🌤️ Location source:", source);
        console.log("🌤️ Coordinates being used:", { latitude, longitude });
        console.log("🌤️ Fetching weather for location:", {
          latitude,
          longitude,
          source,
        });

        // Check cache first
        const cacheKey = `weather_${latitude}_${longitude}`;
        const cached = getCached(cacheKey);
        console.log("🌤️ Cache key:", cacheKey);
        console.log("🌤️ Cached data exists:", !!cached);
        if (cached) {
          console.log("🌤️ ===== USING CACHED WEATHER DATA =====");
          console.log("🌤️ Cached weather data:", cached.data);
          console.log("🌤️ Cache timestamp:", new Date(cached.timestamp));
          console.log(
            "🌤️ Expected for field officer: lat=19.95, lon=73.833, temp=26.7°C, humidity=75%, wind=12.2km/h, precip=1.91mm"
          );
          console.log(
            "🌤️ Cached actual: lat=" +
              cached.data.latitude +
              ", lon=" +
              cached.data.longitude +
              ", temp=" +
              cached.data.temperature_c +
              "°C, humidity=" +
              cached.data.humidity +
              "%, wind=" +
              cached.data.wind_kph +
              "km/h, precip=" +
              cached.data.precip_mm +
              "mm"
          );
          console.log("🌤️ ===== CACHED DATA END =====");
          setWeather(cached.data);
          setError(null);
          setLoading(false);
          return;
        }

        // Fetch weather data using the new service
        const weatherData = await fetchCurrentWeather(latitude, longitude);
        console.log("🌤️ ===== WEATHER DATA RECEIVED =====");
        console.log("🌤️ Weather data received:", weatherData);
        console.log(
          "🌤️ Expected for field officer: lat=19.95, lon=73.833, temp=26.7°C, humidity=75%, wind=12.2km/h, precip=1.91mm"
        );
        console.log(
          "🌤️ Actual received: lat=" +
            weatherData.latitude +
            ", lon=" +
            weatherData.longitude +
            ", temp=" +
            weatherData.temperature_c +
            "°C, humidity=" +
            weatherData.humidity +
            "%, wind=" +
            weatherData.wind_kph +
            "km/h, precip=" +
            weatherData.precip_mm +
            "mm"
        );
        console.log("🌤️ ===== WEATHER DATA END =====");

        setWeather(weatherData);
        setError(null);
        setLoading(false);

        // Cache the data
        const payload = { data: weatherData, timestamp: Date.now() };
        setCached(cacheKey, payload);
      } catch (err) {
        console.error("🌤️ Weather fetch error:", err);

        if (err instanceof Error) {
          if (err.message === "Location permission required") {
            setError("Location access required for weather data");
          } else {
            setError(err.message);
          }
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
  }, [
    userData,
    userLocation,
    locationPermission,
    farmerProfileData,
    farmerProfileLoading,
  ]);

  const WeatherMarqueeContent = () => {
    // Determine location source text based on user role and data
    const getLocationText = () => {
      if (
        userRole === "farmer" &&
        farmerProfileData &&
        farmerProfileData.plots &&
        farmerProfileData.plots.length > 0
      ) {
        return "Farm Location";
      }
      return "Current Location";
    };

    return (
      <div className="weather-marquee-item">
        {weather && (
          <>
            {/* Location Info */}
            <div className="weather-item weather-location ">
              <MapPin className="weather-icon" size={18} />
              <span className="weather-text">{getLocationText()}</span>
            </div>

            {/* Weather Icon and Condition */}
            <div className="weather-item weather-condition bg-yellow-200 text-blue-600">
              <span className="weather-icon-text text-black-600">
                {getWeatherIcon(
                  weather.temperature_c,
                  weather.humidity,
                  weather.precip_mm
                )}
              </span>
              <span className="weather-text">
                {getWeatherCondition(
                  weather.temperature_c,
                  weather.humidity,
                  weather.precip_mm
                )}
              </span>
            </div>

            {/* Temperature */}
            <div className="weather-item weather-temp ">
              <Thermometer className="weather-icon" size={18} />
              <span className="weather-text">
                {formatTemperature(weather.temperature_c)}
              </span>
            </div>

            {/* Humidity */}
            <div className="weather-item weather-humidity">
              <Cloud className="weather-icon" size={18} />
              <span className="weather-text">
                {formatHumidity(weather.humidity)}
              </span>
            </div>

            {/* Wind Speed */}
            <div className="weather-item weather-wind">
              <Wind className="weather-icon" size={18} />
              <span className="weather-text">
                {formatWindSpeed(weather.wind_kph)}
              </span>
            </div>

            {/* Precipitation */}
            {weather.precip_mm > 0 && (
              <div className="weather-item weather-precipitation">
                <Droplet className="weather-icon" size={18} />
                <span className="weather-text">
                  {formatPrecipitation(weather.precip_mm)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Location Permission Prompt Component
  const LocationPermissionPrompt = () => (
    <div className="location-prompt-overlay">
      <div className="location-prompt-modal">
        <div className="location-prompt-header">
          <Navigation className="location-prompt-icon" size={24} />
          <h3>Location Access Required</h3>
        </div>
        <div className="location-prompt-content">
          <p>
            To show weather data for your current location, we need access to
            your device's location.
          </p>
          <p>
            This helps us provide accurate weather information for your area.
          </p>
        </div>
        <div className="location-prompt-actions">
          <button
            onClick={requestLocationPermission}
            disabled={locationPermission === "loading"}
            className="location-prompt-allow-btn"
          >
            {locationPermission === "loading"
              ? "Getting Location..."
              : "Allow Location"}
          </button>
          <button
            onClick={() => {
              setShowLocationPrompt(false);
              setLocationPermission("denied");
            }}
            className="location-prompt-deny-btn"
          >
            Use Default Location
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
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
                <div className="loading-text">
                  {userRole === "farmer" && farmerProfileLoading
                    ? "Loading farmer profile..."
                    : "Loading weather data..."}
                </div>
              ) : error ? (
                <div className="error-text">
                  {error}
                  {error === "Location access required for weather data" && (
                    <button
                      onClick={() => setShowLocationPrompt(true)}
                      className="location-request-btn"
                    >
                      <MapPin size={16} />
                      Enable Location
                    </button>
                  )}
                </div>
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

      {/* Location Permission Prompt */}
      {showLocationPrompt && <LocationPermissionPrompt />}
    </>
  );
};

export default Header;
