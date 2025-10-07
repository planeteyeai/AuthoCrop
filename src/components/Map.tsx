import React, { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polygon, useMap, Rectangle } from "react-leaflet";
import { LatLngTuple, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import { useFarmerProfile } from "../hooks/useFarmerProfile";

// Add custom styles for the enhanced tooltip
const tooltipStyles = `
  .hover-tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 1000;
    pointer-events: none;
    max-width: 280px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .enhanced-tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 14px 18px;
    border-radius: 10px;
    font-size: 14px;
    z-index: 1000;
    pointer-events: none;
    max-width: 320px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
  }

  .enhanced-tooltip-line {
    margin: 6px 0;
    padding: 4px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 24px;
  }

  .enhanced-tooltip-line:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 8px;
    margin-bottom: 8px;
  }

.layer-name {
  font-weight: bold;
  color: #4CAF50;
  margin-right: 8px;
  min-width: 100px;
}

.layer-description {
  color: #e0e0e0;
  flex: 1;
  text-align: right;
  }
`;

// Inject styles if not already injected
if (typeof document !== 'undefined' && !document.querySelector('#map-tooltip-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'map-tooltip-styles';
  styleSheet.innerText = tooltipStyles;
  document.head.appendChild(styleSheet);
}

// Unified legend circle color (orange)
const LEGEND_CIRCLE_COLOR = '#F57C00';

const LAYER_LABELS: Record<string, string> = {
  Growth: "Growth",
  "Water Uptake": "Water Uptake",
  "Soil Moisture": "Soil Moisture",
  PEST: "Pest",
};

// Set fixed zoom level component
const SetFixedZoom: React.FC<{ coordinates: number[][] }> = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (!coordinates.length) return;

    const latlngs = coordinates
      .filter((c) => Array.isArray(c) && c.length >= 2)
      .map(([lng, lat]) => [lat, lng] as LatLngTuple)
      .filter((tuple: LatLngTuple) => !isNaN(tuple[0]) && !isNaN(tuple[1]));

    if (latlngs.length) {
      const centerLat = latlngs.reduce((sum, coord) => sum + coord[0], 0) / latlngs.length;
      const centerLng = latlngs.reduce((sum, coord) => sum + coord[1], 0) / latlngs.length;
      map.setView([centerLat, centerLng], 18, { animate: true, duration: 1.5 });
    }
  }, [coordinates, map]);

  return null;
};

// Function to check if a point is inside polygon
const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
};

interface MapProps {
  onHealthDataChange?: (data: any) => void;
  onSoilDataChange?: (data: any) => void;
  onFieldAnalysisChange?: (data: any) => void;
  onMoistGroundChange?: (percent: number) => void;
  onPestDataChange?: (data: any) => void;
}

const CustomTileLayer: React.FC<{
  url: string;
  opacity?: number;
  key?: string;
}> = ({ url, opacity = 0.7, key }) => {
  console.log('CustomTileLayer URL:', url);

  if (!url) {
    console.log('No URL provided to CustomTileLayer');
    return null;
  }

  return (
    <TileLayer
      key={key}
      url={url}
      opacity={opacity}
      maxZoom={22}
      minZoom={10}
      tileSize={256}
      eventHandlers={{
        tileerror: (e: any) => console.error('Tile loading error:', e),
        tileload: (e: any) => console.log('Tile loaded successfully'),
      }}
    />
  );
};

