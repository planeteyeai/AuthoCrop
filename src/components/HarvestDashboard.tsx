import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import {
  MapPin,
  ChevronDown,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Maximize2,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  ComposedChart,
  Area,
} from "recharts";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMap } from "react-leaflet";

const BASE_URL = "http://192.168.41.51:9000";
const PLOT_ID = 289138;

// Chart Types
const CHART_TYPES = {
  BRIX: "brix",
  HARVEST: "harvest",
  PLANTATION: "plantation",
} as const;

type ChartType = (typeof CHART_TYPES)[keyof typeof CHART_TYPES];

// Type definitions
interface RepresentativeEndpoint {
  name: string;
  url: string;
}

interface Filters {
  region: string;
  representative: string;
  sugarcaneType: string;
  variety: string;
}

interface DateRange {
  start: string;
  end: string;
}

interface HarvestData {
  id?: string;
  "Plot No"?: string;
  "plot in no."?: string;
  Latitude: number;
  Longitude: number;
  "Sugarcane Status": string;
  "Area (Hect)": number;
  Days: number;
  "Prediction Yield (T/Ha)": number;
  "Brix (Degree)": number;
  "Recovery (Degree)": number;
  "Distance (km)": number;
  Stage: string;
  Region: string;
  "Sugarcane Type": string;
  Variety: string;
  representative?: string;
  representativeUrl?: string;
}

