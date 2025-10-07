import React, { useState, useEffect, useRef } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  // ReferenceLine,
  ReferenceArea,
  // Scatter,
  ComposedChart,
  // BarChart,
  // Bar,
} from "recharts";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import {
  Loader2,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Droplets,
  Thermometer,
  Activity,
  Target,
  Leaf,
  BarChart3,
  // PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Users,
  MapPin,
  Beaker,
  // Crop,
  // Zap,
  // Clock,
  // Gauge,
  // Filter,
  // RefreshCw,
  Maximize2,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { getCache, setCache } from "../utils/cache";
import api from "../api"; // Import the authenticated api instance
import CommonSpinner from "./CommanSpinner";

// Constants (same as FarmerDashboard)
const BASE_URL = "https://dev-events.cropeye.ai";
const OPTIMAL_BIOMASS = 150;
const SOIL_API_URL = "https://dev-soil.cropeye.ai";
const SOIL_DATE = "2025-10-03";

// const OTHER_FARMERS_RECOVERY = {
//   regional_average: 78.5,
//   top_quartile: 85.2,
//   bottom_quartile: 65.8,
//   similar_farms: 76.3,
// };

// Type definitions (keeping the same as original)
interface LineChartData {
  date: string;
  growth: number;
  stress: number;
  water: number;
  moisture: number;
  stressLevel?: number | null;
  isStressEvent?: boolean;
  stressEventData?: any;
}

interface VisibleLines {
  growth: boolean;
  stress: boolean;
  water: boolean;
  moisture: boolean;
}

interface LineStyles {
  [key: string]: {
    color: string;
    label: string;
    icon: React.ComponentType<any>;
  };
}

interface StressEvent {
  from_date: string;
  to_date: string;
  stress: number;
}

// interface CustomStressDotProps {
//   cx?: number;
//   cy?: number;
//   payload?: any;
// }

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface Metrics {
  brix: number | null;
  recovery: number | null;
  area: number | null;
  biomass: number | null;
  stressCount: number | null;
  irrigationEvents: number | null;
  expectedYield: number | null;
  daysToHarvest: number | null;
  growthStage: string | null;
  soilPH: number | null;
  organicCarbonDensity: number | null;
  actualYield: number | null;
  cnRatio: number | null;
}

interface PieChartWithNeedleProps {
  value: number;
  max: number;
  width?: number;
  height?: number;
  title?: string;
  unit?: string;
}

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";

const ManagerFarmDash: React.FC = () => {
  // const center: [number, number] = [17.5789, 75.053]; // Unused - using mapCenter state instead
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  // Farmer and Plot selection state
  const [selectedFieldOfficerId, setSelectedFieldOfficerId] =
    useState<string>("");
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [selectedPlotId, setSelectedPlotId] = useState<string>(""); // Start empty, will be set based on farmer selection
  const [fieldOfficers, setFieldOfficers] = useState<any[]>([]);
  const [farmersForSelectedOfficer, setFarmersForSelectedOfficer] = useState<
    any[]
  >([]);
  const [plots, setPlots] = useState<string[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const lineStyles: LineStyles = {
    growth: { color: "#16a34a", label: "Growth Index", icon: TrendingUp },
    stress: {
      color: "#dc2626",
      label: "Crop Stress Index",
      icon: AlertTriangle,
    },
    water: { color: "#3b82f6", label: "Water Uptake Index", icon: Droplets },
    moisture: {
      color: "#92400e",
      label: "Soil Moisture Index",
      icon: Thermometer,
    },
  };

  const [lineChartData, setLineChartData] = useState<LineChartData[]>([]);
  const [plotCoordinates, setPlotCoordinates] = useState<[number, number][]>(
    []
  );
  const [visibleLines, setVisibleLines] = useState<VisibleLines>({
    growth: true,
    stress: true,
    water: true,
    moisture: true,
  });

  const [metrics, setMetrics] = useState<Metrics>({
    brix: null,
    recovery: null,
    area: null,
    biomass: null,
    stressCount: null,
    irrigationEvents: null,
    expectedYield: null,
    daysToHarvest: null,
    growthStage: null,
    soilPH: null,
    organicCarbonDensity: null,
    actualYield: null,
    cnRatio: null,
  });

  const [stressEvents, setStressEvents] = useState<StressEvent[]>([]);
  const [showStressEvents] = useState<boolean>(false);
  const [ndreStressEvents] = useState<StressEvent[]>([]);
  const [showNDREEvents] = useState<boolean>(false);
  const [combinedChartData, setCombinedChartData] = useState<LineChartData[]>(
    []
  );
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [aggregatedData, setAggregatedData] = useState<LineChartData[]>([]);
  const [mapKey, setMapKey] = useState<number>(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    17.5789, 75.053,
  ]);
  const [plotCoordinatesCache, setPlotCoordinatesCache] = useState<
    Map<string, [number, number][]>
  >(new Map());

  // Fetch farmers list on component mount
  useEffect(() => {
    fetchManagerData();
  }, []);

  // NEW: Function to set plot coordinates from existing state
  const setPlotCoordinatesFromState = (plotId: string): void => {
    console.log("Fetching coordinates for plot:", plotId);

    // Find the selected farmer and their plot
    const farmer = farmersForSelectedOfficer.find(
      (f) => String(f.id) === selectedFarmerId
    );
    const plot = farmer?.plots?.find((p: any) => p.fastapi_plot_id === plotId);

    if (plot && plot.boundary?.coordinates) {
      const geom = plot.boundary.coordinates[0];
      if (geom) {
        // The API gives [lng, lat], Leaflet needs [lat, lng]
        const coords = geom.map(([lng, lat]: [number, number]) => [lat, lng]);
        console.log("Received coordinates from state:", coords);
        setPlotCoordinates(coords);

        // Calculate and set map center
        const center = calculateCenter(coords);
        console.log("Calculated map center:", center);
        setMapCenter(center);
        setMapKey((prev) => prev + 1); // Force map re-render
      } else {
        console.log("No geometry found in plot boundary");
        setPlotCoordinates([]);
      }
    } else {
      console.error("Could not find plot or boundary for plotId:", plotId);
      setPlotCoordinates([]);
    }
  };

  // Update farmers dropdown when field officer changes
  useEffect(() => {
    if (selectedFieldOfficerId) {
      const officer = fieldOfficers.find(
        (fo) => String(fo.id) === selectedFieldOfficerId
      );
      const farmersList = officer ? officer.farmers : [];
      setFarmersForSelectedOfficer(farmersList);
      if (farmersList.length > 0) {
        setSelectedFarmerId(String(farmersList[0].id));
      } else {
        setSelectedFarmerId("");
      }
    }
  }, [selectedFieldOfficerId, fieldOfficers]);

  // Fetch plots when farmer is selected
  useEffect(() => {
    if (selectedFarmerId) {
      console.log("🔍 Finding farmer with ID:", selectedFarmerId);

      const selectedFarmer = farmersForSelectedOfficer.find(
        (f) =>
          String(f.id || f.farmer_id || f.farmerId) === String(selectedFarmerId)
      );

      if (selectedFarmer) {
        console.log("✅ Found selected farmer:", selectedFarmer);

        // Extract fastapi_plot_id from plots array
        const farmerPlots = selectedFarmer.plots || [];
        const plotIds = farmerPlots.map((plot: any) => plot.fastapi_plot_id);

        console.log("📍 Farmer plots data:", {
          plotsArray: farmerPlots,
          extractedPlotIds: plotIds,
          plotsCount: plotIds.length,
        });

        setPlots(plotIds);

        // Auto-select first plot if available
        if (plotIds.length > 0) {
          const firstPlotId = plotIds[0];
          console.log("✅ Auto-selecting first plot:", firstPlotId);
          setSelectedPlotId(firstPlotId);
        } else {
          console.warn("⚠️ No plots found for this farmer");
          setSelectedPlotId("");
        }
      } else {
        console.warn("⚠️ Farmer not found with ID:", selectedFarmerId);
        setPlots([]);
        setSelectedPlotId("");
      }
    } else {
      console.log("ℹ️ No farmer selected");
      setPlots([]);
      setSelectedPlotId("");
    }
  }, [selectedFarmerId, farmersForSelectedOfficer]);

  useEffect(() => {
    if (selectedPlotId) {
      fetchAllData();
      setPlotCoordinatesFromState(selectedPlotId); // This will now work
    }
  }, [selectedPlotId]);

  useEffect(() => {
    if (lineChartData.length > 0) {
      const aggregated = aggregateDataByPeriod(lineChartData, timePeriod);
      setAggregatedData(aggregated);
    }
  }, [lineChartData, timePeriod]);

  useEffect(() => {
    if (lineChartData.length > 0) {
      const combined = lineChartData.map((point) => {
        const stressEvent = showNDREEvents
          ? ndreStressEvents.find((event) => {
              const eventStart = new Date(event.from_date);
              const eventEnd = new Date(event.to_date);
              const pointDate = new Date(point.date);
              return pointDate >= eventStart && pointDate <= eventEnd;
            })
          : null;

        return {
          ...point,
          stressLevel: stressEvent ? stressEvent.stress : null,
          isStressEvent: !!stressEvent,
          stressEventData: stressEvent,
        };
      });
      setCombinedChartData(combined);
    }
  }, [lineChartData, ndreStressEvents, showNDREEvents]);

  // Fetch all data for selected plot (same as FarmerDashboard)
  const fetchAllData = async (): Promise<void> => {
    if (!selectedPlotId) return;

    setLoadingData(true);
    try {
      // --- Consolidated API Call ---
      const today = new Date().toISOString().slice(0, 10);
      const agroStatsCacheKey = `agroStats_${today}`;
      let allPlotsData = getCache(agroStatsCacheKey);
      if (!allPlotsData) {
        const agroStatsRes = await axios.get(
          `https://dev-soil.cropeye.ai/plots/agroStats?end_date=${today}`
        );
        allPlotsData = agroStatsRes.data;
        setCache(agroStatsCacheKey, allPlotsData);
      }

      // Find the data for the current plot from the bulk response, handling quoted keys
      const quotedPlotId = `"${selectedPlotId.replace("_", '"_"')}"`;
      const currentPlotData = allPlotsData
        ? allPlotsData[selectedPlotId] || allPlotsData[quotedPlotId]
        : null;

      // Fetch data that is not in the agroStats endpoint
      const [rawIndices, stressData, irrigationData] = await Promise.all([
        axios.get(`${BASE_URL}/plots/${selectedPlotId}/indices`).then((res) =>
          res.data.map((item: any) => ({
            date: new Date(item.date).toISOString().split("T")[0],
            growth: item.NDVI,
            stress: item.NDMI,
            water: item.NDWI,
            moisture: item.NDRE,
          }))
        ),
        axios
          .get(
            `${BASE_URL}/plots/${selectedPlotId}/stress?index_type=NDRE&threshold=0.15`
          )
          .then((res) => res.data),
        axios
          .get(
            `${BASE_URL}/plots/${selectedPlotId}/irrigation?threshold_ndmi=0.05&threshold_ndwi=0.05&min_days_between_events=10`
          )
          .then((res) => res.data),
      ]);

      setLineChartData(rawIndices);
      setStressEvents(stressData?.events ?? []);

      setMetrics({
        brix: currentPlotData?.brix_sugar?.brix?.min ?? null,
        recovery: currentPlotData?.brix_sugar?.recovery?.min ?? null,
        area: currentPlotData?.area_acres ?? null,
        biomass: currentPlotData?.biomass?.mean ?? null,
        stressCount: stressData?.total_events ?? 0,
        irrigationEvents: irrigationData?.total_events ?? null,
        expectedYield: currentPlotData?.brix_sugar?.sugar_yield?.min ?? null,
        daysToHarvest: currentPlotData?.days_to_harvest ?? null,
        growthStage: currentPlotData?.Sugarcane_Status ?? null,
        soilPH: currentPlotData?.soil?.phh2o ?? null,
        organicCarbonDensity:
          currentPlotData?.soil?.organic_carbon_stock != null
            ? parseFloat(currentPlotData.soil.organic_carbon_stock.toFixed(2))
            : null,
        actualYield: currentPlotData?.brix_sugar?.sugar_yield?.min ?? null,
        cnRatio: null, // This was from the old /analyze call
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch farmers from API - using authenticated endpoint
  const fetchManagerData = async (): Promise<void> => {
    setLoadingFarmers(true);
    try {
      console.log("=".repeat(60));
      console.log(
        "🔄 ManagerFarmDash: Fetching field officers and their farmers..."
      );
      console.log(
        "📍 Endpoint: https://cropeye-server-1.onrender.com/api/users/my-field-officers/"
      );

      // Use authenticated API call from api.ts
      const response = await api.get(
        "https://cropeye-server-1.onrender.com/api/users/my-field-officers/"
      );
      const responseData = response.data;
      // Extract the array of field officers from the response object
      const officersData = responseData.field_officers || [];

      console.log("=".repeat(60));
      console.log("✅ ManagerFarmDash: Raw API response:", responseData);
      console.log(
        "✅ ManagerFarmDash: Extracted field officers array:",
        officersData
      );
      setFieldOfficers(officersData);

      // Auto-select first field officer if available
      if (officersData.length > 0) {
        setSelectedFieldOfficerId(String(officersData[0].id));
      } else {
        console.warn(
          "⚠️ ManagerFarmDash: No field officers found for this manager"
        );
      }
    } catch (error: any) {
      console.error("❌ ManagerFarmDash: Error fetching manager data:", error);
      console.error("Error details:", error.response?.data);

      // Show user-friendly error message
      if (error.response?.status === 401) {
        console.error("Authentication error - please login again");
      } else if (error.response?.status === 403) {
        console.error("Access denied - insufficient permissions");
      }
    } finally {
      setLoadingFarmers(false);
    }
  };

  // Fetch plots from API - No longer needed, plots come from farmers data
  // const fetchPlots = async (): Promise<void> => {
  //   setLoadingPlots(true);
  //   try {
  //     const response = await axios.get(`${BASE_URL}/plots`);
  //     setPlots(response.data);
  //   } catch (error) {
  //     console.error("Error fetching plots:", error);
  //   } finally {
  //     setLoadingPlots(false);
  //   }
  // };

  // Fetch plot coordinates immediately when plot is selected
  const fetchPlotCoordinates = async (plotId: string): Promise<void> => {
    console.log("Fetching coordinates for plot:", plotId);

    // Check cache first
    if (plotCoordinatesCache.has(plotId)) {
      const cachedCoords = plotCoordinatesCache.get(plotId);
      if (cachedCoords && cachedCoords.length > 0) {
        console.log("Using cached coordinates for plot:", plotId);
        setPlotCoordinates(cachedCoords);
        // Calculate center from coordinates
        const center = calculateCenter(cachedCoords);
        setMapCenter(center);
        setMapKey((prev) => prev + 1);
        return;
      }
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      console.log("Fetching coordinates from API for plot:", plotId);
      const response = await axios.post(
        `${BASE_URL}/analyze?plot_name=${plotId}&date=${today}`
      );

      const geom = response.data?.features?.[0]?.geometry?.coordinates?.[0];
      if (geom) {
        const coords = geom.map(([lng, lat]: [number, number]) => [lat, lng]);
        console.log("Received coordinates:", coords);
        setPlotCoordinates(coords);

        // Cache the coordinates
        setPlotCoordinatesCache((prev) => new Map(prev.set(plotId, coords)));

        // Calculate and set map center
        const center = calculateCenter(coords);
        console.log("Calculated map center:", center);
        setMapCenter(center);
        setMapKey((prev) => prev + 1);
      } else {
        console.log("No geometry found in response");
      }
    } catch (error) {
      console.error("Error fetching plot coordinates:", error);
    }
  };

  // Calculate center point from coordinates
  const calculateCenter = (coords: [number, number][]): [number, number] => {
    if (coords.length === 0) return [17.5789, 75.053];

    const sumLat = coords.reduce((sum, [lat]) => sum + lat, 0);
    const sumLng = coords.reduce((sum, [, lng]) => sum + lng, 0);

    return [sumLat / coords.length, sumLng / coords.length];
  };

  // Aggregation logic (same as FarmerDashboard)
  const aggregateDataByPeriod = (
    data: LineChartData[],
    period: TimePeriod
  ): LineChartData[] => {
    if (period === "daily") {
      if (data.length < 2) return data;
      const sorted = [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const last = sorted[sorted.length - 1];
      const secondLast = sorted[sorted.length - 2];
      return [secondLast, last];
    }
    const groupedData: { [key: string]: LineChartData[] } = {};
    data.forEach((item) => {
      const date = new Date(item.date);
      let key: string;
      switch (period) {
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        case "monthly":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
          break;
        case "yearly":
          return;
        default:
          key = item.date;
      }
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(item);
    });
    if (period === "yearly") {
      return [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
    return Object.entries(groupedData)
      .map(([key, items]) => {
        const avgGrowth =
          items.reduce((sum, item) => sum + item.growth, 0) / items.length;
        const avgStress =
          items.reduce((sum, item) => sum + item.stress, 0) / items.length;
        const avgWater =
          items.reduce((sum, item) => sum + item.water, 0) / items.length;
        const avgMoisture =
          items.reduce((sum, item) => sum + item.moisture, 0) / items.length;
        let displayDate: string;
        if (period === "monthly") {
          const [year, month] = key.split("-");
          displayDate = new Date(
            parseInt(year),
            parseInt(month) - 1
          ).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        } else {
          displayDate = key;
        }
        return {
          date: key,
          displayDate,
          growth: avgGrowth,
          stress: avgStress,
          water: avgWater,
          moisture: avgMoisture,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Utility functions
  const toggleLine = (key: string): void => {
    const isOnlyThis = Object.keys(visibleLines).every((k) =>
      k === key
        ? visibleLines[k as keyof VisibleLines]
        : !visibleLines[k as keyof VisibleLines]
    );

    if (isOnlyThis) {
      setVisibleLines({
        growth: true,
        stress: true,
        water: true,
        moisture: true,
      });
    } else {
      setVisibleLines({
        growth: key === "growth",
        stress: key === "stress",
        water: key === "water",
        moisture: key === "moisture",
      });
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Map auto-center component (from Harvest Dashboard)
  function MapAutoCenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
  }

  const getPlotBorderStyle = () => ({
    color: "#ffffff",
    fillColor: "#10b981",
    weight: 3,
    opacity: 1,
    fillOpacity: 0.3,
  });

  // Biomass data setup (same as FarmerDashboard)
  const currentBiomass = metrics.biomass || 0;
  const expectedBiomass = OPTIMAL_BIOMASS;

  const biomassData = [
    {
      name: "Expected",
      value: expectedBiomass,
      fill: "#3b82f6",
    },
    {
      name: "Actual",
      value: currentBiomass,
      fill: "#10b981",
    },
  ];

  // Time period toggle component
  const TimePeriodToggle: React.FC = () => (
    <div className="flex bg-white rounded-lg p-1 shadow-sm border">
      {(["daily", "weekly", "monthly", "yearly"] as TimePeriod[]).map(
        (period) => (
          <button
            key={period}
            onClick={() => setTimePeriod(period)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              timePeriod === period
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        )
      )}
    </div>
  );

  // Enhanced chart legend
  const ChartLegend: React.FC = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {Object.entries(lineStyles).map(([key, { color, label, icon: Icon }]) => (
        <button
          key={key}
          onClick={() => toggleLine(key)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
            visibleLines[key as keyof VisibleLines]
              ? "bg-white shadow-sm border-2 border-blue-200"
              : "bg-gray-50 opacity-60 hover:opacity-80"
          }`}
        >
          <Icon className="w-4 h-4" style={{ color }} />
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </button>
      ))}
    </div>
  );

  // Custom tooltip component
  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg backdrop-blur-sm">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            {formatDate(label || "")}
          </p>
          {payload.map((entry, index) => {
            const lineStyle = lineStyles[entry.dataKey as keyof LineStyles];
            if (!lineStyle) return null;

            return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
                  {lineStyle.label}: {Number(entry.value).toFixed(4)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Gauge component
  const PieChartWithNeedle: React.FC<PieChartWithNeedleProps> = ({
    value,
    max,
    width = 200,
    height = 120,
    title = "Gauge",
    unit = "",
  }) => {
    const percent = Math.max(0, Math.min(1, value / max));
    const angle = 180 * percent;
    const cx = width / 2;
    const cy = height * 0.8;
    const r = width * 0.35;
    const needleLength = r * 0.9;
    const needleAngle = 180 - angle;
    const rad = (Math.PI * needleAngle) / 180;
    const x = cx + needleLength * Math.cos(rad);
    const y = cy - needleLength * Math.sin(rad);

    const getColor = (percent: number): string => {
      if (percent < 0.3) return "#ef4444";
      if (percent < 0.6) return "#f97316";
      if (percent < 0.8) return "#eab308";
      return "#10b981";
    };

    return (
      <div className="flex flex-col items-center">
        <svg width={width} height={height} className="overflow-visible">
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${
              cx + r * Math.cos(Math.PI - (angle * Math.PI) / 180)
            } ${cy - r * Math.sin(Math.PI - (angle * Math.PI) / 180)}`}
            fill="none"
            stroke={getColor(percent)}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="4" fill="#374151" />
          <text
            x={cx}
            y={cy - r - 15}
            textAnchor="middle"
            className="text-lg font-bold fill-gray-700"
          >
            {value.toFixed(1)} {unit}
          </text>
        </svg>
        <p className="text-sm text-gray-600 mt-2 font-medium">{title}</p>
      </div>
    );
  };

  // Show loading spinner while fetching initial farmers data
  if (loadingFarmers && fieldOfficers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <CommonSpinner />
      </div>
    );
  }

  const totalFarmers = fieldOfficers.reduce(
    (acc, officer) => acc + (officer.farmers?.length || 0),
    0
  );

  // Log farmers state before rendering
  console.log("🎨 FarmCropStatus Render - Current State:", {
    officerCount: fieldOfficers.length,
    totalFarmers: totalFarmers,
    selectedFarmerId,
    selectedPlotId,
    loadingFarmers,
    loadingData,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Header */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        {/* Debug Info Panel */}
        {showDebugInfo && (
          <div className="mb-6 bg-gray-900 rounded-xl shadow-lg p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Debug Information - API Request Details
            </h3>
            <div className="bg-black rounded-lg p-3 overflow-auto max-h-96">
              <pre className="text-xs text-green-300 font-mono">
                {JSON.stringify(
                  {
                    endpoint:
                      "https://cropeye-server-1.onrender.com/api/farms/recent-farmers/",
                    method: "GET",
                    bearerToken: localStorage.getItem("token")
                      ? "✅ Present"
                      : "❌ Missing",
                    tokenPreview:
                      localStorage.getItem("token")?.substring(0, 30) + "...",
                    totalFarmers: farmers.length,
                    selectedFarmer: selectedFarmerId,
                    selectedPlot: selectedPlotId,
                    farmersList: farmers.map((f: any) => ({
                      id: f.id || f.farmer_id,
                      name:
                        `${f.first_name || ""} ${f.last_name || ""}`.trim() ||
                        f.name,
                      email: f.email,
                      plots: f.plots?.length || f.plot_ids?.length || 0,
                    })),
                    timestamp: new Date().toISOString(),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              💡 Check the browser console for detailed API request/response
              logs
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div className="flex flex-col flex-1 sm:flex-none">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Field Officer ({fieldOfficers.length})
                  </label>
                  <select
                    className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm w-full sm:w-64"
                    value={selectedFieldOfficerId}
                    onChange={(e) => setSelectedFieldOfficerId(e.target.value)}
                    disabled={loadingFarmers}
                  >
                    {loadingFarmers ? (
                      <option>Loading...</option>
                    ) : fieldOfficers.length === 0 ? (
                      <option>No officers found</option>
                    ) : (
                      <>
                        <option value="">Select an officer</option>
                        {fieldOfficers.map((officer) => (
                          <option
                            key={`officer-${officer.id}`}
                            value={officer.id}
                          >
                            {officer.first_name} {officer.last_name} (
                            {officer.farmers.length} farmers)
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col flex-1 sm:flex-none">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Farmers (
                    {farmersForSelectedOfficer.length})
                  </label>
                  <select
                    className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm w-full sm:w-64"
                    value={selectedFarmerId}
                    onChange={(e) => {
                      console.log(
                        "🔄 Farmer selection changed to:",
                        e.target.value
                      );
                      setSelectedFarmerId(e.target.value);
                    }}
                    disabled={
                      !selectedFieldOfficerId ||
                      farmersForSelectedOfficer.length === 0
                    }
                  >
                    {loadingFarmers ? (
                      <option>Loading farmers...</option>
                    ) : farmersForSelectedOfficer.length === 0 ? (
                      <option>No farmers found</option>
                    ) : (
                      <>
                        <option value="">Select a farmer</option>
                        {farmersForSelectedOfficer.map((farmer, index) => {
                          const farmerId = String(farmer.id);
                          const farmerName =
                            `${farmer.first_name} ${farmer.last_name}`.trim();
                          const plotsCount = farmer.plots?.length || 0;

                          console.log(
                            `🔍 Rendering farmer ${index + 1} in dropdown:`,
                            {
                              id: farmerId,
                              name: farmerName,
                              email: farmer.email,
                              plots: plotsCount,
                            }
                          );

                          return (
                            <option key={`farmer-${farmerId}`} value={farmerId}>
                              {farmerName} ({plotsCount} plot
                              {plotsCount !== 1 ? "s" : ""})
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col flex-1 sm:flex-none">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Plots ({plots.length})
                  </label>
                  <select
                    className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm w-full sm:w-64"
                    value={selectedPlotId}
                    onChange={(e) => {
                      const newPlotId = e.target.value;
                      console.log("🔄 Plot selection changed to:", newPlotId);
                      setSelectedPlotId(newPlotId);
                      if (newPlotId) {
                        console.log(
                          "📍 Fetching coordinates for plot:",
                          newPlotId
                        );
                        // Immediately fetch coordinates and update map
                        fetchPlotCoordinates(newPlotId);
                      }
                    }}
                    disabled={!selectedFarmerId || plots.length === 0}
                  >
                    {!selectedFarmerId ? (
                      <option value="">Select farmer first</option>
                    ) : plots.length === 0 ? (
                      <option value="">No plots available</option>
                    ) : (
                      <>
                        <option value="">Select a plot</option>
                        {plots.map((plotId, index) => {
                          console.log(
                            `🔍 Rendering plot ${index + 1}:`,
                            plotId
                          );
                          return (
                            <option
                              key={`plot-${plotId}-${index}`}
                              value={plotId}
                            >
                              Plot: {plotId}
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gradient-to-r from-gray-100 to-blue-50 px-4 py-3 rounded-lg ">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-medium">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Top Priority Metrics - 4 Key Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-green-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-6 h-6 text-green-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.area?.toFixed(2) || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-green-600">Ha</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Field Area</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-emerald-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Leaf className="w-6 h-6 text-emerald-600" />
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.growthStage || "-"
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium mt-7">
              Crop Status
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-orange-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-6 h-6 text-orange-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.daysToHarvest || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-orange-600">
                  Days
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Days to Harvest</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-blue-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Beaker className="w-6 h-6 text-blue-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.brix?.toFixed(1) || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-blue-600">°Brix</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Sugar Content</p>
          </div>
        </div>

        {/* Additional Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-purple-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-6 h-6 text-purple-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.recovery?.toFixed(1) || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-purple-600">%</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Recovery Rate</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-indigo-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.expectedYield?.toFixed(0) || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-indigo-600">
                  T/Ha
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Expected Yield</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-teal-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Thermometer className="w-6 h-6 text-teal-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.organicCarbonDensity?.toFixed(1) || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-teal-600">g/kg</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Organic Carbon</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-cyan-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Droplets className="w-6 h-6 text-cyan-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.irrigationEvents || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-cyan-600">
                  Events
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              Irrigation Events
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-yellow-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.stressCount || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-yellow-600">
                  Events
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Stress Events</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-pink-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-6 h-6 text-pink-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {loadingData ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    metrics.biomass?.toFixed(1) || "-"
                  )}
                </div>
                <div className="text-sm font-semibold text-pink-600">kg/ha</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Avg Biomass</p>
          </div>
        </div>

        {/* Map and Status Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden">
            <div
              ref={mapWrapperRef}
              className="relative w-full h-[400px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-full min-h-[300px]"
            >
              {/* Fullscreen Toggle */}
              <div
                className="absolute top-4 right-4 z-20 bg-white text-gray-700 border border-gray-200 shadow-md p-2 rounded cursor-pointer hover:bg-gray-100 transition"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    mapWrapperRef.current?.requestFullscreen();
                  } else {
                    document.exitFullscreen();
                  }
                }}
              >
                <Maximize2 className="w-4 h-4" />
              </div>

              {/* Centered Growth Stage Indicator */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <div className="bg-black/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/30 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                    <div className="text-center">
                      <div className="text-white font-bold text-lg drop-shadow-lg">
                        {metrics.growthStage ?? "Loading..."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={16}
                minZoom={10}
                maxZoom={20}
                className="w-full h-full z-0"
                style={{
                  height: "100%",
                  width: "100%",
                  borderRadius: "inherit",
                  position: "relative",
                }}
              >
                <MapAutoCenter center={mapCenter} />
                <TileLayer
                  url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  attribution="© Google"
                  maxZoom={20}
                  maxNativeZoom={18}
                  minZoom={10}
                  tileSize={256}
                  zoomOffset={0}
                  updateWhenZooming={false}
                  updateWhenIdle={true}
                />
                {plotCoordinates.length > 0 && (
                  <Polygon
                    positions={plotCoordinates}
                    pathOptions={getPlotBorderStyle()}
                  >
                    <LeafletTooltip
                      direction="top"
                      offset={[0, -10]}
                      opacity={0.9}
                      sticky
                    >
                      <div className="text-sm">
                        <p>
                          <strong>Plot:</strong> {selectedPlotId}
                        </p>
                        <p>
                          <strong>Farmer:</strong> Ramesh Patil
                        </p>
                        <p>
                          <strong>Representative:</strong> Sunil Joshi
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          {metrics.growthStage ?? "Loading..."}
                        </p>
                        <p>
                          <strong>Area:</strong> {metrics.area ?? "Loading..."}{" "}
                          Ha
                        </p>
                      </div>
                    </LeafletTooltip>
                  </Polygon>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Performance Gauges */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Sugar Yield Projection
                </h3>
              </div>
              <PieChartWithNeedle
                value={metrics.expectedYield || 0}
                max={400}
                title="Expected Yield"
                unit="T/Ha"
                width={220}
                height={140}
              />
              <div className="mt-4 text-center">
                <div className="text-sm text-gray-600">
                  Performance:{" "}
                  <span className="font-semibold text-purple-600">
                    {(((metrics.expectedYield || 0) / 400) * 100).toFixed(1)}%
                  </span>{" "}
                  of optimal
                </div>
              </div>
            </div>

            {/* Biomass Performance */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Biomass Performance
                </h3>
              </div>

              <div className="h-36 flex flex-col items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={biomassData}
                      cx="50%"
                      cy="60%"
                      startAngle={180}
                      endAngle={0}
                      outerRadius={80}
                      innerRadius={50}
                      dataKey="value"
                      labelLine={false}
                    >
                      {biomassData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="60%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-sm font-semibold fill-green-600"
                    >
                      {currentBiomass.toFixed(1)} kg/ha
                    </text>
                    <Tooltip
                      wrapperStyle={{ zIndex: 50 }}
                      contentStyle={{ fontSize: "10px" }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)} kg/ha`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 text-center">
                <div className="text-sm text-gray-600">
                  Performance:{" "}
                  <span className="font-semibold text-green-600">
                    {((currentBiomass / expectedBiomass) * 100).toFixed(1)}%
                  </span>{" "}
                  of optimal
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <LineChartIcon className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Field Indices Analysis
              </h3>
            </div>
            <TimePeriodToggle />
          </div>

          <ChartLegend />

          <div className="h-96 ">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={aggregatedData}
                margin={{ top: 15, right: 10, left: -30, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(tick: string) => {
                    const d = new Date(tick);
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[-0.75, 0.8]}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Performance zone annotations - Dynamic based on visible indices */}
                {(() => {
                  // Define ranges for each index type
                  const indexRanges = {
                    water: { good: [0.4, 0.8], bad: [-0.3, -0.75] },
                    moisture: { good: [-0.25, 0.8], bad: [-0.6, -0.75] },
                    growth: { good: [0.2, 0.8], bad: [0.15, -0.75] },
                    stress: { good: [0.35, 0.8], bad: [0.2, -0.75] },
                  };

                  // Count visible indices
                  const visibleCount = Object.values(visibleLines).filter(
                    (v) => v
                  ).length;

                  let goodRange: [number, number] = [0.3, 0.6]; // Default values
                  let badRange: [number, number] = [-0.1, 0.1]; // Default values
                  let labelText = "Average";

                  if (visibleCount === 1) {
                    // Single index selected - use its specific range
                    const selectedIndex = Object.keys(visibleLines).find(
                      (key) => visibleLines[key as keyof VisibleLines]
                    );
                    if (
                      selectedIndex &&
                      indexRanges[selectedIndex as keyof typeof indexRanges]
                    ) {
                      const range =
                        indexRanges[selectedIndex as keyof typeof indexRanges];
                      goodRange = range.good as [number, number];
                      badRange = range.bad as [number, number];
                      labelText =
                        selectedIndex.charAt(0).toUpperCase() +
                        selectedIndex.slice(1);
                    }
                  } else {
                    // Multiple or no indices - use averaged ranges
                    const allGoodRanges = Object.values(indexRanges).map(
                      (r) => r.good
                    );
                    const allBadRanges = Object.values(indexRanges).map(
                      (r) => r.bad
                    );

                    const avgGoodMin =
                      allGoodRanges.reduce((sum, [min]) => sum + min, 0) /
                      allGoodRanges.length;
                    const avgGoodMax =
                      allGoodRanges.reduce((sum, [, max]) => sum + max, 0) /
                      allGoodRanges.length;
                    const avgBadMin =
                      allBadRanges.reduce((sum, [min]) => sum + min, 0) /
                      allBadRanges.length;
                    const avgBadMax =
                      allBadRanges.reduce((sum, [, max]) => sum + max, 0) /
                      allBadRanges.length;

                    goodRange = [avgGoodMin, avgGoodMax] as [number, number];
                    badRange = [avgBadMin, avgBadMax] as [number, number];
                    labelText = "Average";
                  }

                  return (
                    <>
                      {/* Good performance zone */}
                      <ReferenceArea
                        y1={goodRange[0]}
                        y2={goodRange[1]}
                        fill="#90EE90"
                        fillOpacity={0.7}
                        stroke="none"
                      />
                      {/* Bad performance zone */}
                      <ReferenceArea
                        y1={badRange[0]}
                        y2={badRange[1]}
                        fill="#FF6347"
                        fillOpacity={0.5}
                        stroke="none"
                      />

                      {/* Debug: Always show a test zone to verify colors work
                      <ReferenceArea
                        y1={0.8}
                        y2={1.0}
                        fill="#0000FF"
                        fillOpacity={0.3}
                        stroke="none"
                      /> */}

                      {/* Zone labels */}
                      <text
                        x="95%"
                        y="15%"
                        textAnchor="end"
                        className="text-xs font-medium fill-green-600"
                        style={{ fontSize: "10px" }}
                      >
                        {labelText} Good ({goodRange[0].toFixed(2)} -{" "}
                        {goodRange[1].toFixed(2)})
                      </text>
                      <text
                        x="95%"
                        y="85%"
                        textAnchor="end"
                        className="text-xs font-medium fill-red-600"
                        style={{ fontSize: "10px" }}
                      >
                        {labelText} Bad ({badRange[0].toFixed(2)} -{" "}
                        {badRange[1].toFixed(2)})
                      </text>
                    </>
                  );
                })()}

                {/* Stress event areas */}
                {showStressEvents &&
                  stressEvents.map((event, index) => (
                    <React.Fragment key={index}>
                      <ReferenceArea
                        x1={event.from_date}
                        x2={event.to_date}
                        fill="#dc2626"
                        fillOpacity={0.1}
                      />
                    </React.Fragment>
                  ))}

                {/* Chart lines */}
                {visibleLines.growth && (
                  <Line
                    type="monotone"
                    dataKey="growth"
                    stroke={lineStyles.growth.color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: lineStyles.growth.color }}
                    activeDot={{ r: 6, fill: lineStyles.growth.color }}
                  />
                )}
                {visibleLines.stress && (
                  <Line
                    type="monotone"
                    dataKey="stress"
                    stroke={lineStyles.stress.color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: lineStyles.stress.color }}
                    activeDot={{ r: 6, fill: lineStyles.stress.color }}
                  />
                )}
                {visibleLines.water && (
                  <Line
                    type="monotone"
                    dataKey="water"
                    stroke={lineStyles.water.color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: lineStyles.water.color }}
                    activeDot={{ r: 6, fill: lineStyles.water.color }}
                  />
                )}
                {visibleLines.moisture && (
                  <Line
                    type="monotone"
                    dataKey="moisture"
                    stroke={lineStyles.moisture.color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: lineStyles.moisture.color }}
                    activeDot={{ r: 6, fill: lineStyles.moisture.color }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManagerFarmDash;
