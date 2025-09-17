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


interface ChartPoint {
  date: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  wind: number;
  fullDate: string;
}

const WeatherForecast: React.FC = () => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  const chartData = appState.weatherChartData || [];
  const selectedDay = appState.weatherSelectedDay || null;
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = "weatherChartData";
    // Clear cache to force fresh data fetch
    // const cached = getCached(cacheKey);
    // if (cached) {
    //   setAppState((prev: any) => ({
    //     ...prev,
    //     weatherChartData: cached,
    //     weatherSelectedDay: cached[0],
    //   }));
    //   return;
    // }
          fetch("https://dev-weather.cropeye.ai/forecast?lat=19.355587&lon=75.219727")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Support both legacy array and new { source, data: [...] } shape
        const rawList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

        // Normalize keys and strip units
        const parseNum = (v: any) => {
          if (v === null || v === undefined) return 0;
          if (typeof v === "number") return v;
          if (typeof v === "string") return parseFloat(v.replace(/[^\d.+-]/g, "")) || 0;
          return 0;
        };

        // Build a map by ISO date for dedup and ordering
        const byDate = new Map<string, any>();
        rawList.forEach((d: any) => {
          // Handle date parsing - API returns "2025-09-04" format
          const dateStr = d.date || d.Date;
          const iso = dateStr ? dateStr.split('T')[0] : new Date().toISOString().split("T")[0];
          
          byDate.set(iso, {
            dateISO: iso,
            temperature: parseNum(d.temperature_max),
            humidity: parseNum(d.humidity_max),
            rainfall: parseNum(d.precipitation),
            wind: parseNum(d.wind_speed_max),
          });
        });

        // Generate tomorrow + next 6 days in order (7 days total, starting from tomorrow)
        const days: any[] = [];
        const today = new Date();
        
        for (let i = 1; i <= 7; i++) { // Start from i=1 (tomorrow) instead of i=0 (today)
          const dt = new Date(today);
          dt.setDate(today.getDate() + i);
          const iso = dt.toISOString().split("T")[0];
          const entry = byDate.get(iso) || {
            dateISO: iso,
            temperature: 0,
            humidity: 0,
            rainfall: 0,
            wind: 0,
          };
          
          days.push({
            date: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            temperature: entry.temperature,
            humidity: entry.humidity,
            rainfall: entry.rainfall,
            wind: entry.wind,
            fullDate: entry.dateISO,
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
        // Fallback: synthesize 7 days from tomorrow with zeros
        const days: any[] = [];
        const today = new Date();
        for (let i = 1; i <= 7; i++) { // Start from i=1 (tomorrow) instead of i=0 (today)
          const dt = new Date(today);
          dt.setDate(today.getDate() + i);
          days.push({
            date: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            temperature: 0,
            humidity: 0,
            rainfall: 0,
            wind: 0,
            fullDate: dt.toISOString().split("T")[0],
          });
        }
        setAppState((prev: any) => ({
          ...prev,
          weatherChartData: days,
          weatherSelectedDay: days[0],
        }));
      });
  }, []); // Remove dependencies that cause re-runs

  const currentWeather = selectedDay || chartData[0];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
              Temperature: {Number(data.temperature).toFixed(2)}°C
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Rainfall: {Number(data.rainfall).toFixed(1)} mm
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Wind: {Number(data.wind).toFixed(2)} km/h
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              Humidity: {Number(data.humidity).toFixed(2)}%
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
                  {Number(currentWeather.temperature).toFixed(2)}°C
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
                  {Number(currentWeather.rainfall).toFixed(1)} mm
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
                  {Number(currentWeather.wind).toFixed(2)} km/h
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
                  {Number(currentWeather.humidity).toFixed(2)}%
                </div>
                <div className="text-sm opacity-75">Humidity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">7-Day Forecast (Tomorrow + Next 6 Days)</h3>
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
