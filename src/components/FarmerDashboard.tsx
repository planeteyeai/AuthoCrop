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
} from "recharts";

import {
  Calendar,
  TrendingUp,
  Droplets,
  Thermometer,
  Activity,
  Target,
  Leaf,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from "lucide-react";

import axios from "axios";
import { useAppContext } from "../context/AppContext";

// Type definitions
interface PieChartWithNeedleProps {
  value: number;
  max: number;
  width?: number;
  height?: number;
  title?: string;
  unit?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  unit?: string;
}

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
  stressLevel?: number;
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

// Enhanced PieChartWithNeedle component for gauge-style visualization
const PieChartWithNeedle: React.FC<PieChartWithNeedleProps> = ({
  value,
  max,
  width = 180,
  height = 120,
  title = "Gauge",
  unit = "",
}) => {
  const percent = Math.max(0, Math.min(1, value / max));
  const angle = 180 * percent;
  const cx = width / 2;
  const cy = height;
  const r = width * 0.35;
  const needleLength = r * 0.85;
  const needleAngle = 180 - angle;
  const rad = (Math.PI * needleAngle) / 180;
  const x = cx + needleLength * Math.cos(rad);
  const y = cy - needleLength * Math.sin(rad);

  // Color based on percentage
  const getColor = (percent: number): string => {
    if (percent < 0.3) return "#ef4444"; // Red
    if (percent < 0.6) return "#f97316"; // Orange
    if (percent < 0.8) return "#eab308"; // Yellow
    return "#22c55e"; // Green
  };

  const color = getColor(percent);

  return (
    <div className="flex flex-col items-center">
      <h4 className="text-sm font-semibold text-gray-600 mb-2">{title}</h4>
      <svg
        width={width}
        height={height + 40}
        viewBox={`0 0 ${width} ${height + 40}`}
        className="drop-shadow-md"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="30%" stopColor="#f97316" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Colored arc */}
        <path
          d={`M${cx - r},${cy} A${r},${r} 0 ${
            percent > 0.5 ? 1 : 0
          },1 ${x},${y}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={r * 0.2}
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Needle center */}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.12}
          fill={color}
          stroke="white"
          strokeWidth={2}
          filter="url(#glow)"
        />

        {/* Value text */}
        <text
          x={cx}
          y={cy + 25}
          textAnchor="middle"
          className="font-bold text-lg"
          fill={color}
        >
          {value?.toFixed?.(1) ?? "-"}
          {unit}
        </text>

        {/* Max value text */}
        <text
          x={cx}
          y={cy + 40}
          textAnchor="middle"
          className="text-xs"
          fill="#6b7280"
        >
          Max: {max}
          {unit}
        </text>
      </svg>
    </div>
  );
};

// Dynamic plot ID will be fetched from API
const BASE_URL = "http://192.168.41.64:9000";
const OPTIMAL_BIOMASS = 150;
const SOIL_API_URL = "http://192.168.41.64:8000";
const SOIL_DATE = "2025-07-08";
const PLOT_ID = "289138"; // Default plot ID - should be dynamic in production

const FarmerDashboard: React.FC = () => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  // Use appState for all dashboard data
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

  const [stressEvents] = useState<StressEvent[]>([]);
  const [showStressEvents] = useState<boolean>(false);
  const [ndreStressEvents, setNdreStressEvents] = useState<StressEvent[]>([]);
  const [showNDREEvents, setShowNDREEvents] = useState<boolean>(false);
  const [combinedChartData, setCombinedChartData] = useState<LineChartData[]>(
    []
  );

  const lineStyles: LineStyles = {
    growth: { color: "#22c55e", label: "Growth Index (NDVI)" },
    stress: { color: "#ef4444", label: "Stress Index (NDMI)" },
    water: { color: "#3b82f6", label: "Water Index (NDWI)" },
    moisture: { color: "#f59e0b", label: "Moisture Index (NDRE)" },
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async (): Promise<void> => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Fetch indices data
      const indicesCacheKey = `indices_${PLOT_ID}`;
      let rawIndices = getCached(indicesCacheKey);
      if (!rawIndices) {
        const indicesRes = await axios.get(
          `${BASE_URL}/plots/${PLOT_ID}/indices`
        );
        rawIndices = indicesRes.data.map((item: any) => ({
          date: new Date(item.date).toISOString().split("T")[0],
          growth: item.NDVI,
          stress: item.NDMI,
          water: item.NDWI,
          moisture: item.NDRE,
        }));
        setCached(indicesCacheKey, rawIndices);
      }

      setLineChartData(rawIndices);

      // Stress Events
      const stressCacheKey = `stress_${PLOT_ID}_NDMI_0.15`;
      let stressData = getCached(stressCacheKey);
      if (!stressData) {
        const stressRes = await axios.get(
          `${BASE_URL}/plots/${PLOT_ID}/stress?index_type=NDRE&threshold=0.15`
        );
        stressData = stressRes.data;
        setCached(stressCacheKey, stressData);
      }
      setAppState((prev: any) => ({
        ...prev,
        dashboardStressEvents: stressData?.events ?? [],
      }));

      // Summary/Analyze
      const summaryCacheKey = `analyze_${PLOT_ID}_${today}`;
      let summaryData = getCached(summaryCacheKey);
      if (!summaryData) {
        const analyzeRes = await axios.post(
          `${BASE_URL}/analyze?plot_name=${PLOT_ID}&date=${today}`
        );
        summaryData = analyzeRes.data;
        setCached(summaryCacheKey, summaryData);
      }
      const props = summaryData?.features?.[0]?.properties;

      // Recovery
      const recoveryCacheKey = `recovery_${PLOT_ID}`;
      let recoveryData = getCached(recoveryCacheKey);
      if (!recoveryData) {
        const recoveryRes = await axios.get(
          `${BASE_URL}/plots/${PLOT_ID}/recovery`
        );
        recoveryData = recoveryRes.data;
        setCached(recoveryCacheKey, recoveryData);
      }

      // Biomass
      const biomassCacheKey = `biomass_${PLOT_ID}`;
      let biomassData = getCached(biomassCacheKey);
      if (!biomassData) {
        const biomassRes = await axios.get(
          `${BASE_URL}/plots/${PLOT_ID}/biomass`
        );
        biomassData = biomassRes.data;
        setCached(biomassCacheKey, biomassData);
      }

      // Irrigation Events
      const irrigationCacheKey = `irrigation_${PLOT_ID}`;
      let irrigationData = getCached(irrigationCacheKey);
      if (!irrigationData) {
        const irrigationRes = await axios.get(
          `${BASE_URL}/plots/${PLOT_ID}/irrigation?threshold_ndmi=0.05&threshold_ndwi=0.05&min_days_between_events=10`
        );
        irrigationData = irrigationRes.data;
        setCached(irrigationCacheKey, irrigationData);
      }

      // Expected Yield
      const yieldCacheKey = `expected_yield_${PLOT_ID}`;
      let yieldData = getCached(yieldCacheKey);
      if (!yieldData) {
        const res = await axios.get(
          `${BASE_URL}/plots/${PLOT_ID}/sugar-yield/stats`
        );
        yieldData = res.data;
        setCached(yieldCacheKey, yieldData);
      }

      // Harvest Analysis
      const plantation_date = "2024-12-12";
      const variety_type = "Mid";
      const harvestCacheKey = `harvest_analysis_${PLOT_ID}_${plantation_date}_${variety_type}`;
      let harvestData = getCached(harvestCacheKey);
      if (!harvestData) {
        const res = await axios.get(
          `${BASE_URL}/plots/${PLOT_ID}/harvest-analysis?plantation_date=${plantation_date}&variety_type=${variety_type}`
        );
        harvestData = res.data;
        setCached(harvestCacheKey, harvestData);
      }

      // Soil data
      const soilCacheKey = `soil_${PLOT_ID}_${SOIL_DATE}`;
      let soilData = getCached(soilCacheKey);
      if (!soilData) {
        const res = await axios.post(
          `${SOIL_API_URL}/analyze?plot_name=${PLOT_ID}&date=${SOIL_DATE}`
        );
        soilData = res.data;
        setCached(soilCacheKey, soilData);
      }

      // Set all metrics from API responses
      const stats = soilData?.features?.[0]?.properties?.statistics;

      // Classification logic for growth stage
      let stage = "Absent";
      if (harvestData?.current_growth_stage) {
        const s = harvestData.current_growth_stage.toLowerCase();
        if (s.includes("harvested")) stage = "Harvested";
        else if (s.includes("partial")) stage = "Partially Harvested";
        else if (
          s.includes("growing") ||
          s.includes("growth") ||
          s.includes("maturity") ||
          s.includes("tillering") ||
          s.includes("grand")
        )
          stage = "Growing";
      }

      setMetrics({
        brix: props?.brix_statistics?.mean ?? null,
        recovery: recoveryData?.mean ?? null,
        area: props?.area_hectares ?? null,
        biomass: biomassData?.mean ?? null,
        stressCount: stressData?.total_events ?? 0,
        irrigationEvents: irrigationData?.total_events ?? null,
        expectedYield: yieldData?.expected_yield_percent ?? null,
        daysToHarvest: harvestData?.days_to_harvest ?? null,
        growthStage: stage,
        soilPH: stats?.phh2o != null ? Number(stats.phh2o.toFixed(2)) : null,
        organicCarbonDensity:
          stats?.organic_carbon_density != null
            ? Number(stats.organic_carbon_density.toFixed(2))
            : null,
        actualYield: props?.sugar_yield_statistics?.mean ?? null,
        cnRatio: props?.carbon_nitrogen_ratio ?? null,
      });
      setAppState((prev: any) => ({
        ...prev,
        dashboardData: {
          lineChartData: rawIndices,
          stressEvents: stressData?.events ?? [],
          metrics: metrics,
        },
      }));
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const fetchNDREStressEvents = async (): Promise<void> => {
    try {
      const res = await axios.get(
        `${BASE_URL}/plots/${PLOT_ID}/stress?index_type=NDRE&threshold=0.15`
      );
      const data = res.data;
      setNdreStressEvents(data.events ?? []);
      setShowNDREEvents(true);
    } catch (err) {
      console.error("Error fetching NDRE stress events:", err);
    }
  };

  // Combine line chart data with stress events
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
          stressLevel: stressEvent ? stressEvent.stress : undefined,
          isStressEvent: !!stressEvent,
          stressEventData: stressEvent,
        };
      });
      setCombinedChartData(combined);
    }
  }, [lineChartData, ndreStressEvents, showNDREEvents]);

  const toggleLine = (key: string): void => {
    const isOnlyThis = Object.keys(visibleLines).every((k) =>
      k === key
        ? visibleLines[k as keyof VisibleLines]
        : !visibleLines[k as keyof VisibleLines]
    );

    setVisibleLines(
      isOnlyThis
        ? { growth: true, stress: true, water: true, moisture: true }
        : {
            growth: key === 'growth',
            stress: key === 'stress',
            water: key === 'water',
            moisture: key === 'moisture'
          }
    );
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
    if (stress < 0.1) return "#dc2626"; // High stress - red
    if (stress < 0.15) return "#f97316"; // Medium stress - orange
    return "#eab308"; // Low stress - yellow
  };

  const getStressSeverityLabel = (stress: number): string => {
    if (stress < 0.1) return "High";
    if (stress < 0.15) return "Medium";
    return "Low";
  };

  // Custom dot component for stress events
  const CustomStressDot: React.FC<CustomStressDotProps> = (props) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.isStressEvent) return null;

    const color = getStressColor(payload.stressLevel);
    const radius =
      payload.stressLevel < 0.1 ? 12 : payload.stressLevel < 0.15 ? 10 : 8;

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={radius + 2}
          fill="white"
          stroke={color}
          strokeWidth={3}
          fillOpacity={0.9}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={color}
          fillOpacity={0.8}
          stroke={color}
          strokeWidth={2}
        />
      </g>
    );
  };

  const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    icon: Icon,
    color = "blue",
    unit = "",
  }) => (
    <div
      className={`bg-gradient-to-br from-${color}-50 to-${color}-100 hover:from-${color}-100 hover:to-${color}-150 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-${color}-200`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-6 h-6 text-${color}-600`} />
        <span className={`text-2xl font-bold text-${color}-800`}>
          {value}
          {unit}
        </span>
      </div>
      <p className={`text-sm font-medium text-${color}-700`}>{title}</p>
    </div>
  );

  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl backdrop-blur-sm">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            {formatDate(label || "")}
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
              <div key={index} className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
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

  const ChartLegend: React.FC = () => (
    <div className="flex flex-wrap gap-4 text-sm font-medium mb-4">
      {Object.entries(lineStyles).map(([key, { color, label }]) => (
        <button
          key={key}
          onClick={() => toggleLine(key)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-200 ${
            visibleLines[key as keyof VisibleLines]
              ? "bg-white shadow-md transform scale-105"
              : "bg-gray-100 opacity-50 hover:opacity-75"
          }`}
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-gray-700">{label}</span>
        </button>
      ))}
      {showNDREEvents && (
        <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-orange-100 rounded-lg border border-orange-300">
          <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-600"></div>
          <span className="text-orange-800 font-semibold">
            NDRE Stress Events
          </span>
        </div>
      )}
    </div>
  );

  // Chart data preparations
  const biomassData = [
    { name: "Optimal", value: OPTIMAL_BIOMASS, fill: "#22c55e" },
    { name: "Actual", value: metrics.biomass || 0, fill: "#3b82f6" },
  ];

  // const cnRatioData = [
  //   { name: "Carbon", value: 12, fill: "#22c55e" },
  //   { name: "Nitrogen", value: 1, fill: "#f59e0b" },
  // ];

  const yieldComparisonData = [
    { name: "Expected", value: metrics.expectedYield || 0, fill: "#8b5cf6" },
    { name: "Actual", value: metrics.actualYield || 0, fill: "#06b6d4" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🌾 Farm Plot {PLOT_ID}
              </h1>
              <p className="text-gray-600">Precision Agriculture Dashboard</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 bg-white/50 px-4 py-2 rounded-lg">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Field Area"
            value={metrics.area?.toFixed(2) || "-"}
            icon={Target}
            color="green"
            unit=" Ha"
          />
          <MetricCard
            title="Crop Status"
            value={metrics.growthStage || "-"}
            icon={Leaf}
            color="emerald"
          />
          <MetricCard
            title="Days to Harvest"
            value={metrics.daysToHarvest || "-"}
            icon={Calendar}
            color="orange"
          />
          <button
            onClick={fetchNDREStressEvents}
            onDoubleClick={() => setShowNDREEvents(!showNDREEvents)}
          >
            <MetricCard
              title="Stress Events"
              value={metrics.stressCount || "-"}
              icon={Activity}
              color="red"
            />
          </button>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expected Yield Gauge */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Expected Yield
              </h3>
            </div>
            <div className="flex justify-center">
              <PieChartWithNeedle
                value={metrics.expectedYield || 0}
                max={25}
                title="Sugar Yield"
                unit=" T/Ha"
                width={200}
                height={130}
              />
            </div>
          </div>

          {/* Biomass Comparison */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Biomass Status
              </h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={biomassData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toFixed(1)} kg`,
                      "",
                    ]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {biomassData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Yield Comparison */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Yield Comparison
              </h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={yieldComparisonData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toFixed(1)} T/Ha`,
                      "",
                    ]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {yieldComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Brix Level"
            value={metrics.brix?.toFixed(1) || "-"}
            icon={Droplets}
            color="blue"
            unit="°"
          />
          <MetricCard
            title="Recovery Rate"
            value={metrics.recovery?.toFixed(1) || "-"}
            icon={TrendingUp}
            color="green"
            unit="%"
          />
          <MetricCard
            title="Soil pH"
            value={metrics.soilPH || "-"}
            icon={Thermometer}
            color="yellow"
          />
          <MetricCard
            title="Organic Carbon"
            value={metrics.organicCarbonDensity || "-"}
            icon={Leaf}
            color="emerald"
          />
          <MetricCard
            title="Irrigation Events"
            value={metrics.irrigationEvents || "-"}
            icon={Droplets}
            color="cyan"
          />
          <MetricCard
            title="Avg Biomass"
            value={metrics.biomass?.toFixed(1) || "-"}
            icon={Activity}
            color="purple"
          />
        </div>

        {/* Main Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <LineChartIcon className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-800">
                Field Indices Analysis
              </h3>
            </div>
          </div>

          <ChartLegend />

          <div className="h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={combinedChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(tick: string) => {
                    const d = new Date(tick);
                    return `${d.toLocaleString("default", {
                      month: "short",
                    })}-${d.getFullYear()}`;
                  }}
                  stroke="#6b7280"
                />
                <YAxis domain={[-0.1, 0.6]} stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />

                {/* Stress event areas */}
                {showStressEvents &&
                  stressEvents.map((event, index) => (
                    <React.Fragment key={index}>
                      <ReferenceLine
                        x={event.from_date}
                        stroke="#dc2626"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `Start: ${formatDate(event.from_date)}`,
                          position: "top",
                          fontSize: 10,
                          fill: "#dc2626",
                        }}
                      />
                      <ReferenceLine
                        x={event.to_date}
                        stroke="#dc2626"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `End: ${formatDate(event.to_date)}`,
                          position: "top",
                          fontSize: 10,
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

                {/* NDRE Stress Events as big circles */}
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
      </div>
    </div>
  );
};

export default FarmerDashboard;