interface PlotPoint {
  id: string | number;
  position: [number, number];
  status: string;
  plotNo: string;
  area: string;
  raw: HarvestData;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface BrixData {
  day: number;
  value: number;
}

interface HarvestChartData {
  day: number;
  area: number;
}

interface StageDistribution {
  stage: string;
  plots: number;
  color: string;
}

interface KeyMetric {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

interface BrixTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface HarvestTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface MapAutoCenterProps {
  center: [number, number];
}

interface CombinedChartProps {
  brixData: BrixData[];
  harvestData: HarvestChartData[];
  stageDistribution: StageDistribution[];
  filteredData: HarvestData[];
  harvestRange: [number, number];
  setHarvestRange: (range: [number, number]) => void;
  activeChart: ChartType;
  setActiveChart: (chart: ChartType) => void;
}

// List of representative endpoints
const REPRESENTATIVE_ENDPOINTS: RepresentativeEndpoint[] = [
  { name: "Ajay Dhale", url: "http://localhost:3000/Ajay Dhale" },
  { name: "Sri Sri", url: "http://localhost:3000/Sri Sri" },
  { name: "Amol Gajare", url: "http://localhost:3000/Amol Gajare" },
  { name: "Ananda Kale", url: "http://localhost:3000/Ananda Kale" },
  { name: "Avatade Pravin", url: "http://localhost:3000/Avatade Pravin" },
  { name: "Bapu Devkate", url: "http://localhost:3000/Bapu Devkate" },
  { name: "Ganesh", url: "http://localhost:3000/Ganesh" },
  { name: "Somnath Patil", url: "http://localhost:3000/Somnath Patil" },
  { name: "Tushar Kale", url: "http://localhost:3000/Tushar Kale" },
  { name: "Ajit Sawant 5", url: "http://localhost:3000/Ajit Sawant 5" },
  { name: "Ajit Sawant 6", url: "http://localhost:3000/Ajit Sawant 6" },
  { name: "Ajit Sawant 7", url: "http://localhost:3000/Ajit Sawant 7" },
  { name: "Ajit Sawant 8", url: "http://localhost:3000/Ajit Sawant 8" },
  { name: "Ajit Sawant 9", url: "http://localhost:3000/Ajit Sawant 9" },
  { name: "Ajit Sawant 10", url: "http://localhost:3000/Ajit Sawant 10" },
  { name: "Ajit Sawant 11", url: "http://localhost:3000/Ajit Sawant 11" },
  { name: "Dagade Meghnath", url: "http://localhost:3000/Dagade Meghnath" },
  { name: "Datta Bhandgar", url: "http://localhost:3000/Datta Bhandgar" },
  { name: "Dhiraj", url: "http://localhost:3000/Dhiraj" },
  { name: "Ganesh Mane", url: "http://localhost:3000/Ganesh Mane" },
  { name: "Sayyad Taher", url: "http://localhost:3000/Sayyad Taher" },
  { name: "Ajit Keche", url: "http://localhost:3000/Ajit Keche" },
  { name: "Ajit Sawant 1", url: "http://localhost:3000/Ajit Sawant 1" },
  { name: "Sunil Shinde", url: "http://localhost:3000/Sunil Shinde" },
  { name: "Shashikant Dethe", url: "http://localhost:3000/Shashikant Dethe" },
  { name: "Mangesh Devkate", url: "http://localhost:3000/Mangesh Devkate" },
  { name: "Bharat Kesarkar", url: "http://localhost:3000/Bharat Kesarkar" },
  { name: "Ajit Sawant 4", url: "http://localhost:3000/Ajit Sawant 4" },
  { name: "Ajit Sawant 2", url: "http://localhost:3000/Ajit Sawant 2" },
  { name: "Jitendra Disale", url: "http://localhost:3000/Jitendra Disale" },
  { name: "Kolegaon West", url: "http://localhost:3000/Kolegaon West" },
  { name: "Mauli Waghmode", url: "http://localhost:3000/Mauli Waghmode" },
  { name: "Nikhil Bandgar", url: "http://localhost:3000/Nikhil Bandgar" },
  { name: "Prakash Kale", url: "http://localhost:3000/Prakash Kale" },
  { name: "Sachin Khatke", url: "http://localhost:3000/Sachin Khatke" },
  { name: "Samadhan Kamate", url: "http://localhost:3000/Samadhan Kamate" },
  { name: "Santosh Hulge", url: "http://localhost:3000/Santosh Hulge" },
  { name: "Satish Dubule", url: "http://localhost:3000/Satish Dubule" },
  { name: "Onkar Mane", url: "http://localhost:3000/Onkar Mane" },
];

const ALL_REPRESENTATIVES = [
  "All",
  ...REPRESENTATIVE_ENDPOINTS.map((r) => r.name),
];

// Filter options
const REGION_OPTIONS = [
  "All",
  "Atpadi",
  "Indapur",
  "Madha",
  "Malshiras",
  "Pandharpur",
  "Sangole",
];
const SUGARCANE_TYPE_OPTIONS = ["All", "Adsali", "Ratoon", "Suru"];
const VARIETY_OPTIONS = ["All", "Phule 265"];

// Color maps for filter-wise plotting
const REGION_COLORS: { [key: string]: string } = {
  Atpadi: "#3B82F6",
  Indapur: "#60A5FA",
  Madha: "#FB923C",
  Malshiras: "#10B981",
  Pandharpur: "#6366F1",
  Sangole: "#eab308",
};
const SUGARCANE_TYPE_COLORS: { [key: string]: string } = {
  Adsali: "#3B82F6",
  Ratoon: "#60A5FA",
  Suru: "#FB923C",
};
const VARIETY_COLORS: { [key: string]: string } = {
  "Phule 265": "#10B981",
};

// Pie chart color palette (used for both pie and map points)
const STATUS_COLOR_PALETTE = [
  "#3B82F6",
  "#60A5FA",
  "#FB923C",
  "#10B981",
  "#6366F1",
  "#eab308",
  "#888",
];

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// Combined Chart Component
const CombinedChart: React.FC<CombinedChartProps> = ({
  brixData,
  harvestData,
  stageDistribution,
  filteredData,
  harvestRange,
  setHarvestRange,
  activeChart,
  setActiveChart,
}) => {
  // Add styles for the slider
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .slider-thumb::-webkit-slider-thumb {
        appearance: none;
        height: 12px;
        width: 12px;
        border-radius: 50%;
        background: #10B981;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .slider-thumb::-moz-range-thumb {
        height: 12px;
        width: 12px;
        border-radius: 50%;
        background: #10B981;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Custom tooltip for Brix chart
  const BrixTooltip: React.FC<BrixTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const day = entry.day;
      const brixValues = filteredData
        .filter(
          (item) =>
            item.Days === day && typeof item["Brix (Degree)"] === "number"
        )
        .map((item) => item["Brix (Degree)"]);
      const avgBrix = brixValues.length
        ? (brixValues.reduce((a, b) => a + b, 0) / brixValues.length).toFixed(2)
        : "-";
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <div className="text-sm">
            <strong>Days:</strong> {day}
          </div>
          <div className="text-sm">
            <strong>Avg. Brix Value:</strong> {avgBrix}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for Harvest chart
  const HarvestTooltip: React.FC<HarvestTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <div className="text-sm">
            <strong>Days:</strong> {entry.day}
          </div>
          <div className="text-sm">
            <strong>Avg Yield (T/Ha):</strong> {entry.area?.toFixed(2)}
          </div>
          <div className="text-sm">
            <strong>Plot Count:</strong> {entry.count}
          </div>
          <div className="text-sm">
            <strong>Total Yield:</strong> {entry.totalYield?.toFixed(2)}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartButtons = [
    { id: CHART_TYPES.BRIX, label: "Brix Value Prediction" },
    { id: CHART_TYPES.PLANTATION, label: "Plot wise Sugarcane Plantation" },
    { id: CHART_TYPES.HARVEST, label: "Ready To Harvest" },
  ];

  const renderChart = () => {
    switch (activeChart) {
      case CHART_TYPES.BRIX:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={brixData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                label={{
                  value: "Days",
                  position: "insideBottom",
                  offset: -1,
                }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                label={{
                  value: "Total Area",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                }}
              />
              <Tooltip content={<BrixTooltip />} />
              <Bar dataKey="value" fill="#3B82F6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case CHART_TYPES.HARVEST:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={harvestData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                label={{
                  value: "Days",
                  position: "insideBottom",
                  offset: -1,
                }}
                scale="linear"
                type="number"
                domain={["dataMin", "dataMax"]}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                label={{
                  value: "Yield (T/Ha)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                }}
                yAxisId="left"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: "#e5e7eb" }}
                label={{
                  value: "Count",
                  angle: 90,
                  position: "insideRight",
                  offset: 10,
                }}
                yAxisId="right"
                orientation="right"
              />
              <Tooltip content={<HarvestTooltip />} />
              <Area
                type="monotone"
                dataKey="area"
                fill="#10B981"
                fillOpacity={0.3}
                stroke="#10B981"
                strokeWidth={2}
                yAxisId="left"
              />
              <Line
                type="monotone"
                dataKey="area"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                yAxisId="left"
              />
              <Bar
                dataKey="count"
                fill="#3B82F6"
                fillOpacity={0.6}
                yAxisId="right"
                radius={[2, 2, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case CHART_TYPES.PLANTATION:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 10, angle: 0, dy: 10 }}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 14 }}
                axisLine={{ stroke: "#e5e7eb" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="plots" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="plots" position="top" />
                {stageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[500px] flex flex-col">
      {/* Toggle Buttons and Slider */}
      <div className="flex justify-between items-center border-b border-gray-200 p-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {chartButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => setActiveChart(button.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeChart === button.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>

        {/* Harvest Range Slider - Only show for harvest chart */}
        {activeChart === CHART_TYPES.HARVEST && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-600">
                Days Range
              </span>
              <span className="text-xs text-gray-500">
                ({harvestRange[0]} - {harvestRange[1]})
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="200"
              value={harvestRange[1]}
              onChange={(e) =>
                setHarvestRange([harvestRange[0], parseInt(e.target.value)])
              }
              className="w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div className="flex-1 p-4">{renderChart()}</div>
    </div>
  );
};

const HarvestDashboard: React.FC = () => {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [activeChart, setActiveChart] = useState<ChartType>(CHART_TYPES.BRIX);
  const [filters, setFilters] = useState<Filters>({
    region: "All",
    representative: "All",
    sugarcaneType: "All",
    variety: "All",
  });

  const [dateRange, setDateRange] = useState<DateRange>({
    start: "2024-12-14",
    end: "2024-12-14",
  });

  const [harvestRange, setHarvestRange] = useState<[number, number]>([
    -50, 100,
  ]);

  const [indices, setIndices] = useState<any[]>([]);
  const [stressEvents, setStressEvents] = useState<any[]>([]);
  const [stressCount, setStressCount] = useState<number>(0);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [area, setArea] = useState<number | null>(null);
  const [expectedYield, setExpectedYield] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<number | null>(null);
  const [plantationStages, setPlantationStages] = useState<any[]>([]);
  const [rawData, setRawData] = useState<HarvestData[]>([]);
  const [loadingStress, setLoadingStress] = useState<boolean>(false);

  // Debounce non-representative filters
  const debouncedRegion = useDebouncedValue(filters.region, 300);
  const debouncedSugarcaneType = useDebouncedValue(filters.sugarcaneType, 300);
  const debouncedVariety = useDebouncedValue(filters.variety, 300);

  const getRepresentativeEndpoints = (): string[] => {
    if (!filters.representative || filters.representative === "All") {
      return REPRESENTATIVE_ENDPOINTS.map((r) => r.url);
    }
    const found = REPRESENTATIVE_ENDPOINTS.find(
      (r) => r.name === filters.representative
    );
    return found ? [found.url] : [];
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch data from all representative endpoints
        let allData: HarvestData[] = [];

        for (const rep of REPRESENTATIVE_ENDPOINTS) {
          try {
            console.log(`Fetching data from ${rep.name} at ${rep.url}`);
            const response = await axios.get(rep.url);

            if (response.data && Array.isArray(response.data)) {
              // Add representative information to each data point
              const dataWithRep = response.data.map((item: any) => ({
                ...item,
                representative: rep.name,
                representativeUrl: rep.url,
              }));

              allData = allData.concat(dataWithRep);
              console.log(
                `Successfully fetched ${dataWithRep.length} records from ${rep.name}`
              );
            } else {
              console.warn(
                `Invalid data format from ${rep.name}:`,
                response.data
              );
            }
          } catch (err) {
            console.warn(
              `Failed to fetch from ${rep.name} at ${rep.url}:`,
              err
            );

            // Fallback to mock data if API fails
            const mockData: HarvestData[] = [
              {
                id: rep.name + "-1",
                "Plot No": `${rep.name}-P001`,
                Latitude: 19.765 + Math.random() * 0.01,
                Longitude: 74.475 + Math.random() * 0.01,
                "Sugarcane Status": "Ready to Harvest",
                "Area (Hect)": 2.5 + Math.random() * 2,
                Days: 45 + Math.floor(Math.random() * 30),
                "Prediction Yield (T/Ha)": 85 + Math.random() * 20,
                "Brix (Degree)": 20.5 + Math.random() * 5,
                "Recovery (Degree)": 10.2 + Math.random() * 2,
                "Distance (km)": 2.3 + Math.random() * 5,
                Stage: "Maturity",
                Region: [
                  "Atpadi",
                  "Indapur",
                  "Madha",
                  "Malshiras",
                  "Pandharpur",
                  "Sangole",
                ][Math.floor(Math.random() * 6)],
                "Sugarcane Type": ["Adsali", "Ratoon", "Suru"][
                  Math.floor(Math.random() * 3)
                ],
                Variety: "Phule 265",
                representative: rep.name,
                representativeUrl: rep.url,
              },
              {
                id: rep.name + "-2",
                "Plot No": `${rep.name}-P002`,
                Latitude: 19.764 + Math.random() * 0.01,
                Longitude: 74.476 + Math.random() * 0.01,
                "Sugarcane Status": "Growing",
                "Area (Hect)": 1.8 + Math.random() * 2,
                Days: 30 + Math.floor(Math.random() * 30),
                "Prediction Yield (T/Ha)": 70 + Math.random() * 20,
                "Brix (Degree)": 18.2 + Math.random() * 5,
                "Recovery (Degree)": 9.5 + Math.random() * 2,
                "Distance (km)": 1.8 + Math.random() * 5,
                Stage: "Vegetative",
                Region: [
                  "Atpadi",
                  "Indapur",
                  "Madha",
                  "Malshiras",
                  "Pandharpur",
                  "Sangole",
                ][Math.floor(Math.random() * 6)],
                "Sugarcane Type": ["Adsali", "Ratoon", "Suru"][
                  Math.floor(Math.random() * 3)
                ],
                Variety: "Phule 265",
                representative: rep.name,
                representativeUrl: rep.url,
              },
            ];
            allData = allData.concat(mockData);
          }
        }

        console.log(
          `Total data fetched: ${allData.length} records from all representatives`
        );
        setRawData(allData);
      } catch (err) {
        console.error("API fetch error", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Memoize filteredData and all derived data
  const filteredData = useMemo(
    () =>
      rawData.filter((item) => {
        const regionMatch =
          debouncedRegion === "All" || item.Region === debouncedRegion;
        const repMatch =
          filters.representative === "All" ||
          item.representative === filters.representative;
        const typeMatch =
          debouncedSugarcaneType === "All" ||
          item["Sugarcane Type"] === debouncedSugarcaneType;
        const varietyMatch =
          debouncedVariety === "All" || item.Variety === debouncedVariety;
        return regionMatch && repMatch && typeMatch && varietyMatch;
      }),
    [
      rawData,
      debouncedRegion,
      filters.representative,
      debouncedSugarcaneType,
      debouncedVariety,
    ]
  );

  // Pie Chart Data for Sugarcane Status - Fixed Labels
  const FIXED_STATUS_LABELS = [
    "Harvested",
    "Growing",
    "Partially Harvested",
    "Ready to Harvest",
  ];

  const statusCounts = useMemo(
    () =>
      filteredData.reduce((acc: { [key: string]: number }, item) => {
        const status = item["Sugarcane Status"];
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    [filteredData]
  );

  const statusColorMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    FIXED_STATUS_LABELS.forEach((label, i) => {
      map[label] = STATUS_COLOR_PALETTE[i % STATUS_COLOR_PALETTE.length];
    });
    return map;
  }, []);

  const plotStatusData = useMemo(
    () =>
      FIXED_STATUS_LABELS.map((label) => ({
        name: label,
        value: statusCounts[label] || 0,
        color: statusColorMap[label],
      })),
    [statusCounts, statusColorMap]
  );

  // Note: Using fixed status labels, so all statuses are pre-assigned colors

  // Map Points for Map - Filtered by harvest range when harvest chart is active
  const plotPoints = useMemo(() => {
    // If harvest chart is active, filter by harvest range
    let dataToUse = filteredData;
    if (activeChart === CHART_TYPES.HARVEST) {
      dataToUse = filteredData.filter((item) => {
        if (typeof item.Days === "number") {
          return item.Days >= harvestRange[0] && item.Days <= harvestRange[1];
        }
        return false;
      });
    }

    return dataToUse.map((item, idx) => ({
      id: item.id || idx,
      position: [item.Latitude, item.Longitude] as [number, number],
      status: item["Sugarcane Status"],
      plotNo: item["Plot No"] || item["plot in no."] || `P${idx + 1}`,
      area: `${item["Area (Hect)"]} Ha`,
      raw: item,
    }));
  }, [filteredData, activeChart, harvestRange]);

  // Brix Value Prediction: Total Area vs Days
  const brixData = useMemo(() => {
    const brixAreaByDay: { [key: number]: number } = {};
    filteredData.forEach((item) => {
      if (
        typeof item.Days === "number" &&
        typeof item["Area (Hect)"] === "number"
      ) {
        brixAreaByDay[item.Days] =
          (brixAreaByDay[item.Days] || 0) + item["Area (Hect)"];
      }
    });
    return Object.entries(brixAreaByDay)
      .map(([day, area]) => ({ day: Number(day), value: area }))
      .sort((a, b) => a.day - b.day);
  }, [filteredData]);

  // Line Chart Data for Ready to Harvest (Days vs Prediction Yield) - Aggregated for better performance
  const harvestData = useMemo(() => {
    // Filter data based on harvest range
    const rangeFilteredData = filteredData.filter((item) => {
      if (typeof item.Days === "number") {
        return item.Days >= harvestRange[0] && item.Days <= harvestRange[1];
      }
      return false;
    });

    // Group data by days and calculate average yield for each day
    const dayGroups = rangeFilteredData.reduce(
      (acc: { [key: number]: number[] }, item) => {
        if (
          typeof item.Days === "number" &&
          typeof item["Prediction Yield (T/Ha)"] === "number"
        ) {
          if (!acc[item.Days]) {
            acc[item.Days] = [];
          }
          acc[item.Days].push(item["Prediction Yield (T/Ha)"]);
        }
        return acc;
      },
      {}
    );

    // Calculate average yield for each day and create chart data
    return Object.entries(dayGroups)
      .map(([day, yieldValues]) => ({
        day: Number(day),
        area:
          yieldValues.reduce((sum, val) => sum + val, 0) / yieldValues.length, // Average yield
        count: yieldValues.length, // Number of plots for this day
        totalYield: yieldValues.reduce((sum, val) => sum + val, 0), // Total yield
      }))
      .sort((a, b) => a.day - b.day);
  }, [filteredData, harvestRange]);

  // Stage Distribution for Bar Chart
  const stageDistribution = useMemo(() => {
    const stageCounts = filteredData.reduce(
      (acc: { [key: string]: number }, item) => {
        const stage = item.Stage;

        // Group stages according to requirements
        let groupedStage = stage;
        if (stage && stage.toLowerCase().includes("vegetative")) {
          groupedStage = "Tillering Stage";
        } else if (stage && stage.toLowerCase().includes("maturity")) {
          groupedStage = "Maturity Stage";
        } else if (stage && stage.toLowerCase().includes("germination")) {
          groupedStage = "Germination Stage";
        } else if (stage && stage.toLowerCase().includes("grand growth")) {
          groupedStage = "Grand Growth Stage";
        }

        acc[groupedStage] = (acc[groupedStage] || 0) + 1;
        return acc;
      },
      {}
    );

    // Define the 4 stages in the required order with their colors
    const requiredStages = [
      { stage: "Germination Stage", color: STATUS_COLOR_PALETTE[0] },
      { stage: "Grand Growth Stage", color: STATUS_COLOR_PALETTE[1] },
      { stage: "Maturity Stage", color: STATUS_COLOR_PALETTE[2] },
      { stage: "Tillering Stage", color: STATUS_COLOR_PALETTE[3] },
    ];

    // Create the final array with only the 4 required stages
    return requiredStages.map(({ stage, color }) => ({
      stage,
      plots: stageCounts[stage] || 0,
      color,
    }));
  }, [filteredData]);

  // Representative Summary
  const representativeSummary = useMemo(() => {
    const repData = filteredData.reduce(
      (acc: { [key: string]: any[] }, item) => {
        const rep = item.representative || "Unknown";
        if (!acc[rep]) {
          acc[rep] = [];
        }
        acc[rep].push(item);
        return acc;
      },
      {}
    );

    return Object.entries(repData)
      .map(([rep, data]) => {
        const totalArea = data.reduce(
          (sum, item) => sum + (item["Area (Hect)"] || 0),
          0
        );
        const avgYield =
          data.reduce(
            (sum, item) => sum + (item["Prediction Yield (T/Ha)"] || 0),
            0
          ) / data.length;
        const avgBrix =
          data.reduce((sum, item) => sum + (item["Brix (Degree)"] || 0), 0) /
          data.length;

        return {
          representative: rep,
          plotCount: data.length,
          totalArea: totalArea.toFixed(2),
          avgYield: avgYield.toFixed(2),
          avgBrix: avgBrix.toFixed(2),
          regions: [...new Set(data.map((item) => item.Region))],
          statuses: [...new Set(data.map((item) => item["Sugarcane Status"]))],
        };
      })
      .sort((a, b) => b.plotCount - a.plotCount);
  }, [filteredData]);

  // Key Metrics
  const keyMetrics = useMemo(() => {
    const totalArea = filteredData.reduce(
      (sum, item) => sum + (item["Area (Hect)"] || 0),
      0
    );
    const avgYield = filteredData.length
      ? (
          filteredData.reduce(
            (sum, item) => sum + (item["Prediction Yield (T/Ha)"] || 0),
            0
          ) / filteredData.length
        ).toFixed(2)
      : "-";
    const avgRecovery = filteredData.length
      ? (
          filteredData.reduce(
            (sum, item) => sum + (item["Recovery (Degree)"] || 0),
            0
          ) / filteredData.length
        ).toFixed(2)
      : "-";
    return [
      {
        label: "Total Area (Ha)",
        value: totalArea ? totalArea.toFixed(2) : "-",
        icon: BarChart3,
      },
      {
        label: "Avg. Distance (KM)",
        value: filteredData.length
          ? (
              filteredData.reduce(
                (sum, item) => sum + (item["Distance (km)"] || 0),
                0
              ) / filteredData.length
            ).toFixed(2)
          : "-",
        icon: MapPin,
      },
      {
        label: "Expected Yield (T/Ha)",
        value: avgYield,
        icon: TrendingUp,
      },
      {
        label: "Recovery % (Expected)",
        value: avgRecovery,
        icon: Activity,
      },
    ];
  }, [filteredData]);

  // Map Centering Logic
  const mapCenter = useMemo((): [number, number] => {
    if (filteredData.length > 0) {
      const avgLat =
        filteredData.reduce((sum, item) => sum + (item.Latitude || 0), 0) /
        filteredData.length;
      const avgLng =
        filteredData.reduce((sum, item) => sum + (item.Longitude || 0), 0) /
        filteredData.length;
      return [avgLat, avgLng];
    }
    return [19.765, 74.475];
  }, [filteredData]);

  // Map Point Coloring: use sugarcane status color
  const getPlotColor = useMemo(
    () =>
      (item: HarvestData): string => {
        const status = item["Sugarcane Status"];
        return statusColorMap[status] || STATUS_COLOR_PALETTE[0];
      },
    [statusColorMap]
  );

  // --- Map recentering effect ---
  function MapAutoCenter({ center }: MapAutoCenterProps) {
    const map = useMap();
    useEffect(() => {
      if (center && Array.isArray(center) && !center.some(isNaN)) {
        map.setView(center, map.getZoom());
      }
    }, [center, map]);
    return null;
  }

  const FilterDropdown: React.FC<FilterDropdownProps> = ({
    label,
    value,
    options,
    onChange,
  }) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative  box-border">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {/* Chevron icon positioned absolutely inside the select container */}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {/* Data Loading Status */}
          {loading && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">
                  Fetching data from {REPRESENTATIVE_ENDPOINTS.length}{" "}
                  representative endpoints...
                </span>
              </div>
            </div>
          )}

          {/* Data Summary
          {!loading && rawData.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-800">
                  ✅ Successfully loaded {rawData.length} data points from{" "}
                  {new Set(rawData.map((item) => item.representative)).size}{" "}
                  representatives
                </span>
                <span className="text-sm text-green-600">
                  {filteredData.length} points match current filters
                </span>
              </div>
            </div>
          )} */}

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
              <Calendar className="w-4 h-4 text-blue-500" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="border-none outline-none text-sm"
              />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {keyMetrics.map((metric, index) => {
              const IconComponent = metric.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {metric.value}
                  </div>
                  <div className="text-sm text-gray-600">{metric.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-3 space-y-2">
            {/* Filters */}
            <div className="bg-white rounded-xl p-2 border-gray-100">
              <FilterDropdown
                label="Region"
                value={filters.region}
                options={REGION_OPTIONS}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, region: value }))
                }
              />

              <FilterDropdown
                label="Representative"
                value={filters.representative}
                options={ALL_REPRESENTATIVES}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, representative: value }))
                }
              />

              <FilterDropdown
                label="Sugarcane Type"
                value={filters.sugarcaneType}
                options={SUGARCANE_TYPE_OPTIONS}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, sugarcaneType: value }))
                }
              />

              <FilterDropdown
                label="Variety"
                value={filters.variety}
                options={VARIETY_OPTIONS}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, variety: value }))
                }
              />
            </div>
          </div>

          {/* Center - Map and Sugarcane Status */}
          <div className="lg:col-span-9 space-y-6">
            {/* Map and Sugarcane Status Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative w-full h-[400px]">
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

                  <div ref={mapWrapperRef} className="w-full h-full">
                    <MapContainer
                      center={mapCenter}
                      zoom={15}
                      minZoom={1}
                      maxZoom={25}
                      className="w-full h-full"
                      style={{
                        height: "100%",
                        width: "100%",
                        borderRadius: "inherit",
                      }}
                    >
                      <MapAutoCenter center={mapCenter} />
                      <TileLayer
                        url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                        attribution="© Google"
                        maxZoom={25}
                        maxNativeZoom={21}
                        minZoom={1}
                        tileSize={256}
                        zoomOffset={0}
                      />

                      {/* Main field polygon */}
                      <Polygon
                        positions={[
                          [19.764, 74.474],
                          [19.766, 74.474],
                          [19.766, 74.476],
                          [19.764, 74.476],
                        ]}
                        pathOptions={{
                          color: "lime",
                          fillOpacity: 0.2,
                          weight: 2,
                        }}
                      />

                      {/* Plot points with interactive markers */}
                      {plotPoints.map((plot) => (
                        <CircleMarker
                          key={plot.id}
                          center={plot.position}
                          radius={8}
                          pathOptions={{
                            color: getPlotColor(plot.raw),
                            fillColor: getPlotColor(plot.raw),
                            fillOpacity: 0.8,
                            weight: 2,
                          }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <div className="font-semibold text-gray-900 mb-1">
                                Plot {plot.plotNo}
                              </div>
                              <div className="text-gray-600 mb-1">
                                Status:{" "}
                                <span className="font-medium">
                                  {plot.status}
                                </span>
                              </div>
                              <div className="text-gray-600">
                                Area:{" "}
                                <span className="font-medium">{plot.area}</span>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                </div>
              </div>

              {/* Sugarcane Status */}
              <div className="lg:col-span-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Sugarcane Status
                  </h3>
                </div>

                <div className="flex-1 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={plotStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius="40%"
                        outerRadius="70%"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {plotStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              STATUS_COLOR_PALETTE[
                                index % STATUS_COLOR_PALETTE.length
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mb-4">
                  {plotStatusData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: STATUS_COLOR_PALETTE[index],
                          }}
                        ></div>
                        <span className="text-sm text-gray-700">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width Combined Chart Component */}
        <div className="mt-6">
          <CombinedChart
            harvestData={harvestData}
            brixData={brixData}
            stageDistribution={stageDistribution}
            filteredData={filteredData}
            harvestRange={harvestRange}
            setHarvestRange={setHarvestRange}
            activeChart={activeChart}
            setActiveChart={setActiveChart}
          />
        </div>
      </div>
    </div>
  );
};

export default HarvestDashboard;
