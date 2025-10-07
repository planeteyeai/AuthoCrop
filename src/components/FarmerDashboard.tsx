import React, { useState, useEffect } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Scatter,
  ComposedChart,
  PieChart,
  Pie,
} from "recharts";

import {
  Calendar,
  TrendingUp,
  Droplets,
  Thermometer,
  Activity,
  Target,
  Leaf,
  // BarChart3,
  // PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Users,
  MapPin,
  Beaker,
} from "lucide-react";

import axios from "axios";
import { getCache, setCache } from "../utils/cache";
import { useFarmerProfile } from "../hooks/useFarmerProfile";
import CommonSpinner from "./CommanSpinner";

// Type definitions
interface PieChartWithNeedleProps {
  value: number;
  max: number;
  width?: number;
  height?: number;
  title?: string;
  unit?: string;
}

// interface MetricCardProps {
//   title: string;
//   value: string | number;
//   icon: React.ComponentType<{ className?: string }>;
//   color?: string;
//   unit?: string;
// }

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface CustomStressDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
}

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
  };
}

interface StressEvent {
  from_date: string;
  to_date: string;
  stress: number;
}

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly";

// Enhanced PieChartWithNeedle component for gauge-style visualization
const PieChartWithNeedle: React.FC<PieChartWithNeedleProps> = ({
  value,
  max,
  width = 60,
  height = 100,
  title = "Gauge",
  unit = "",
}) => {
  const percent = Math.max(0, Math.min(1, value / max));
  const angle = 180 * percent;

  const cx = width / 2;
  const cy = height * 0.9;

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
    return "#800080";
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${
            cx + r * Math.cos(Math.PI - (angle * Math.PI) / 180)
          } ${cy - r * Math.sin(Math.PI - (angle * Math.PI) / 180)}`}
          fill="none"
          stroke={getColor(percent)}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3" fill="#374151" />
        <text
          x={cx}
          y={cy - r - 8}
          textAnchor="middle"
          className="text-sm font-semibold fill-gray-700"
        >
          {value.toFixed(1)}
          {unit}
        </text>
      </svg>
      <p className="text-xs text-gray-600 mt-1 text-center">{title}</p>
    </div>
  );
};

const BASE_URL = "https://dev-events.cropeye.ai"; // Base URL for most services
const OPTIMAL_BIOMASS = 150;
const SOIL_API_URL = "https://dev-soil.cropeye.ai";
const SOIL_DATE = "2025-10-03";

const OTHER_FARMERS_RECOVERY = {
  regional_average: 78.5,
  top_quartile: 85.2,
  bottom_quartile: 65.8,
  similar_farms: 76.3,
};

const FarmerDashboard: React.FC = () => {
  // Use farmer profile hook - same as Map.tsx
  const {
    profile,
    loading: profileLoading,
    getFarmerFullName,
  } = useFarmerProfile();

  const [currentPlotId, setCurrentPlotId] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const [lineChartData, setLineChartData] = useState<LineChartData[]>([]);
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
  const [ndreStressEvents, setNdreStressEvents] = useState<StressEvent[]>([]);
  const [showNDREEvents, setShowNDREEvents] = useState<boolean>(false);
  const [combinedChartData, setCombinedChartData] = useState<LineChartData[]>(
    []
  );
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [aggregatedData, setAggregatedData] = useState<LineChartData[]>([]);

  const lineStyles: LineStyles = {
    growth: { color: "#22c55e", label: "Growth Index" },
    stress: { color: "#ef4444", label: "Stress Index" },
    water: { color: "#3b82f6", label: "Water Index" },
    moisture: { color: "#f59e0b", label: "Moisture Index" },
  };

  // Extract plot ID from profile - same logic as Map.tsx
  useEffect(() => {
    if (!profile || profileLoading) {
      return;
    }

    // Get the first plot from the loaded profile - same as Map.tsx
    const plotNames = profile.plots?.map((plot) => plot.fastapi_plot_id) || [];
    const defaultPlot = plotNames.length > 0 ? plotNames[0] : null;

    console.log("📊 FarmerDashboard: Available plots:", plotNames);
    console.log("📊 FarmerDashboard: Selected plot:", defaultPlot);

    if (defaultPlot) {
      setCurrentPlotId(defaultPlot);
      // Optionally store in localStorage like Map.tsx does
      localStorage.setItem("selectedPlot", defaultPlot);

      console.log("✅ FarmerDashboard: Using plot ID:", defaultPlot);
    }
  }, [profile, profileLoading]);

  // Fetch dashboard data when plot ID is available
  useEffect(() => {
    // Only fetch data when we have a valid plot ID
    if (currentPlotId && !profileLoading) {
      console.log(
        "🔄 FarmerDashboard: Fetching dashboard data for plot:",
        currentPlotId
      );
      fetchAllData();
    }
  }, [currentPlotId, profileLoading]);

  useEffect(() => {
    if (lineChartData.length > 0) {
      const aggregated = aggregateDataByPeriod(lineChartData, timePeriod);
      setAggregatedData(aggregated);
    }
  }, [lineChartData, timePeriod]);

  const aggregateDataByPeriod = (
    data: LineChartData[],
    period: TimePeriod
  ): LineChartData[] => {
    if (period === "daily") {
      // Show only the last two days (present and yesterday)
      if (data.length < 2) return data;
      // Sort by date ascending
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
          // For yearly, show all data points (no aggregation)
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
      // Return all data points, sorted by date
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

  const fetchAllData = async (): Promise<void> => {
    if (!currentPlotId) {
      console.warn("⚠️ FarmerDashboard: No plot ID available");
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);

      const indicesCacheKey = `indices_${currentPlotId}`;
      let rawIndices = getCache(indicesCacheKey);

      if (!rawIndices) {
        const indicesRes = await axios.get(
          `${BASE_URL}/plots/${currentPlotId}/indices`
        );
        rawIndices = indicesRes.data.map((item: any) => ({
          date: new Date(item.date).toISOString().split("T")[0],
          growth: item.NDVI,
          stress: item.NDMI,
          water: item.NDWI,
          moisture: item.NDRE,
        }));
        setCache(indicesCacheKey, rawIndices);
      }

      setLineChartData(rawIndices);

      const stressCacheKey = `stress_${currentPlotId}_NDMI_0.15`;
      let stressData = getCache(stressCacheKey);
      if (!stressData) {
        const stressRes = await axios.get(
          `${BASE_URL}/plots/${currentPlotId}/stress?index_type=NDRE&threshold=0.15`
        );
        stressData = stressRes.data;
        setCache(stressCacheKey, stressData);
      }
      setStressEvents(stressData?.events ?? []);

      // --- NEW: Fetch all plot stats from the consolidated endpoint ---
      const agroStatsCacheKey = `agroStats_${today}`;
      const agroStatsUrl = `https://dev-events.cropeye.ai/plots/agroStats?end_date=${today}`;
      console.log(`[DB] 1. Fetching bulk plot data from: ${agroStatsUrl}`);

      let allPlotsData = getCache(agroStatsCacheKey);
      if (!allPlotsData) {
        const agroStatsRes = await axios.get(agroStatsUrl);
        allPlotsData = agroStatsRes.data;
        setCache(agroStatsCacheKey, allPlotsData);
        console.log("[DB] 2. Fetched new data from API:", allPlotsData);
      } else {
        console.log("[DB] 2. Loaded bulk data from cache.");
      }

      // Find the data for the current plot from the bulk response
      console.log(
        `[DB] 3. Searching for plot ID "${currentPlotId}" in the response.`
      );
      const currentPlotData = allPlotsData ? allPlotsData[currentPlotId] : null;
      console.log("[DB] 4. Data for current plot:", currentPlotData);

      // --- The following separate calls are now replaced by the single agroStats call ---

      /*
      if (!biomassData) {
        const biomassRes = await axios.get(
          `${BASE_URL}/plots/${currentPlotId}/biomass`
        );
        biomassData = biomassRes.data;
        setCache(biomassCacheKey, biomassData);
      }
      */

      const irrigationCacheKey = `irrigation_${currentPlotId}`;
      let irrigationData = getCache(irrigationCacheKey);
      if (!irrigationData) {
        const irrigationRes = await axios.get(
          `${BASE_URL}/plots/${currentPlotId}/irrigation?threshold_ndmi=0.05&threshold_ndwi=0.05&min_days_between_events=10`
        );
        irrigationData = irrigationRes.data;
        setCache(irrigationCacheKey, irrigationData);
      }

      const soilCacheKey = `soil_${currentPlotId}_${SOIL_DATE}`;
      let soilData = getCache(soilCacheKey);
      if (!soilData) {
        const res = await axios.post(
          `${SOIL_API_URL}/analyze?plot_name=${currentPlotId}&date=${SOIL_DATE}&fe_days_back=30`
        );
        soilData = res.data;
        setCache(soilCacheKey, soilData);
      }
      const stats = soilData?.features?.[0]?.properties?.statistics; // This can be removed if soil data is also in agroStats

      const newMetrics = {
        // Values from the new agroStats endpoint
        brix: currentPlotData?.brix_sugar?.brix?.min ?? null,
        recovery: currentPlotData?.brix_sugar?.recovery?.min ?? null, // Correct
        area: currentPlotData?.area_acres ?? null, // Use top-level area_acres
        biomass: currentPlotData?.biomass?.mean ?? null,
        daysToHarvest: currentPlotData?.days_to_harvest ?? null,
        growthStage: currentPlotData?.Sugarcane_Status ?? null,
        soilPH: currentPlotData?.soil?.phh2o ?? null,
        organicCarbonDensity:
          currentPlotData?.soil?.organic_carbon_stock != null
            ? parseFloat(currentPlotData.soil.organic_carbon_stock.toFixed(2))
            : null,
        actualYield: currentPlotData?.brix_sugar?.sugar_yield?.min ?? null,

        // Values from other endpoints that are still needed
        stressCount: stressData?.total_events ?? 0,
        irrigationEvents: irrigationData?.total_events ?? null,

        // These might be deprecated if the new endpoint covers them
        expectedYield: currentPlotData?.brix_sugar?.sugar_yield?.min ?? null,
        cnRatio: null, // This was from the old /analyze call
      };

      console.log("[DB] 5. Setting new metrics state:", newMetrics);
      setMetrics(newMetrics);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const fetchNDREStressEvents = async (): Promise<void> => {
    if (!currentPlotId) {
      console.warn(
        "⚠️ FarmerDashboard: No plot ID available for NDRE stress events"
      );
      return;
    }

    try {
      const res = await axios.get(
        `${BASE_URL}/plots/${currentPlotId}/stress?index_type=NDRE&threshold=0.15`
      );
      const data = res.data;
      setNdreStressEvents(data.events ?? []);
      setShowNDREEvents(true);
    } catch (err) {
      console.error("Error fetching NDRE stress events:", err);
    }
  };

  useEffect(() => {
    if (aggregatedData.length > 0) {
      const combined = aggregatedData.map((point) => {
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
  }, [aggregatedData, ndreStressEvents, showNDREEvents]);

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

  const getStressColor = (stress: number): string => {
    if (stress < 0.1) return "#dc2626";
    if (stress < 0.15) return "#f97316";
    return "#eab308";
  };

  const getStressSeverityLabel = (stress: number): string => {
    if (stress < 0.1) return "High";
    if (stress < 0.15) return "Medium";
    return "Low";
  };

  const CustomStressDot: React.FC<CustomStressDotProps> = (props) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.isStressEvent) return null;

    const color = getStressColor(payload.stressLevel);
    const radius =
      payload.stressLevel < 0.1 ? 10 : payload.stressLevel < 0.15 ? 8 : 6;

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={radius + 1}
          fill="white"
          stroke={color}
          strokeWidth={2}
          fillOpacity={0.9}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={color}
          fillOpacity={0.8}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  // MetricCard component - currently unused but kept for future use
  // const MetricCard: React.FC<MetricCardProps> = ({
  //   title,
  //   value,
  //   icon: Icon,
  //   color = "blue",
  //   unit = "",
  // }) => (
  //   <div
  //     className={`bg-gradient-to-br from-${color}-50 to-${color}-100 hover:from-${color}-100 hover:to-${color}-150 p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 border border-${color}-200 h-16 flex flex-col justify-between`}
  //   >
  //     <div className="flex items-center justify-between">
  //       <Icon className={`w-4 h-4 text-${color}-600 flex-shrink-0`} />
  //       <div className="text-right">
  //         <span className={`text-base font-bold text-${color}-800 block`}>
  //           {value}
  //         </span>
  //         <span className={`text-xs font-semibold text-${color}-600`}>
  //           {unit}
  //         </span>
  //       </div>
  //     </div>
  //     <p className={`text-xs font-normal text-${color}-700 leading-tight`}>
  //       {title}
  //     </p>
  //   </div>
  // );

  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-lg backdrop-blur-sm">
          <p className="text-xs font-semibold text-gray-800 mb-1">
            {timePeriod === "monthly" ? label : formatDate(label || "")}
          </p>
          {payload.map((entry, index) => {
            let displayValue = "";
            let displayLabel = "";

            if (
              entry.dataKey === "stressLevel" &&
              entry.payload?.isStressEvent
            ) {
              displayValue = `${Number(entry.value).toFixed(
                4
              )} (${getStressSeverityLabel(entry.value)})`;
              displayLabel = "NDRE Stress Level";
            } else if (lineStyles[entry.dataKey as keyof LineStyles]) {
              const value = entry.value;
              const numericValue =
                typeof value === "number" ? value : parseFloat(value);
              displayValue = !isNaN(numericValue)
                ? numericValue.toFixed(4)
                : "N/A";
              displayLabel =
                lineStyles[entry.dataKey as keyof LineStyles]?.label ||
                entry.dataKey;
            } else {
              return null;
            }

            return (
              <div key={index} className="flex items-center gap-1 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600">
                  {displayLabel}: {displayValue}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const TimePeriodToggle: React.FC = () => (
    <div className="flex flex-wrap gap-1 mb-3">
      {(["daily", "weekly", "monthly", "yearly"] as TimePeriod[]).map(
        (period) => (
          <button
            key={period}
            onClick={() => setTimePeriod(period)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              timePeriod === period
                ? "bg-blue-500 text-white shadow-md transform scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        )
      )}
    </div>
  );

  const ChartLegend: React.FC = () => (
    <div className="flex flex-wrap gap-1 text-xs font-medium mb-2">
      {Object.entries(lineStyles).map(([key, { color, label }]) => (
        <button
          key={key}
          onClick={() => toggleLine(key)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-200 ${
            visibleLines[key as keyof VisibleLines]
              ? "bg-white shadow-sm transform scale-105"
              : "bg-gray-100 opacity-50 hover:opacity-75"
          }`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-gray-700 text-xs">{label}</span>
        </button>
      ))}
      {showNDREEvents && (
        <div className="flex items-center gap-1 ml-1 px-2 py-1 bg-orange-100 rounded-md border border-orange-300">
          <div className="w-2 h-2 rounded-full bg-orange-500 border border-orange-600"></div>
          <span className="text-orange-800 font-semibold text-xs">
            NDRE Stress Events
          </span>
        </div>
      )}
    </div>
  );

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

  const recoveryComparisonData = [
    {
      name: "Your Farm",
      value: metrics.recovery || 0,
      fill: "#10b981",
      label: "Your Recovery Rate",
    },
    {
      name: "Regional Average",
      value: OTHER_FARMERS_RECOVERY.regional_average,
      fill: "#3b82f6",
      label: "Regional Average",
    },
    {
      name: "Top 25%",
      value: OTHER_FARMERS_RECOVERY.top_quartile,
      fill: "#22c55e",
      label: "Top Quartile",
    },
    {
      name: "Similar Farms",
      value: OTHER_FARMERS_RECOVERY.similar_farms,
      fill: "#f59e0b",
      label: "Similar Farms",
    },
  ];

  // Customized label function - currently unused but kept for future use
  // const renderCustomizedLabel = ({
  //   cx,
  //   cy,
  //   midAngle,
  //   innerRadius,
  //   outerRadius,
  //   percent,
  //   name,
  //   value,
  // }: any) => {
  //   const RADIAN = Math.PI / 180;
  //   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  //   const x = cx + radius * Math.cos(-midAngle * RADIAN);
  //   const y = cy + radius * Math.sin(-midAngle * RADIAN);

  //   return (
  //     <text
  //       x={x}
  //       y={y}
  //       fill="white"
  //       textAnchor={x > cx ? "start" : "end"}
  //       dominantBaseline="central"
  //       className="text-xs font-semibold"
  //     >
  //       {`${value.toFixed(1)}%`}
  //     </text>
  //   );
  // };

  // Show loading state while fetching farmer profile
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <CommonSpinner />
      </div>
    );
  }

  // Show message if no plots are available
  if (!currentPlotId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 flex items-center justify-center">
        <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            No Plots Found
          </h3>
          <p className="text-gray-600">
            No farm plots are registered to your account. Please contact your
            field officer to register your farm plot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Debug Info Panel */}
        {showDebugInfo && (
          <div className="bg-gray-900 rounded-xl shadow-lg p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Debug Information - API Response
            </h3>
            <div className="bg-black rounded-lg p-3 overflow-auto max-h-96">
              <pre className="text-xs text-green-300 font-mono">
                {JSON.stringify(
                  {
                    farmerProfile: profile,
                    extractedPlotId: currentPlotId,
                    plotIdType: typeof currentPlotId,
                    availablePlots:
                      profile?.plots?.map((p) => p.fastapi_plot_id) || [],
                    timestamp: new Date().toISOString(),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              💡 Check the browser console for detailed extraction logs
            </p>
          </div>
        )}

        {/* Top Priority Metrics - 4 Key Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-green-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-6 h-6 text-green-600" />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">
                  {metrics.area?.toFixed(2) || "-"}
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
                  {metrics.growthStage || "-"}
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
                  {metrics.daysToHarvest || "-"}
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
                  {metrics.brix?.toFixed(1) || "-"}
                </div>
                <div className="text-sm font-semibold text-blue-600">°Brix</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Sugar Content</p>
          </div>
        </div>

        {/* Field Indices Analysis Chart */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-3">
            <div className="flex items-center gap-2 mb-2 lg:mb-0">
              <LineChartIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-800">
                Field Indices Analysis
              </h3>
            </div>
            <TimePeriodToggle />
          </div>

          <ChartLegend />

          <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={combinedChartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis
                  dataKey={timePeriod === "monthly" ? "displayDate" : "date"}
                  tickFormatter={(tick: string) => {
                    if (timePeriod === "monthly") return tick;
                    if (timePeriod === "daily") {
                      const d = new Date(tick);
                      return d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }
                    const d = new Date(tick);
                    return `${d.toLocaleString("default", {
                      month: "short",
                    })}-${d.getFullYear()}`;
                  }}
                  stroke="#6b7280"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  domain={[-0.75, 0.8]}
                  stroke="#6b7280"
                  tick={{ fontSize: 10 }}
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
                        fillOpacity={0.7}
                        stroke="none"
                      />

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

                {showStressEvents &&
                  stressEvents.map((event, index) => (
                    <React.Fragment key={index}>
                      <ReferenceLine
                        x={event.from_date}
                        stroke="#dc2626"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        label={{
                          value: `Start: ${formatDate(event.from_date)}`,
                          position: "top",
                          fontSize: 8,
                          fill: "#dc2626",
                        }}
                      />
                      <ReferenceLine
                        x={event.to_date}
                        stroke="#dc2626"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        label={{
                          value: `End: ${formatDate(event.to_date)}`,
                          position: "top",
                          fontSize: 8,
                          fill: "#dc2626",
                        }}
                      />
                      <ReferenceArea
                        x1={event.from_date}
                        x2={event.to_date}
                        fill="#dc2626"
                        fillOpacity={0.1}
                      />
                    </React.Fragment>
                  ))}

                {visibleLines.growth && (
                  <Line
                    type="monotone"
                    dataKey="growth"
                    stroke={lineStyles.growth.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: lineStyles.growth.color }}
                    activeDot={{ r: 4, fill: lineStyles.growth.color }}
                  />
                )}
                {visibleLines.stress && (
                  <Line
                    type="monotone"
                    dataKey="stress"
                    stroke={lineStyles.stress.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: lineStyles.stress.color }}
                    activeDot={{ r: 4, fill: lineStyles.stress.color }}
                  />
                )}
                {visibleLines.water && (
                  <Line
                    type="monotone"
                    dataKey="water"
                    stroke={lineStyles.water.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: lineStyles.water.color }}
                    activeDot={{ r: 4, fill: lineStyles.water.color }}
                  />
                )}
                {visibleLines.moisture && (
                  <Line
                    type="monotone"
                    dataKey="moisture"
                    stroke={lineStyles.moisture.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: lineStyles.moisture.color }}
                    activeDot={{ r: 4, fill: lineStyles.moisture.color }}
                  />
                )}

                {showNDREEvents && (
                  <Scatter
                    dataKey="stressLevel"
                    fill="#f97316"
                    shape={<CustomStressDot />}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-emerald-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <Leaf className="w-5 h-5 text-emerald-600" />
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {metrics.organicCarbonDensity || "-"}
                </div>
                <div className="text-xs font-semibold text-emerald-600">
                  g/cm³
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Organic Carbon Density</p>
          </div>

          <button
            onClick={fetchNDREStressEvents}
            onDoubleClick={() => setShowNDREEvents(!showNDREEvents)}
            className="w-full"
          >
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-red-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-1">
                <Activity className="w-5 h-5 text-red-600" />
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800">
                    {metrics.stressCount || "-"}
                  </div>
                  <div className="text-xs font-semibold text-red-600">
                    Events
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600">Stress Events</p>
            </div>
          </button>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-cyan-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <Droplets className="w-5 h-5 text-cyan-600" />
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {metrics.irrigationEvents || "-"}
                </div>
                <div className="text-xs font-semibold text-cyan-600">
                  Events
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Irrigation Events</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-purple-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <Activity className="w-5 h-5 text-purple-600" />
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {metrics.biomass?.toFixed(1) || "-"}
                </div>
                <div className="text-xs font-semibold text-purple-600">
                  kg/ha
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Avg Biomass</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-yellow-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <Thermometer className="w-5 h-5 text-yellow-600" />
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {metrics.soilPH?.toFixed(2) || "-"}
                </div>
                <div className="text-xs font-semibold text-yellow-600">pH</div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Soil pH Level</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-green-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {metrics.recovery?.toFixed(1) || "-"}
                </div>
                <div className="text-xs font-semibold text-green-600">%</div>
              </div>
            </div>
            <p className="text-xs text-gray-600">Recovery Rate</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Expected Yield Comparison */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Sugar Yield Projection
              </h3>
            </div>

            <div className="flex flex-col items-center">
              <PieChartWithNeedle
                value={metrics.expectedYield || 0}
                max={400}
                title="Sugar Yield Forecast"
                unit=" T/Ha"
                width={260}
                height={130}
              />
              <div className="mt-2 text-center">
                <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-purple-500"></div>
                    <span className="text-purple-700 font-semibold">
                      Projected: {(metrics.expectedYield || 0).toFixed(1)} T/Ha
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-green-500"></div>
                    <span className="text-green-700 font-semibold">
                      Optimal: 400 T/Ha
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Performance:{" "}
                  {(((metrics.expectedYield || 0) / 400) * 100).toFixed(1)}% of
                  optimal yield
                </div>
              </div>
            </div>
          </div>

          {/* Biomass Performance */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Biomass Performance
              </h3>
            </div>

            <div className="h-32 flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={biomassData}
                    cx="50%"
                    cy="80%"
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
                    y="70%"
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

            <p className="text-xs text-gray-700 font-medium text-center mb-2">
              Biomass Distribution Chart
            </p>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-blue-500"></div>
                  <span className="text-blue-700 font-semibold">
                    Expected: {expectedBiomass} kg/ha
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-green-500"></div>
                  <span className="text-green-700 font-semibold">
                    Actual: {currentBiomass.toFixed(1)} kg/ha
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Rate Comparison */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-3">
              <div className="flex items-center gap-2 mb-2 lg:mb-0">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-800">
                  Recovery Rate Comparison
                </h3>
              </div>
            </div>

            <div className="h-36 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={recoveryComparisonData}
                  margin={{ top: 1, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} height={10} />
                  <YAxis tick={{ fontSize: 8 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toFixed(1)}%`,
                      "Recovery Rate",
                    ]}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]}>
                    {recoveryComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 text-center text-xs text-gray-600">
              <span className="font-semibold text-green-700">
                Your Farm: {(metrics.recovery || 0).toFixed(1)}%
              </span>
              {" vs "}
              <span className="font-semibold text-blue-700">
                Regional Avg:{" "}
                {OTHER_FARMERS_RECOVERY.regional_average.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
