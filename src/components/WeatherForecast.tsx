import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CloudRain,
  Wind,
  ThermometerSun,
  Cloud,
  RefreshCw,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { extractNumericValue, testParsing, fetchWeatherForecast } from "../services/weatherForecastService";
import { getFarmerMyProfile } from "../api";


interface WeatherForecastProps {
  lat?: number;
  lon?: number;
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({ 
  lat: propLat, 
  lon: propLon 
}) => {
  const { appState, setAppState, setCached } = useAppContext();
  const chartData = appState.weatherChartData || [];
  const selectedDay = appState.weatherSelectedDay || null;
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [farmerCoordinates, setFarmerCoordinates] = useState<{lat: number, lon: number} | null>(null);
  const [loadingCoordinates, setLoadingCoordinates] = useState(true);
  const [hasFetchedWeather, setHasFetchedWeather] = useState(false);


  // Fetch farmer coordinates from profile - only once
  useEffect(() => {
    const fetchFarmerCoordinates = async () => {
      try {
        setLoadingCoordinates(true);
        console.log("WeatherForecast: Fetching farmer profile for coordinates");
        
        const response = await getFarmerMyProfile();
        const profileData = response.data;
        
        console.log("WeatherForecast: Farmer profile data:", profileData);
        
        // Get coordinates from the first plot
        if (profileData?.plots && profileData.plots.length > 0) {
          const firstPlot = profileData.plots[0];
          if (firstPlot?.coordinates?.location) {
            const coords = {
              lat: firstPlot.coordinates.location.latitude,
              lon: firstPlot.coordinates.location.longitude
            };
            console.log("WeatherForecast: Found farmer coordinates:", coords);
            setFarmerCoordinates(coords);
          } else {
            console.log("WeatherForecast: No coordinates found in first plot");
            setFarmerCoordinates(null);
          }
        } else {
          console.log("WeatherForecast: No plots found in farmer profile");
          setFarmerCoordinates(null);
        }
      } catch (error) {
        console.error("WeatherForecast: Error fetching farmer coordinates:", error);
        setFarmerCoordinates(null);
      } finally {
        setLoadingCoordinates(false);
      }
    };

    // Only fetch if we don't have coordinates yet
    if (!farmerCoordinates && loadingCoordinates) {
      fetchFarmerCoordinates();
    }
  }, []); // Empty dependency array - only run once on mount

  // Determine which coordinates to use
  const lat = propLat || farmerCoordinates?.lat || 20.014040817830804;
  const lon = propLon || farmerCoordinates?.lon || 73.66620106848734;

  useEffect(() => {
    // Only fetch weather data when coordinates are available and not loading
    if (loadingCoordinates) {
      console.log("WeatherForecast: Waiting for coordinates to load...");
      return;
    }

    // Only fetch once
    if (hasFetchedWeather) {
      console.log("WeatherForecast: Weather data already fetched, skipping...");
      return;
    }

    const cacheKey = `weatherChartData_${lat}_${lon}`; // Include coordinates in cache key
    
    // Test parsing function
    testParsing();
    
    // Clear cache to force fresh data fetch
    localStorage.removeItem(cacheKey);
    
    // const cached = getCached(cacheKey);
    // if (cached) {
    //   setAppState((prev: any) => ({
    //     ...prev,
    //     weatherChartData: cached,
    //     weatherSelectedDay: cached[0],
    //   }));
    //   return;
    // }
        
        console.log(`WeatherForecast: Fetching weather for coordinates: lat=${lat}, lon=${lon}`);
        console.log(`WeatherForecast: Using ${farmerCoordinates ? 'farmer' : 'default'} coordinates`);
        
        // Mark as fetching to prevent multiple calls
        setHasFetchedWeather(true);
        
        fetchWeatherForecast(lat, lon)
      .then((data) => {
        console.log("WeatherForecast: Received data:", data);
        console.log("WeatherForecast: Raw API response structure:", {
          isArray: Array.isArray(data),
          hasData: !!data?.data,
          dataKeys: data ? Object.keys(data) : [],
          firstItem: Array.isArray(data) ? data[0] : data?.data?.[0]
        });
        // Support both legacy array and new { source, data: [...] } shape
        const rawList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        // Normalize keys and strip units using service function
        const parseNum = (v: any) => {
          if (v === null || v === undefined) return 0;
          if (typeof v === "number") return v;
          if (typeof v === "string") {
            return extractNumericValue(v);
          }
          return 0;
        };

        // Process API data directly - no need for date mapping

        // Generate next 7 days starting from tomorrow (exclude today)
        const days: any[] = [];
        console.log("WeatherForecast: Generating next 7 days starting from tomorrow");
        
        // Create a map of API data by date for easy lookup
        const apiDataByDate = new Map<string, any>();
        rawList.forEach((d: any) => {
          const dateStr = d.date || d.Date;
          const iso = dateStr ? dateStr.split('T')[0] : new Date().toISOString().split("T")[0];
          apiDataByDate.set(iso, d);
        });
        
        // Generate next 7 days starting from tomorrow
        const today = new Date();
        for (let i = 1; i <= 7; i++) { // Start from i=1 (tomorrow) instead of i=0 (today)
          const futureDate = new Date(today);
          futureDate.setDate(today.getDate() + i);
          const iso = futureDate.toISOString().split("T")[0];
          
          // Get API data for this date, or use default values if not available
          const apiData = apiDataByDate.get(iso) || {};
          
          console.log(`WeatherForecast: Processing day ${i} (${iso}):`, {
            temperature_max: apiData.temperature_max,
            humidity_max: apiData.humidity_max,
            precipitation: apiData.precipitation,
            wind_speed_max: apiData.wind_speed_max
          });
          
          console.log(`WeatherForecast: Parsed values for day ${i}:`, {
            temperature: parseNum(apiData.temperature_max),
            humidity: parseNum(apiData.humidity_max),
            rainfall: parseNum(apiData.precipitation),
            wind: parseNum(apiData.wind_speed_max)
          });
          
          days.push({
            date: futureDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            temperature: parseNum(apiData.temperature_max),
            humidity: parseNum(apiData.humidity_max),
            rainfall: parseNum(apiData.precipitation),
            wind: parseNum(apiData.wind_speed_max),
            fullDate: iso,
          });
        }

        console.log("WeatherForecast: Processed 7 days:", days);
        console.log("WeatherForecast: First day data:", days[0]);
        console.log("WeatherForecast: API raw data:", rawList);
        if (days.length > 0) {
          console.log("WeatherForecast: Parsed values for first day:", {
            temperature: days[0].temperature,
            humidity: days[0].humidity,
            rainfall: days[0].rainfall,
            wind: days[0].wind
          });
        }
        setAppState((prev: any) => ({
          ...prev,
          weatherChartData: days,
          weatherSelectedDay: days[0],
        }));
        setCached(cacheKey, days);
      })
        .catch((error) => {
          console.error("WeatherForecast: Fetch error:", error);
          // Fallback: generate next 7 days with zero values
          const days: any[] = [];
          const today = new Date();
          
          for (let i = 1; i <= 7; i++) { // Start from i=1 (tomorrow)
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            const iso = futureDate.toISOString().split("T")[0];
            
            days.push({
              date: futureDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
              temperature: 0,
              humidity: 0,
              rainfall: 0,
              wind: 0,
              fullDate: iso,
            });
          }
          
          setAppState((prev: any) => ({
            ...prev,
            weatherChartData: days,
            weatherSelectedDay: days[0],
          }));
        });
  }, [loadingCoordinates, hasFetchedWeather]); // Only depend on loading state and fetch flag

  const currentWeather = selectedDay || chartData[0];
  
  // Debug: Log current weather data being displayed (can be removed in production)
  // console.log("WeatherForecast: Current weather data being displayed:", currentWeather);

  // Show loading state while fetching coordinates
  if (loadingCoordinates) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading farmer location...</span>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
              Temperature: {(Number(data.temperature) || 0).toFixed(2)}°C
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Rainfall: {(Number(data.rainfall) || 0).toFixed(1)} mm
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Wind: {(Number(data.wind) || 0).toFixed(2)} km/h
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              Humidity: {(Number(data.humidity) || 0).toFixed(2)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (data: any) => {
    if (data && data.activePayload) {
      setAppState((prev: any) => ({
        ...prev,
        weatherSelectedDay: data.activePayload[0].payload,
      }));
    }
  };

  if (!chartData.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div
            className={`p-8 min-h-[120px] rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl text-lg 
              ${
                selectedMetric === "temperature"
                  ? "bg-amber-600 ring-2 ring-amber-400 text-white"
                  : "bg-white text-gray-700 hover:bg-amber-50"
              }`}
            onClick={() =>
              setSelectedMetric(
                selectedMetric === "temperature" ? null : "temperature"
              )
            }
          >
            <div className="flex items-center space-x-3">
              <ThermometerSun className="w-8 h-8" />
              <div>
                <div
                  className={`font-bold text-4xl ${
                    selectedMetric === "temperature" ? "text-white" : ""
                  }`}
                >
                  {(Number(currentWeather.temperature) || 0).toFixed(2)}°C
                </div>
                <div className="text-sm opacity-75">Temperature</div>
              </div>
            </div>
          </div>
          <div
            className={`p-8 min-h-[120px] rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl text-lg 
              ${
                selectedMetric === "rainfall"
                  ? "bg-blue-700 ring-2 ring-blue-400 text-white"
                  : "bg-white text-gray-700 hover:bg-blue-50"
              }`}
            onClick={() =>
              setSelectedMetric(
                selectedMetric === "rainfall" ? null : "rainfall"
              )
            }
          >
            <div className="flex items-center space-x-3">
              <CloudRain className="w-8 h-8" />
              <div>
                <div
                  className={`font-bold text-4xl ${
                    selectedMetric === "rainfall" ? "text-white" : ""
                  }`}
                >
                  {(Number(currentWeather.rainfall) || 0).toFixed(1)} mm
                </div>
                <div className="text-sm opacity-75">Rainfall</div>
              </div>
            </div>
          </div>
          <div
            className={`p-8 min-h-[120px] rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl text-lg 
              ${
                selectedMetric === "wind"
                  ? "bg-green-700 ring-2 ring-green-400 text-white"
                  : "bg-white text-gray-700 hover:bg-green-50"
              }`}
            onClick={() =>
              setSelectedMetric(selectedMetric === "wind" ? null : "wind")
            }
          >
            <div className="flex items-center space-x-3">
              <Wind className="w-8 h-8" />
              <div>
                <div
                  className={`font-bold text-4xl ${
                    selectedMetric === "wind" ? "text-white" : ""
                  }`}
                >
                  {(Number(currentWeather.wind) || 0).toFixed(2)} km/h
                </div>
                <div className="text-sm opacity-75">Wind Speed</div>
              </div>
            </div>
          </div>
          <div
            className={`p-8 min-h-[120px] rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl text-lg 
              ${
                selectedMetric === "humidity"
                  ? "bg-purple-800 ring-2 ring-purple-400 text-white"
                  : "bg-white text-gray-700 hover:bg-purple-50"
              }`}
            onClick={() =>
              setSelectedMetric(
                selectedMetric === "humidity" ? null : "humidity"
              )
            }
          >
            <div className="flex items-center space-x-3">
              <Cloud className="w-8 h-8" />
              <div>
                <div
                  className={`font-bold text-4xl ${
                    selectedMetric === "humidity" ? "text-white" : ""
                  }`}
                >
                  {(Number(currentWeather.humidity) || 0).toFixed(2)}%
                </div>
                <div className="text-sm opacity-75">Humidity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">7-Day Forecast</h3>
            <div className="text-sm text-gray-500">
              Click on any day to view details
            </div>
          </div>

          <div className="w-full h-[320px] md:h-[400px] relative">
            {/* Refresh Icon */}
            <button
              className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow hover:bg-gray-100 transition w-10 h-10 flex items-center justify-center"
              aria-label="Show all metrics"
              onClick={() => setSelectedMetric(null)}
              title="Show all metrics"
              style={{ width: "40px", height: "40px" }}
            >
              <RefreshCw className="w-5 h-5 text-blue-500" />
            </button>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={handleChartClick}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Temperature Bars */}
                <Bar
                  dataKey="temperature"
                  fill="#f59e0b"
                  name="Temperature (°C)"
                  barSize={40}
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer hover:opacity-80 transition-all duration-300"
                  opacity={
                    selectedMetric && selectedMetric !== "temperature" ? 0.2 : 1
                  }
                />
                {/* Rainfall Bars */}
                <Bar
                  dataKey="rainfall"
                  fill="#3b82f6"
                  name="Rainfall (mm)"
                  barSize={25}
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer hover:opacity-80 transition-all duration-300"
                  opacity={
                    selectedMetric && selectedMetric !== "rainfall" ? 0.2 : 1
                  }
                />
                {/* Wind Line */}
                <Line
                  type="monotone"
                  dataKey="wind"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name="Wind (km/h)"
                  opacity={
                    selectedMetric && selectedMetric !== "wind" ? 0.2 : 1
                  }
                />
                {/* Humidity Line */}
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name="Humidity (%)"
                  opacity={
                    selectedMetric && selectedMetric !== "humidity" ? 0.2 : 1
                  }
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherForecast;