const Map: React.FC<MapProps> = ({
  onHealthDataChange,
  onSoilDataChange,
  onFieldAnalysisChange,
  onMoistGroundChange,
  onPestDataChange,
}) => {
  const { profile, loading: profileLoading } = useFarmerProfile();
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  const [plotData, setPlotData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter] = useState<LatLngTuple>([17.842832246588202, 74.91558702408217]);
  const [selectedPlotName, setSelectedPlotName] = useState("");
  const [activeLayer, setActiveLayer] = useState<"Growth" | "Water Uptake" | "Soil Moisture" | "PEST">("Growth");

  // New state for different layer data
  const [growthData, setGrowthData] = useState<any>(null);
  const [waterUptakeData, setWaterUptakeData] = useState<any>(null);
  const [soilMoistureData, setSoilMoistureData] = useState<any>(null);
  const [pestData, setPestData] = useState<any>(null);

  const [hoveredPlotInfo, setHoveredPlotInfo] = useState<any>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedLegendClass, setSelectedLegendClass] = useState<string | null>(null);
  const [layerChangeKey, setLayerChangeKey] = useState(0);

  useEffect(() => {
    setLayerChangeKey(prev => prev + 1);
  }, [activeLayer]);

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Auto-select first plot from farmer profile
  useEffect(() => {
    console.log('🗺️ Map useEffect: profileLoading:', profileLoading, 'profile:', profile);
    
    if (profileLoading || !profile) {
      console.log('🗺️ Waiting for profile to load...');
      return;
    }

    const plotNames = profile.plots?.map(plot => plot.fastapi_plot_id) || [];
    const defaultPlot = plotNames.length > 0 ? plotNames[0] : null;
    
    console.log('🗺️ Available plots:', plotNames);
    console.log('🗺️ Setting default plot:', defaultPlot);
    
    if (defaultPlot) {
      setSelectedPlotName(defaultPlot);
      localStorage.setItem('selectedPlot', defaultPlot);
      fetchAllLayerData(defaultPlot);
    }
  }, [profile, profileLoading]);

  const fetchAllLayerData = async (plotName: string) => {
    await Promise.all([
      fetchGrowthData(plotName),
      fetchWaterUptakeData(plotName),
      fetchSoilMoistureData(plotName),
      fetchPestData(plotName),
      fetchPlotData(plotName),
      fetchFieldAnalysis(plotName),
    ]);
  };

  const fetchGrowthData = async (plotName: string) => {
    if (!plotName) return;

    try {
      console.log("Fetching growth data for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `https://dev-plot.cropeye.ai/analyze_Growth?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!resp.ok) throw new Error(`Growth API failed: ${resp.status}`);

      const data = await resp.json();
      console.log("Growth API response:", data);
      setGrowthData(data);
    } catch (err) {
      console.error("Error fetching growth data:", err);
      setGrowthData(null);
    }
  };

  const fetchWaterUptakeData = async (plotName: string) => {
    if (!plotName) return;

    try {
      console.log("Fetching water uptake data for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `https://dev-plot.cropeye.ai/wateruptake?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!resp.ok) throw new Error(`Water Uptake API failed: ${resp.status}`);

      const data = await resp.json();
      console.log("Water Uptake API response:", data);
      setWaterUptakeData(data);
    } catch (err) {
      console.error("Error fetching water uptake data:", err);
      setWaterUptakeData(null);
    }
  };

  const fetchSoilMoistureData = async (plotName: string) => {
    if (!plotName) return;

    try {
      console.log("Fetching soil moisture data for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `https://dev-plot.cropeye.ai/SoilMoisture?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!resp.ok) throw new Error(`Soil Moisture API failed: ${resp.status}`);

      const data = await resp.json();
      console.log("Soil Moisture API response:", data);
      setSoilMoistureData(data);
    } catch (err) {
      console.error("Error fetching soil moisture data:", err);
      setSoilMoistureData(null);
    }
  };

  const fetchPlotData = async (plotName: string) => {
    setLoading(true);
    setError(null);

    try {
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `https://dev-plot.cropeye.ai/analyze_Growth?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);

      setPlotData(await resp.json());
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setPlotData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchFieldAnalysis = async (plotName: string) => {
    if (!plotName) return;

    try {
      console.log("Fetching field analysis for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `https://dev-field.cropeye.ai/analyze?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!resp.ok) throw new Error(`Field analysis API failed: ${resp.status}`);

      const data = await resp.json();
      console.log("Field analysis API response:", data);

      let fieldData: any = null;

      if (Array.isArray(data)) {
        const plotData = data.filter((item: any) => {
          const itemPlotName = item.plot_name || item.plot || item.name || '';
          return itemPlotName === plotName;
        });

        if (plotData.length > 0) {
          plotData.sort((a: any, b: any) => {
            const dateA = a.date || a.analysis_date || '';
            const dateB = b.date || b.analysis_date || '';
            return dateB.localeCompare(dateA);
          });

          fieldData = plotData[0];
        }
      } else if (typeof data === "object" && data !== null) {
        fieldData = data;
      }

      if (fieldData && onFieldAnalysisChange) {
        const overallHealth = fieldData?.overall_health ?? fieldData?.health_score ?? 0;
        const healthStatus = fieldData?.health_status ?? fieldData?.status ?? "Unknown";
        const meanValue = fieldData?.statistics?.mean ?? fieldData?.mean ?? 0;

        onFieldAnalysisChange({
          plotName: fieldData.plot_name ?? plotName,
          overallHealth,
          healthStatus,
          statistics: {
            mean: meanValue,
          },
        });
      }
    } catch (err) {
      console.error("Error in fetchFieldAnalysis:", err);
    }
  };

  const fetchPestData = async (plotName: string) => {
    if (!plotName) {
      setPestData(null);
      return;
    }

    try {
      console.log("Fetching pest detection for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `https://dev-plot.cropeye.ai/pest-detection?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!resp.ok) throw new Error(`Pest detection API failed: ${resp.status}`);

      const data = await resp.json();
      console.log("Pest detection API response:", data);
      setPestData(data);

      if (data?.pixel_summary && onPestDataChange) {
        const chewingPestPercentage = data.pixel_summary.chewing_affected_pixel_percentage || 0;
        const suckingPercentage = data.pixel_summary.sucking_affected_pixel_percentage || 0;
        const redrotPercentage = data.pixel_summary.redrot_affected_pixel_percentage || 0;
        const soilBornePercentage = data.pixel_summary.SoilBorn_affected_pixel_percentage || 0;

        const totalAffectedPercentage = chewingPestPercentage + suckingPercentage + redrotPercentage + soilBornePercentage;
        
        onPestDataChange({
          plotName,
          pestPercentage: totalAffectedPercentage,
          healthyPercentage: 100 - totalAffectedPercentage,
          totalPixels: data.pixel_summary.total_pixel_count || 0,
          pestAffectedPixels: (data.pixel_summary.chewing_affected_pixel_count || 0) + 
                             (data.pixel_summary.sucking_affected_pixel_count || 0) + 
                             (data.pixel_summary.redrot_affected_pixel_count || 0) +  
                             (data.pixel_summary.SoilBorn_pixel_count || 0),
          chewingPestPercentage,
          chewingPestPixels: data.pixel_summary.chewing_affected_pixel_count || 0,
          suckingPercentage,
          suckingPixels: data.pixel_summary.sucking_affected_pixel_count || 0,
        });
      }
    } catch (err) {
      console.error("Error in fetchPestData:", err);
      setPestData(null);
    }
  };

  const getActiveLayerUrl = () => {
    // Flexible extractor for tile URL from various possible shapes
    const extractTileUrl = (data: any): string | null => {
      if (!data || typeof data !== 'object') return null;

      // Common paths
      const candidates = [
        data?.features?.[0]?.properties?.tile_url,
        data?.features?.[0]?.properties?.tileURL,
        data?.features?.[0]?.properties?.tileServerUrl,
        data?.features?.[0]?.properties?.tiles,
        data?.properties?.tile_url,
        data?.tile_url,
        data?.tileURL,
        data?.tileServerUrl,
      ].filter(Boolean);

      // If tiles is an array, pick first
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) {
          return typeof c[0] === 'string' ? c[0] : null;
        }
        if (typeof c === 'string') {
          return c;
        }
      }
      return null;
    };

    let rawUrl: string | null = null;
    if (activeLayer === "PEST") rawUrl = extractTileUrl(pestData);
    else if (activeLayer === "Growth") rawUrl = extractTileUrl(growthData);
    else if (activeLayer === "Water Uptake") rawUrl = extractTileUrl(waterUptakeData);
    else if (activeLayer === "Soil Moisture") rawUrl = extractTileUrl(soilMoistureData);

    if (!rawUrl) {
      console.warn(`[Map] No tile_url found for layer ${activeLayer}`);
      return null;
    }

    // Validate tile template contains placeholders
    const hasTemplate = rawUrl.includes('{z}') && rawUrl.includes('{x}') && rawUrl.includes('{y}');
    if (!hasTemplate) {
      console.warn(`[Map] tile_url missing template placeholders for layer ${activeLayer}:`, rawUrl);
      return null;
    }

    return rawUrl;
  };

  const currentPlotFeature = plotData?.features?.[0];

  const legendData = useMemo(() => {
    if (activeLayer === "PEST") {
      const chewingPestPercentage = pestData?.pixel_summary?.chewing_affected_pixel_percentage || 0;
      const suckingPercentage = pestData?.pixel_summary?.sucking_affected_pixel_percentage || 0;
      const redrotPercentage = pestData?.pixel_summary?.redrot_affected_pixel_percentage || 0;
      const soilBornePercentage = pestData?.pixel_summary?.SoilBorn_affected_pixel_percentage || 0;
      
      return [
        { label: "Chewing Pests", color: "#DC2626", percentage: Math.round(chewingPestPercentage), description: "Areas affected by chewing pests" },
        { label: "Sucking Pests", color: "#B91C1C", percentage: Math.round(suckingPercentage), description: "Areas affected by sucking disease" },
        { label: "Red Rot", color: "#991B1B", percentage: Math.round(redrotPercentage), description: "Red rot infections affecting plants" },
        { label: "Soil Borne", color: "#7F1D1D", percentage: Math.round(soilBornePercentage), description: "Soil borne infections affecting plants" }
      ];
    }

    if (activeLayer === "Water Uptake") {
      const pixelSummary = waterUptakeData?.pixel_summary;
      if (!pixelSummary) return [];

      return [
        { label: "Deficient", color: "#E6F3FF", percentage: Math.round(pixelSummary.deficient_pixel_percentage || 0), description: "weak root" },
        { label: "Less", color: "#87CEEB", percentage: Math.round(pixelSummary.less_pixel_percentage || 0), description: "weak roots" },
        { label: "Adequate", color: "#4682B4", percentage: Math.round(pixelSummary.adequat_pixel_percentage || 0), description: "healthy roots" },
        { label: "Excellent", color: "#1E90FF", percentage: Math.round(pixelSummary.excellent_pixel_percentage || 0), description: "healthy roots" },
        { label: "Excess", color: "#000080", percentage: Math.round(pixelSummary.excess_pixel_percentage || 0), description: "root logging" }
      ];
    }

    if (activeLayer === "Soil Moisture") {
      const pixelSummary = soilMoistureData?.pixel_summary;
      if (!pixelSummary) return [];

      return [
        { label: "Less", color: "#9fd4d2", percentage: Math.round(pixelSummary.less_pixel_percentage || 0), description: "less soil moisture" },
        { label: "Adequate", color: "#8fc7c5", percentage: Math.round(pixelSummary.adequate_pixel_percentage || 0), description: "Irrigation need" },
        { label: "Excellent", color: "#8fe3e0", percentage: Math.round(pixelSummary.excellent_pixel_percentage || 0), description: "no irrigation require" },
        { label: "Excess", color: "#74dbd8", percentage: Math.round(pixelSummary.excess_pixel_percentage || 0), description: "water logging" },
        { label: "Shallow Water", color: "#50f2ec", percentage: Math.round(pixelSummary.shallow_water_pixel_percentage || 0), description: "water source" }
      ];
    }

    if (activeLayer === "Growth") {
      const pixelSummary = growthData?.pixel_summary;
      if (!pixelSummary) return [];

      return [
        { label: "Weak", color: "#90EE90", percentage: Math.round(pixelSummary.weak_pixel_percentage || 0), description: "damaged or weak crop" },
        { label: "Stress", color: "#32CD32", percentage: Math.round(pixelSummary.stress_pixel_percentage || 0), description: "crop under stress" },
        { label: "Moderate", color: "#228B22", percentage: Math.round(pixelSummary.moderate_pixel_percentage || 0), description: "Crop under normal growth" },
        { label: "Healthy", color: "#006400", percentage: Math.round(pixelSummary.healthy_pixel_percentage || 0), description: "proper growth" }
      ];
    }

    return [];
  }, [activeLayer, pestData, waterUptakeData, soilMoistureData, growthData]);

  const getFilteredPixels = useMemo(() => {
    console.log('getFilteredPixels called with:', { selectedLegendClass, activeLayer });
    
    if (!selectedLegendClass) {
      console.log('No selectedLegendClass, returning empty array');
      return [];
    }

    if (activeLayer === "PEST") {
      if (!pestData || !currentPlotFeature) {
        console.log('Missing pestData or currentPlotFeature');
        return [];
      }

      console.log('Processing PEST layer for selectedLegendClass:', selectedLegendClass);
      
      if (!["Chewing Pests", "Sucking Pests", "Red Rot", "Soil Borne"].includes(selectedLegendClass)) {
        console.log('SelectedLegendClass not in allowed pest categories:', selectedLegendClass);
        return [];
      }
      
      let coordinates = [];
      let pestType = "";
      
      if (selectedLegendClass === "Chewing Pests") {
        coordinates = pestData.pixel_summary?.chewing_affected_pixel_coordinates || [];
        pestType = "Chewing Pests";
      } else if (selectedLegendClass === "Sucking Pests") {
        coordinates = pestData.pixel_summary?.sucking_affected_pixel_coordinates || [];
        pestType = "Sucking Pests";
      } else if (selectedLegendClass === "Red Rot") {
        coordinates = pestData.pixel_summary?.redrot_affected_pixel_coordinates || [];
        pestType = "Red Rot";
      } else if (selectedLegendClass === "Soil Borne") {
        coordinates = pestData.pixel_summary?.SoilBorne_affected_pixel_coordinates || [];
        pestType = "Soil Borne";
      }
      
      if (!coordinates || !Array.isArray(coordinates)) {
        console.log('No valid coordinates found for', pestType);
        return [];
      }
      
      console.log(`Found ${coordinates.length} coordinates for ${pestType}`);

      const actualPixels = coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) return null;
        
        return {
          geometry: {
            coordinates: [coord[0], coord[1]]
          },
          properties: {
            pixel_id: `${pestType.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            pest_type: pestType,
            pest_category: pestType
          }
        };
      }).filter(Boolean);
      
      console.log(`Generated ${actualPixels.length} pixel objects for ${pestType}`);
      return actualPixels;
    }
    
    if (activeLayer === "Water Uptake") {
      if (!waterUptakeData || !currentPlotFeature) {
        console.log('Missing waterUptakeData or currentPlotFeature');
        return [];
      }

      console.log('Processing Water Uptake layer for selectedLegendClass:', selectedLegendClass);

      const pixelSummary = waterUptakeData.pixel_summary;
      if (!pixelSummary) return [];

      let coordinates = [];
      let categoryType = "";

      if (selectedLegendClass === "Deficient") {
        coordinates = pixelSummary.deficient_pixel_coordinates || [];
        categoryType = "Deficient";
      } else if (selectedLegendClass === "Less") {
        coordinates = pixelSummary.less_pixel_coordinates || [];
        categoryType = "Less";
      } else if (selectedLegendClass === "Adequate") {
        coordinates = pixelSummary.adequat_pixel_coordinates || [];
        categoryType = "Adequate";
      } else if (selectedLegendClass === "Excellent") {
        coordinates = pixelSummary.excellent_pixel_coordinates || [];
        categoryType = "Excellent";
      } else if (selectedLegendClass === "Excess") {
        coordinates = pixelSummary.excess_pixel_coordinates || [];
        categoryType = "Excess";
      }

      if (!coordinates || !Array.isArray(coordinates)) {
        console.log('No valid coordinates found for', categoryType);
      return [];
    }
    
      console.log(`Found ${coordinates.length} coordinates for ${categoryType}`);

      const actualPixels = coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) return null;

        return {
          geometry: {
            coordinates: [coord[0], coord[1]]
          },
          properties: {
            pixel_id: `${categoryType.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            category_type: categoryType,
            water_uptake_category: categoryType
          }
        };
      }).filter(Boolean);

      console.log(`Generated ${actualPixels.length} pixel objects for ${categoryType}`);
      return actualPixels;
    }

    if (activeLayer === "Soil Moisture") {
      if (!soilMoistureData || !currentPlotFeature) {
        console.log('Missing soilMoistureData or currentPlotFeature');
        return [];
      }

      console.log('Processing Soil Moisture layer for selectedLegendClass:', selectedLegendClass);

      const pixelSummary = soilMoistureData.pixel_summary;
      if (!pixelSummary) return [];

      let coordinates = [];
      let categoryType = "";

      if (selectedLegendClass === "Less") {
        coordinates = pixelSummary.less_pixel_coordinates || [];
        categoryType = "Less";
      } else if (selectedLegendClass === "Adequate") {
        coordinates = pixelSummary.adequate_pixel_coordinates || [];
        categoryType = "Adequate";
      } else if (selectedLegendClass === "Excellent") {
        coordinates = pixelSummary.excellent_pixel_coordinates || [];
        categoryType = "Excellent";
      } else if (selectedLegendClass === "Excess") {
        coordinates = pixelSummary.excess_pixel_coordinates || [];
        categoryType = "Excess";
      } else if (selectedLegendClass === "Shallow Water") {
        coordinates = pixelSummary.shallow_water_pixel_coordinates || [];
        categoryType = "Shallow Water";
      }

      if (!coordinates || !Array.isArray(coordinates)) {
        console.log('No valid coordinates found for', categoryType);
        return [];
      }

      console.log(`Found ${coordinates.length} coordinates for ${categoryType}`);

      const actualPixels = coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) return null;

        return {
          geometry: {
            coordinates: [coord[0], coord[1]]
          },
          properties: {
            pixel_id: `${categoryType.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            category_type: categoryType,
            soil_moisture_category: categoryType
          }
        };
      }).filter(Boolean);

      console.log(`Generated ${actualPixels.length} pixel objects for ${categoryType}`);
      return actualPixels;
    }

    if (activeLayer === "Growth") {
      if (!growthData || !currentPlotFeature) {
        console.log('Missing growthData or currentPlotFeature');
        return [];
      }

      console.log('Processing Growth layer for selectedLegendClass:', selectedLegendClass);

      const pixelSummary = growthData.pixel_summary;
      if (!pixelSummary) return [];

      let coordinates = [];
      let categoryType = "";

      if (selectedLegendClass === "Weak") {
        coordinates = pixelSummary.weak_pixel_coordinates || [];
        categoryType = "Weak";
      } else if (selectedLegendClass === "Stress") {
        coordinates = pixelSummary.stress_pixel_coordinates || [];
        categoryType = "Stress";
      } else if (selectedLegendClass === "Moderate") {
        coordinates = pixelSummary.moderate_pixel_coordinates || [];
        categoryType = "Moderate";
      } else if (selectedLegendClass === "Healthy") {
        coordinates = pixelSummary.healthy_pixel_coordinates || [];
        categoryType = "Healthy";
      }

      if (!coordinates || !Array.isArray(coordinates)) {
        console.log('No valid coordinates found for', categoryType);
        return [];
      }

      console.log(`Found ${coordinates.length} coordinates for ${categoryType}`);

      const actualPixels = coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) return null;

    return {
          geometry: {
            coordinates: [coord[0], coord[1]]
          },
          properties: {
            pixel_id: `${categoryType.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            category_type: categoryType,
            growth_category: categoryType
          }
        };
      }).filter(Boolean);

      console.log(`Generated ${actualPixels.length} pixel objects for ${categoryType}`);
      return actualPixels;
    }

    return [];
  }, [selectedLegendClass, activeLayer, pestData, waterUptakeData, soilMoistureData, growthData, currentPlotFeature]);

  const handleLegendClick = (label: string, percentage: number) => {
    if (percentage === 0) return;

    if (percentage >= 99) {
      setSelectedLegendClass(null);
      return;
    }

    setSelectedLegendClass((prev) => (prev === label ? null : label));
  };

  const renderPlotBorder = () => {
    const geom = currentPlotFeature?.geometry;
    if (!geom || geom.type !== "Polygon" || !geom.coordinates?.[0]) return null;

    const coords = geom.coordinates[0]
      .map((c: any) => [c[1], c[0]] as LatLngTuple)
      .filter((tuple: LatLngTuple) => !isNaN(tuple[0]) && !isNaN(tuple[1]));

    return (
      <Polygon
        positions={coords}
        pathOptions={{
          fillOpacity: 0,
          color: "#FFD700",
          weight: 3,
        }}
      />
    );
  };

  const renderFilteredPixels = () => {
    if (!selectedLegendClass || getFilteredPixels.length === 0) return null;

    return getFilteredPixels.map((pixel: any, index: number) => {
      const coords = pixel?.geometry?.coordinates;

      if (!coords || !Array.isArray(coords) || coords.length < 2) {
        console.error(`Invalid pixel coordinates for pixel at index ${index}:`, coords);
        return null;
      }
      
      const squareSize = 0.000025;
      const bounds: [LatLngTuple, LatLngTuple] = [
        [coords[1] - squareSize, coords[0] - squareSize],
        [coords[1] + squareSize, coords[0] + squareSize],
      ];

      return (
        <Rectangle
          key={`filtered-pixel-${pixel?.properties?.pixel_id || index}`}
          bounds={bounds}
          pathOptions={{
            fillColor: "#FFFFFF",
            fillOpacity: 0.8,
            color: "#FFFFFF",
            weight: 1,
            opacity: 0.9,
          }}
        />
      );
    });
  };

  return (
    <div className="map-wrapper">
      <div className="layer-controls">
        <div className="layer-buttons">
          {(["Growth", "Water Uptake", "Soil Moisture", "PEST"] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={activeLayer === layer ? "active" : ""}
              disabled={loading}
            >
              {LAYER_LABELS[layer]}
            </button>
          ))}
        </div>

        {profile && !profileLoading && (
          <div className="plot-selector">
            <label>Select Plot:</label>
            <select
              value={selectedPlotName}
              onChange={(e) => {
                const newPlot = e.target.value;
                setSelectedPlotName(newPlot);
                localStorage.setItem('selectedPlot', newPlot);
                fetchAllLayerData(newPlot);
              }}
              disabled={loading}
            >
              {profile.plots?.map(plot => {
                let displayName = '';
                
                if (plot.gat_number && plot.plot_number && 
                    plot.gat_number.trim() !== "" && plot.plot_number.trim() !== "" &&
                    !plot.gat_number.startsWith('GAT_') && !plot.plot_number.startsWith('PLOT_')) {
                  displayName = `${plot.gat_number}_${plot.plot_number}`;
                } else if (plot.gat_number && plot.gat_number.trim() !== "" && !plot.gat_number.startsWith('GAT_')) {
                  displayName = plot.gat_number;
                } else if (plot.plot_number && plot.plot_number.trim() !== "" && !plot.plot_number.startsWith('PLOT_')) {
                  displayName = plot.plot_number;
                } else {
                  const village = plot.address?.village;
                  const taluka = plot.address?.taluka;
                  
                  if (village) {
                    displayName = `Plot in ${village}`;
                    if (taluka) displayName += `, ${taluka}`;
                  } else {
                    displayName = 'Plot (No GAT/Plot Number)';
                  }
                }
                
                return (
                  <option key={plot.fastapi_plot_id} value={plot.fastapi_plot_id}>
                    {displayName}
                  </option>
                );
              }) || []}
            </select>
          </div>
        )}

        {profileLoading && <div className="loading-indicator">Loading farmer profile...</div>}
        {!profileLoading && !selectedPlotName && <div className="error-message">No plot data available for this farmer</div>}
        {loading && <div className="loading-indicator">Loading plot data...</div>}
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="map-container" ref={mapWrapperRef}>
        <button
          className="fullscreen-btn"
          onClick={() => {
            if (!document.fullscreenElement) mapWrapperRef.current?.requestFullscreen();
            else document.exitFullscreen();
          }}
        >
          ⛶
        </button>

        {currentPlotFeature && (
          <div className="plot-info">
            <div className="plot-area">
              {currentPlotFeature.properties?.area_acres 
                ? currentPlotFeature.properties.area_acres.toFixed(2) 
                : '0.00'}acre
            </div>
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={18}
          style={{ height: "90%", width: "100%" }}
          zoomControl={true}
          maxZoom={22}
          minZoom={10}
        >
          <TileLayer
            url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution="© Google"
            maxZoom={22}
          />

          {currentPlotFeature?.geometry?.coordinates?.[0] &&
            Array.isArray(currentPlotFeature.geometry.coordinates[0]) && (
            <SetFixedZoom coordinates={currentPlotFeature.geometry.coordinates[0]} />
          )}

          {(() => {
            const activeUrl = getActiveLayerUrl();
            console.log('Rendering active layer with URL:', activeUrl);
            if (!activeUrl) {
              console.warn(`[Map] Skipping TileLayer render for ${activeLayer} due to missing/invalid tile_url`);
              return null;
            }
            return (
              <CustomTileLayer
                url={activeUrl}
                opacity={0.7}
                key={`${activeLayer}-layer-${layerChangeKey}`}
              />
            );
          })()}

          {selectedLegendClass && renderFilteredPixels()}
          {renderPlotBorder()}
        </MapContainer>

        {legendData.length > 0 && (
          <div className="map-legend-bottom">
            <div className="legend-items-bottom">
              {legendData.map((item: any, index: number) => (
                <div
                  key={index}
                  className={`legend-item-bottom ${
                    selectedLegendClass === item.label ? "active" : ""
                  } ${item.percentage === 0 ? "zero-percent" : ""} ${
                    item.percentage >= 99 ? "full-coverage" : ""
                  }`}
                  onClick={() => handleLegendClick(item.label, item.percentage)}
                  style={{
                    pointerEvents: item.percentage === 0 ? 'none' : 'auto',
                    cursor: item.percentage >= 99 ? 'not-allowed' : 'pointer'
                  }}
                  title={item.percentage >= 99 ? 'High coverage (99%+) - no individual pixels to show' : ''}
                >
                  <div
                    className="legend-circle-bottom cursor-pointer transition-all duration-150"
                    style={{
                      background: LEGEND_CIRCLE_COLOR,
                      boxShadow: `0 5px 8px ${LEGEND_CIRCLE_COLOR}40`
                    }}
                  >
                    <div className="legend-percentage-bottom font-bold text-xlg text-white-900">
                      {item.percentage}
                    </div>
                  </div>
                  <div className="legend-label-bottom text-white-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
              </div>
    </div>
  );
};

export default Map;