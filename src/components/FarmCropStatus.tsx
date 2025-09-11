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
  ReferenceLine,
  ReferenceArea,
  Scatter,
  ComposedChart,
  BarChart,
  Bar,
} from "recharts";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import {
  Satellite,
  AlertTriangle,
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
  Users,
  MapPin,
  Beaker,
  Crop,
  Zap,
  Clock,
  Gauge,
  Filter,
  RefreshCw,
  Maximize2,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import axios from "axios";
// import { getCache, setCache } from "../utils/cache.js";

// Constants (same as FarmerDashboard)
const BASE_URL = "http://192.168.41.73:9000";
const OPTIMAL_BIOMASS = 150;
const SOIL_API_URL = "http://192.168.41.73:8001";
const SOIL_DATE = "2025-07-08";

// Dummy data for Officer Dashboard
const DUMMY_REPRESENTATIVES = [
  "Ajay Dhale",
  "Ananda Kale",
  "Amol Gajare",
  "vishal Deshmukh",
  "Laxman Gore",
];

const DUMMY_PLOTS_DATA: Record<
  string,
  {
    name: string;
    representative: string;
    farmer: string;
    coordinates: [number, number][];
  }
> = {
  "294725": {
    name: "294725",
    representative: "Ajay Dhale",
    farmer: "Ramesh Patil",
    coordinates: [
      [17.593396571531201, 75.042569285190794],
      [17.592833370521099, 75.042481538045394],
      [17.592804803223402, 75.042891683888499],
      [17.593390227200501, 75.042961338012105],
      [17.593396571531201, 75.042569285190794],
    ],
  },
  "kondiba galave 281215": {
    name: "kondiba galave 281215",
    representative: "Ajay Dhale",
    farmer: "Kondiba Galave",
    coordinates: [
      [17.4706093277299, 74.873249381271094],
      [17.4709226352991, 74.873042435658505],
      [17.471016278544099, 74.872705219970101],
      [17.470703991295501, 74.872663088038394],
      [17.470388419067199, 74.872739387972203],
      [17.4706093277299, 74.873249381271094],
    ],
  },
  "manohar galave 294654": {
    name: "manohar galave 294654",
    representative: "Ajay Dhale",
    farmer: "Manohar Galave",
    coordinates: [
      [17.482263160569001, 74.872452302412697],
      [17.4815619525681, 74.871016465236906],
      [17.481325217155, 74.8711039033536],
      [17.4819581000921, 74.872485781169999],
      [17.482263160569001, 74.872452302412697],
    ],
  },
  "nandkumar galave 290767": {
    name: "nandkumar galave 290767",
    representative: "Ananda Kale",
    farmer: "Nandkumar Galave",
    coordinates: [
      [17.4731936469244, 74.881129840722906],
      [17.473200492135401, 74.881241081011595],
      [17.473536067826199, 74.881165352560501],
      [17.4731936469244, 74.881129840722906],
    ],
  },
  "shahir galave 288977": {
    name: "shahir galave 288977",
    representative: "Amol Gajare",
    farmer: "Shahir Galave",
    coordinates: [
      [17.4675738291449, 74.886913088073698],
      [17.468162939349501, 74.886640951415202],
      [17.4678753923071, 74.886096096497596],
      [17.467349482602401, 74.8863046802512],
      [17.4675738291449, 74.886913088073698],
    ],
  },
  "Vijay galave 282550": {
    name: "Vijay galave 282550",
    representative: "vishal Deshmukh",
    farmer: "Vijay Galave",
    coordinates: [
      [17.467586038410101, 74.882111714419295],
      [17.467297803733601, 74.882144915564197],
      [17.467280894590601, 74.882752124904997],
      [17.467586038410101, 74.882111714419295],
    ],
  },
  "tukaram galave 283287": {
    name: "tukaram galave 283287",
    representative: "Laxman Gore",
    farmer: "Tukaram Galave",
    coordinates: [
      [17.458994356929502, 74.889139510734296],
      [17.458976586389799, 74.889089901510502],
      [17.4586127697855, 74.889206494264897],
      [17.458646648405399, 74.889288141829198],
      [17.458965085827401, 74.889148009133606],
      [17.458994356929502, 74.889139510734296],
    ],
  },
  "263122 Amol pralhad avtade": {
    name: "263122 Amol pralhad avtade",
    representative: "Amol Gajare",
    farmer: "Amol Pralhad Avtade",
    coordinates: [
      [17.668226429327301, 75.007621636932299],
      [17.6681844930845, 75.007435161891905],
      [17.668441578294601, 75.007485354642895],
      [17.668430720399702, 75.007179468091394],
      [17.6670301555428, 75.007388376867695],
      [17.667042275890701, 75.007748243706999],
      [17.668226429327301, 75.007621636932299],
    ],
  },
};

const OTHER_FARMERS_RECOVERY = {
  regional_average: 78.5,
  top_quartile: 85.2,
  bottom_quartile: 65.8,
  similar_farms: 76.3,
};

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

interface CustomStressDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
}

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

const FarmCropStatus: React.FC = () => {
  const center: [number, number] = [17.5789, 75.053];
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  // Plot selection state
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [plots, setPlots] = useState<string[]>([]);
  const [loadingPlots, setLoadingPlots] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [selectedRepresentative, setSelectedRepresentative] = useState<string>(
    "All Representatives"
  );
  const [filteredPlots, setFilteredPlots] = useState<string[]>([]);

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
  const [showStressEvents, setShowStressEvents] = useState<boolean>(false);
  const [ndreStressEvents, setNdreStressEvents] = useState<StressEvent[]>([]);
  const [showNDREEvents, setShowNDREEvents] = useState<boolean>(false);
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

  // useEffect hooks
  useEffect(() => {
    fetchPlots();
  }, []);

  useEffect(() => {
    // Initialize filtered plots with all plots
    setFilteredPlots(plots);
  }, [plots]);

  useEffect(() => {
    if (selectedPlotId) {
      fetchAllData();
      // Fetch coordinates for the selected plot
      fetchPlotCoordinates(selectedPlotId);
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
      // Generate dummy data for the selected plot
      const plotData =
        DUMMY_PLOTS_DATA[selectedPlotId as keyof typeof DUMMY_PLOTS_DATA];

      // Generate dummy line chart data
      const dummyLineData: LineChartData[] = [];
      const today = new Date();
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dummyLineData.push({
          date: date.toISOString().split("T")[0],
          growth: 0.3 + Math.random() * 0.3, // 0.3 to 0.6
          stress: 0.1 + Math.random() * 0.2, // 0.1 to 0.3
          water: 0.2 + Math.random() * 0.3, // 0.2 to 0.5
          moisture: 0.25 + Math.random() * 0.25, // 0.25 to 0.5
        });
      }
      setLineChartData(dummyLineData);

      // Generate dummy stress events
      const dummyStressEvents: StressEvent[] = [
        {
          from_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          to_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          stress: 0.25,
        },
        {
          from_date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          to_date: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          stress: 0.18,
        },
      ];
      setStressEvents(dummyStressEvents);

      // Generate dummy NDRE stress events
      const dummyNDREStressEvents: StressEvent[] = [
        {
          from_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          to_date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          stress: 0.22,
        },
        {
          from_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          to_date: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          stress: 0.15,
        },
      ];
      setNdreStressEvents(dummyNDREStressEvents);

      // Generate dummy metrics based on plot data
      const dummyMetrics: Metrics = {
        brix: 18.5 + Math.random() * 3, // 18.5 to 21.5
        recovery: 75 + Math.random() * 10, // 75 to 85
        area: plotData ? 2.5 + Math.random() * 3 : null, // 2.5 to 5.5 Ha
        biomass: 120 + Math.random() * 60, // 120 to 180 kg/ha
        stressCount: dummyStressEvents.length,
        irrigationEvents: 3 + Math.floor(Math.random() * 5), // 3 to 7
        expectedYield: 350 + Math.random() * 100, // 350 to 450 T/Ha
        daysToHarvest: 45 + Math.floor(Math.random() * 30), // 45 to 75 days
        growthStage: "Growing",
        soilPH: 6.5 + Math.random() * 1, // 6.5 to 7.5
        organicCarbonDensity: 12 + Math.random() * 8, // 12 to 20 g/kg
        actualYield: 320 + Math.random() * 80, // 320 to 400 T/Ha
        cnRatio: 10 + Math.random() * 5, // 10 to 15
      };
      setMetrics(dummyMetrics);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch plots from API
  const fetchPlots = async (): Promise<void> => {
    setLoadingPlots(true);
    try {
      // Use dummy plots data instead of API call
      const dummyPlotIds = Object.keys(DUMMY_PLOTS_DATA);
      setPlots(dummyPlotIds);
    } catch (error) {
      console.error("Error fetching plots:", error);
    } finally {
      setLoadingPlots(false);
    }
  };

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
      // Use dummy data instead of API call
      const plotData =
        DUMMY_PLOTS_DATA[plotId as keyof typeof DUMMY_PLOTS_DATA];
      if (plotData && plotData.coordinates) {
        console.log("Using dummy coordinates for plot:", plotId);
        setPlotCoordinates(plotData.coordinates);

        // Cache the coordinates
        setPlotCoordinatesCache(
          (prev) => new Map(prev.set(plotId, plotData.coordinates))
        );

        // Calculate and set map center
        const center = calculateCenter(plotData.coordinates);
        console.log("Calculated map center:", center);
        setMapCenter(center);
        setMapKey((prev) => prev + 1);
      } else {
        console.log("No dummy data found for plot:", plotId);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Header */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <div className="flex flex-col flex-1 sm:flex-none">
                  <label className="text-sm font-semibold text-gray-700 mb-2">
                    Representative
                  </label>
                  <select
                    className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm w-full sm:w-64"
                    value={selectedRepresentative}
                    onChange={(e) => {
                      const newRepresentative = e.target.value;
                      setSelectedRepresentative(newRepresentative);
                      if (newRepresentative === "All Representatives") {
                        setFilteredPlots(plots);
                      } else {
                        setFilteredPlots(
                          plots.filter(
                            (plot) =>
                              DUMMY_PLOTS_DATA[plot]?.representative ===
                              newRepresentative
                          )
                        );
                      }
                      setSelectedPlotId(""); // Clear selected plot when representative changes
                      setPlotCoordinates([]);
                      setMapCenter([17.5789, 75.053]);
                      setMapKey((prev) => prev + 1);
                    }}
                  >
                    <option value="All Representatives">
                      All Representatives
                    </option>
                    {DUMMY_REPRESENTATIVES.map((rep, index) => (
                      <option key={index} value={rep}>
                        {rep}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col flex-1 sm:flex-none">
                  <label className="text-sm font-semibold text-gray-700 mb-2">
                    Plot Selection
                  </label>
                  <select
                    className="px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm w-full sm:w-64"
                    value={selectedPlotId}
                    onChange={(e) => {
                      const newPlotId = e.target.value;
                      setSelectedPlotId(newPlotId);
                      if (newPlotId) {
                        // Immediately fetch coordinates and update map
                        fetchPlotCoordinates(newPlotId);
                      }
                    }}
                    disabled={loadingPlots || filteredPlots.length === 0}
                  >
                    {loadingPlots ? (
                      <option>Loading plots...</option>
                    ) : filteredPlots.length === 0 ? (
                      <option>
                        No plots available for selected representative
                      </option>
                    ) : (
                      <>
                        <option value="">Select a plot</option>
                        {filteredPlots.map((plot, index) => (
                          <option key={index} value={plot}>
                            {plot}
                          </option>
                        ))}
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
                  ) : (
                    // metrics.brix?.toFixed(1) || "-"
                    "-"
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                    <Satellite className="w-5 h-5 animate-spin" />
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
                          <strong>Farmer:</strong>{" "}
                          {DUMMY_PLOTS_DATA[selectedPlotId]?.farmer}
                        </p>
                        <p>
                          <strong>Representative:</strong>{" "}
                          {DUMMY_PLOTS_DATA[selectedPlotId]?.representative}
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
                max={100}
                title="Expected Yield"
                unit="T/Ha"
                width={220}
                height={140}
              />
              <div className="mt-4 text-center">
                <div className="text-sm text-gray-600">
                  Performance:{" "}
                  <span className="font-semibold text-purple-600">
                    {(((metrics.expectedYield || 0) / 100) * 100).toFixed(1)}%
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
                  domain={[-0.1, 0.6]}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />

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

export default FarmCropStatus;
