import React, { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polygon, useMap, Rectangle } from "react-leaflet";
import { LatLngTuple, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import L from "leaflet";
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

.hover-tooltip-line {
  margin: 4px 0;
  padding: 2px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hover-tooltip-line:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
  margin-bottom: 6px;
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

.layer-status {
  font-weight: 500;
  color: #ffffff;
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
`;

// Inject styles if not already injected
if (typeof document !== 'undefined' && !document.querySelector('#map-tooltip-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'map-tooltip-styles';
  styleSheet.innerText = tooltipStyles;
  document.head.appendChild(styleSheet);
}


// Enhanced classification ranges combining both approaches
const CLASS_RANGES = {
  VV: [
    { label: "Weak", min: -20, max: -12, color: "#90EE90" },      // Light green
    { label: "Stress", min: -12, max: -11, color: "#32CD32" },    // Lime green
    { label: "Moderate", min: -11, max: -10, color: "#228B22" },  // Forest green
    { label: "Healthy", min: -10, max: 0, color: "#006400" },     // Dark green
  ],
  RVI: [
    { label: "Dry", min: -1, max: -0.3, color: "#E6F3FF" },        // Very light blue
    { label: "Less Uptake", min: -0.2, max: 0.1, color: "#87CEEB" }, // Sky blue
    { label: "Sufficient Uptake", min: 0.2, max: 0.4, color: "#4682B4" }, // Steel blue
    { label: "Adequate", min: 0.4, max: 0.8, color: "#1E90FF" },   // Dodger blue
    { label: "Excess", min: 0.8, max: Infinity, color: "#000080" }, // Navy blue
  ],
  SWI: [
    { label: "Dry", min: -0.75, max: -0.5, color: "#9fd4d2" },     // Light sky blue
    { label: "Water Stress", min: -0.5, max: -0.3, color: "#8fc7c5" }, // Steel blue
    { label: "Moist Ground", min: -0.3, max: -0.1, color: "#8fe3e0" }, // Dodger blue
    { label: "Shallow Water", min: -0.1, max: 0, color: "#74dbd8" }, // Medium blue
    { label: "Water Bodies", min: 0, max: 0.6, color: "#50f2ec" }, // Navy blue
  ],
};

const LAYER_LABELS: Record<string, string> = {
  VV: "Growth",
  RVI: "Water Uptake", 
  SWI: "Soil Moisture",
  PEST: "Pest",
};

// Auto zoom to plot extent component
const AutoZoomToPlot: React.FC<{ coordinates: number[][] }> = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (!coordinates.length) return;

    const latlngs = coordinates
      .filter((c) => Array.isArray(c) && c.length >= 2)
      .map(([lng, lat]) => [lat, lng] as LatLngTuple)
      .filter((tuple: LatLngTuple) => !isNaN(tuple[0]) && !isNaN(tuple[1]));

    if (latlngs.length) {
      // Auto zoom to plot bounds with higher zoom level for better detail
      map.flyToBounds(latlngs, {
        padding: [20, 20],
        maxZoom: 22, // Increased max zoom for more detail
        duration: 1.5 // Smooth animation duration
      });
    }
  }, [coordinates, map]);

  return null;
};

// Updated custom descriptions for each classification
const CLASSIFICATION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  VV: {
    "Weak": "damaged or weak crop",
    "Stress": "crop under stress", 
    "Moderate": "Crop under normal growth",
    "Healthy": "proper growth",
    "Overgrowth": "crop overgrown",
  },
  RVI: {
    "Dry": "weak root",
    "Less Uptake": "weak roots",
    "Sufficient Uptake": "healthy roots",
    "Sufficient": "healthy roots", // Alternative
    "Adequate": "healthy roots",
    "Excess": "root logging",
  },
  SWI: {
    "Dry": "less soil moisture",
    "Water Stress": "Irrigation need",
    "Moist Ground": "no irrigation require",
    "Shallow Water": "water logging",
    "Water Bodies": "Large water source",
  },
};

interface MapProps {
  onHealthDataChange?: (data: {
    goodHealthPercent: number;
    needsAttentionPercent: number;
    totalArea: number;
    plotName: string;
  }) => void;
  onFieldAnalysisChange?: (data: {
    plotName: string;
    overallHealth: number;
    healthStatus: string;
    statistics: {
      mean: number;
    };
  }) => void;
  onMoistGroundChange?: (percent: number) => void;
  onPestDataChange?: (data: {
    plotName: string;
    pestPercentage: number;
    healthyPercentage: number;
    totalPixels: number;
    pestAffectedPixels: number;
  }) => void;
}

// Enhanced CustomTileLayer with comprehensive error handling and logging
const CustomTileLayer: React.FC<{
  url: string;
  opacity?: number;
  key?: string;
}> = ({ url, opacity = 0.7, key }) => {
  // Log the URL for debugging
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
      // Enhanced error handling
      eventHandlers={{
        tileerror: (e: any) => {
          console.error('Tile loading error:', e);
          console.error('Failed URL:', e.tile?.src);
        },
        tileload: (e: any) => {
          console.log('Tile loaded successfully:', e.tile?.src);
        },
        loading: () => {
          console.log('Tiles loading started');
        },
        load: () => {
          console.log('All tiles loaded successfully');
        }
      }}
    />
  );
};

// Function to classify pixel value based on layer and value
const classifyPixelValue = (layer: string, pixelValue: number): string => {
  const ranges = CLASS_RANGES[layer as keyof typeof CLASS_RANGES];
  if (!ranges) return "-";
  
  for (const range of ranges) {
    if (pixelValue >= range.min && pixelValue < range.max) {
      return range.label;
    }
  }
  return "-";
};

// Function to get color for a classification
const getClassificationColor = (layer: string, className: string): string => {
  const ranges = CLASS_RANGES[layer as keyof typeof CLASS_RANGES];
  if (!ranges) return "#000000";
  
  const range = ranges.find(r => r.label === className);
  return range?.color || "#000000";
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

const Map: React.FC<MapProps> = ({
  onHealthDataChange,
  onFieldAnalysisChange,
  onMoistGroundChange,
  onPestDataChange,
}) => {
  const { profile, loading: profileLoading } = useFarmerProfile();
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [plotData, setPlotData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter] = useState<LatLngTuple>([
    17.842832246588202,
    74.91558702408217,
  ]);
  const [selectedPlotName, setSelectedPlotName] = useState<string>("");
  const [activeLayer, setActiveLayer] = useState<"VV" | "RVI" | "SWI" | "PEST">("VV");
  const [pestData, setPestData] = useState<any>(null);
  const [hoveredPlotInfo, setHoveredPlotInfo] = useState<{
    x: number;
    y: number;
    allLayersInfo?: {
      layer: string;
      label: string;
      className: string;
      description: string;
      value: number;
      pixelValue: number;
    }[];
  } | null>(null);

  // Reduced hover timeout for faster response
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for selected legend class
  const [selectedLegendClass, setSelectedLegendClass] = useState<string | null>(null);

  // Add layer change counter to force tile layer re-render
  const [layerChangeKey, setLayerChangeKey] = useState(0);

  // Add AbortController to cancel ongoing fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add flag to prevent multiple API calls
  const hasInitializedRef = useRef(false);

  // Update layer change key when active layer changes
  useEffect(() => {
    setLayerChangeKey(prev => prev + 1);
  }, [activeLayer]);


  // Function to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getClassificationDescription = (layer: string, className: string): string => {
    if (!className || className === "-") return "";
    
    let cleanClassName = className.trim();
    
    if (CLASSIFICATION_DESCRIPTIONS[layer]?.[cleanClassName]) {
      return CLASSIFICATION_DESCRIPTIONS[layer][cleanClassName];
    }

    const descriptions = CLASSIFICATION_DESCRIPTIONS[layer] || {};
    for (const [key, description] of Object.entries(descriptions)) {
      if (
        cleanClassName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(cleanClassName.toLowerCase())
      ) {
        return description;
      }
    }
    return cleanClassName;
  };

  useEffect(() => {
    console.log('🗺️ Map useEffect: profileLoading:', profileLoading, 'profile:', profile);
    
    // Wait for profile to load before setting plot name
    if (profileLoading || !profile) {
      console.log('🗺️ Map useEffect: Waiting for profile to load...');
      return;
    }

    // Prevent multiple API calls
    if (hasInitializedRef.current) {
      console.log('🗺️ Map useEffect: Already initialized, skipping...');
      return;
    }

    // Get the default plot from the loaded profile
    const plotNames = profile.plots?.map(plot => plot.fastapi_plot_id) || [];
    const defaultPlot = plotNames.length > 0 ? plotNames[0] : null;
    
    console.log('🗺️ Map useEffect: Available plots:', plotNames);
    console.log('🗺️ Map useEffect: Setting default plot from profile:', defaultPlot);
    console.log('🗺️ Map useEffect: Profile plots data:', profile.plots);
    console.log('🗺️ Map useEffect: Plot details:', profile.plots?.map(plot => ({
      id: plot.id,
      fastapi_plot_id: plot.fastapi_plot_id,
      gat_number: plot.gat_number,
      plot_number: plot.plot_number
    })));
    
    setSelectedPlotName(defaultPlot || '');
    localStorage.setItem('selectedPlot', defaultPlot || '');

    // Fetch data for the selected plot
    if (defaultPlot) {
      console.log('🗺️ Map useEffect: Fetching data for plot:', defaultPlot);
      fetchPlotData(defaultPlot);
      fetchFieldAnalysis(defaultPlot);
      fetchPestData(defaultPlot);
    } else {
      console.log('🗺️ Map useEffect: No plot name available, skipping data fetch');
      console.log('🗺️ Map useEffect: Profile structure:', {
        hasPlots: !!profile.plots,
        plotsLength: profile.plots?.length,
        plotsData: profile.plots
      });
    }

    // Mark as initialized to prevent future calls
    hasInitializedRef.current = true;

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setLoading(false);
      setError(null);
      setPlotData(null);
      setPestData(null);
      hasInitializedRef.current = false;
    };
  }, [profile, profileLoading]);

  // Enhanced plot data fetching with robust error handling
  const fetchPlotData = async (plotName: string, retryCount = 0) => {
    if (!plotName || plotName.trim() === '') {
      console.log('fetchPlotData: No plot name provided, skipping API call');
      setLoading(false);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    // Don't retry more than 2 times
    if (retryCount > 2) {
      setError('Failed to fetch plot data after multiple attempts');
      setLoading(false);
      return;
    }

    try {
      const currentDate = getCurrentDate();
      const apiUrl = `http://192.168.41.73:7030/analyze?plot_name=${plotName}&end_date=${currentDate}&days_back=7`;
      
      console.log('🗺️ Fetching plot data from:', apiUrl);
      console.log('🗺️ Plot name:', plotName);
      console.log('🗺️ Current date:', currentDate);

      // Add timeout to the fetch request
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 15000); // 15 second timeout

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);

      console.log('🗺️ Response status:', resp.status);
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('🗺️ API Error Response:', errorText);
        console.error('🗺️ Full response:', resp);
        throw new Error(`API Error: ${resp.status} ${resp.statusText} - ${errorText}`);
      }

      const data = await resp.json();
      console.log('🗺️ Plot data received:', data);
      console.log('🗺️ Plot data structure:', {
        hasFeatures: !!data.features,
        featuresLength: data.features?.length,
        hasProperties: !!data.features?.[0]?.properties,
        hasTileUrls: !!data.features?.[0]?.properties?.tile_urls,
        tileUrls: data.features?.[0]?.properties?.tile_urls
      });
      
      setPlotData(data);
      setError(null);
    } catch (err: any) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('Fetch plot data error:', err);
      
      if (err.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to plot data service');
      } else if (err.message.includes('API Error:')) {
        setError(err.message);
      } else {
        setError(`Failed to fetch plot data: ${err.message}`);
      }
      
      setPlotData(null);

      // Retry for network errors
      if (err.message.includes('Failed to fetch') && retryCount < 2) {
        console.log(`Retrying request (attempt ${retryCount + 1})...`);
        setTimeout(() => {
          fetchPlotData(plotName, retryCount + 1);
        }, 2000);
        return;
      }
    } finally {
      setLoading(false);
    }
  };


  const fetchFieldAnalysis = async (plotName: string) => {
    if (!plotName || plotName.trim() === '') {
      console.log("Map.tsx: No plot name for field analysis, skipping API call");
      onFieldAnalysisChange?.({
        plotName: "",
        overallHealth: 0,
        healthStatus: "",
        statistics: { mean: 0 },
      });
      return;
    }

    try {
      console.log("Map.tsx: Fetching field analysis for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `http://192.168.41.73:7002/analyze?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!resp.ok) throw new Error(`Field analysis API failed: ${resp.status} ${resp.statusText}`);
      
      const data = await resp.json();
      console.log("Map.tsx: Field analysis API response:", data);

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

      if (!fieldData) {
        throw new Error(`No field data found for plot: ${plotName}`);
      }

      const overallHealth = fieldData?.overall_health ?? fieldData?.health_score ?? fieldData?.field_health ?? 0;
      const healthStatus = fieldData?.health_status ?? fieldData?.status ?? fieldData?.condition ?? "Unknown";
      const meanValue = fieldData?.statistics?.mean ?? fieldData?.mean ?? fieldData?.average ?? 0;

      const fieldAnalysisResult = {
        plotName: fieldData.plot_name ?? plotName,
        overallHealth: overallHealth,
        healthStatus: healthStatus,
        statistics: { mean: meanValue },
      };

      console.log("Map.tsx: Calling onFieldAnalysisChange with:", fieldAnalysisResult);
      onFieldAnalysisChange?.(fieldAnalysisResult);
    } catch (err) {
      console.error("Map.tsx: Error in fetchFieldAnalysis:", err);
      onFieldAnalysisChange?.({
        plotName,
        overallHealth: 0,
        healthStatus: "Error",
        statistics: { mean: 0 },
      });
    }
  };

  const fetchPestData = async (plotName: string) => {
    if (!plotName || plotName.trim() === '') {
      console.log("Map.tsx: No plot name for pest data, skipping API call");
      setPestData(null);
      return;
    }

    try {
      console.log("Map.tsx: Fetching pest detection for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `http://192.168.41.73:7030/pest-detection?plot_name=${plotName}&end_date=${currentDate}&pest_threshold=0.3&nir_threshold=0.15&ndwi_threshold=0.4&cloud_threshold=30`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!resp.ok) throw new Error(`Pest detection API failed: ${resp.status} ${resp.statusText}`);
      
      const data = await resp.json();
      console.log("Map.tsx: Pest detection API response:", data);
      
      setPestData(data);

      if (data?.pest_statistics && onPestDataChange) {
        const pestStats = data.pest_statistics;
        onPestDataChange({
          plotName: plotName,
          pestPercentage: pestStats.pest_percentage || 0,
          healthyPercentage: pestStats.healthy_percentage || 0,
          totalPixels: pestStats.total_pixels || 0,
          pestAffectedPixels: pestStats.pest_affected_pixels || 0,
        });
      }
    } catch (err) {
      console.error("Map.tsx: Error in fetchPestData:", err);
      setPestData(null);
    }
  };

  // Enhanced active layer URL getter with comprehensive fallbacks
  const getActiveLayerUrl = () => {
    console.log('🗺️ getActiveLayerUrl: activeLayer:', activeLayer);
    console.log('🗺️ getActiveLayerUrl: plotData:', plotData);
    console.log('🗺️ getActiveLayerUrl: pestData:', pestData);
    
    if (activeLayer === "PEST") {
      const pestTileUrl = pestData?.features?.[0]?.properties?.tile_url;
      console.log('🗺️ Pest tile URL:', pestTileUrl);
      return pestTileUrl;
    }

    // Try multiple possible structures for tile URLs
    let urls = null;
    
    // Structure 1: Direct tile_urls object (this should match your API response)
    if (plotData?.features?.[0]?.properties?.tile_urls) {
      urls = plotData.features[0].properties.tile_urls;
      console.log('🗺️ ✅ Found tile_urls in features[0].properties:', urls);
      console.log('🗺️ Available layers:', Object.keys(urls));
    }
    // Structure 2: Nested in properties
    else if (plotData?.properties?.tile_urls) {
      urls = plotData.properties.tile_urls;
      console.log('🗺️ Found tile_urls in root properties:', urls);
    }
    // Structure 3: Direct in plotData
    else if (plotData?.tile_urls) {
      urls = plotData.tile_urls;
      console.log('🗺️ Found tile_urls in root:', urls);
    }

    console.log('🗺️ All tile URLs found:', urls);

    if (!urls) {
      console.log('🗺️ ❌ No tile URLs found in plot data. Plot data structure:', plotData);
      console.log('🗺️ ❌ Plot data features:', plotData?.features);
      console.log('🗺️ ❌ First feature properties:', plotData?.features?.[0]?.properties);
      return null;
    }

    // Map active layer to the correct tile URL key
    let layerUrlKey: string;
    switch (activeLayer) {
      case "VV":
        layerUrlKey = "VV_tile_url";
        break;
      case "RVI":
        layerUrlKey = "RVI_tile_url";
        break;
      case "SWI":
        layerUrlKey = "SWI_tile_url";
        break;
      case "PEST":
        layerUrlKey = "VV_tile_url"; // Use VV as fallback for pest
        break;
      default:
        layerUrlKey = "VV_tile_url";
    }

    const url = urls[layerUrlKey];
    console.log(`🗺️ Active layer: ${activeLayer}, URL key: ${layerUrlKey}, URL: ${url}`);

    if (!url) {
      console.log(`🗺️ ❌ No URL found for layer ${activeLayer} with key ${layerUrlKey}`);
      console.log('🗺️ Available keys:', Object.keys(urls));
      return null;
    }

    console.log(`🗺️ ✅ Returning tile URL: ${url}`);
    return url;
  };

  const currentPlotFeature = plotData?.features?.[0];
  
  // Debug logging for current plot feature - Only log when data changes
  React.useEffect(() => {
    if (currentPlotFeature) {
      console.log('🗺️ currentPlotFeature:', currentPlotFeature);
      console.log('🗺️ currentPlotFeature geometry:', currentPlotFeature?.geometry);
      console.log('🗺️ currentPlotFeature properties:', currentPlotFeature?.properties);
    }
  }, [currentPlotFeature]);
  
  // TEST CONSOLE LOG - Only show once on component mount
  React.useEffect(() => {
    console.log('🚨 TEST: Map component mounted at:', new Date().toLocaleTimeString());
  }, []);

  // Enhanced health analysis with updated classification ranges
  const healthAnalysis = useMemo(() => {
    if (!currentPlotFeature?.properties?.indices_analysis) return null;

    const ndvi = currentPlotFeature.properties.indices_analysis.find(
      (i: any) => i.index_name === "VV"
    );

    if (!ndvi?.classifications) return null;

    const healthy = ["Healthy", "Moderate"];
    const goodPx = ndvi.classifications
      .filter((c: any) => healthy.some((h) => c.class_name.includes(h)))
      .reduce((sum: number, c: any) => sum + (c && typeof c.pixel_count === 'number' ? c.pixel_count : 0), 0);

    const total = ndvi.total_pixels || 1;

    return {
      goodHealthPercent: Math.round((goodPx / total) * 100),
      needsAttentionPercent: 100 - Math.round((goodPx / total) * 100),
      totalArea: currentPlotFeature.properties.area_hectares || 0,
      plotName: selectedPlotName || "",
    };
  }, [currentPlotFeature, selectedPlotName]);

  useEffect(() => {
    if (healthAnalysis) onHealthDataChange?.(healthAnalysis);
  }, [healthAnalysis, onHealthDataChange]);

  // Enhanced legend data generation with improved debugging
  const legendData = useMemo(() => {
    console.log('🗺️ legendData: activeLayer:', activeLayer);
    console.log('🗺️ legendData: currentPlotFeature:', currentPlotFeature);
    console.log('🗺️ legendData: pestData:', pestData);
    console.log('🗺️ legendData: currentPlotFeature?.properties:', currentPlotFeature?.properties);
    console.log('🗺️ legendData: currentPlotFeature?.properties?.indices_analysis:', currentPlotFeature?.properties?.indices_analysis);
    
    if (activeLayer === "PEST") {
      if (!pestData?.pest_statistics) {
        console.log('🗺️ legendData: No pest statistics found');
        return [];
      }
      
      const pestStats = pestData.pest_statistics;
      console.log('🗺️ legendData: Pest statistics:', pestStats);
      return [
        {
          label: "Healthy",
          percentage: pestStats.healthy_percentage || 0,
          color: "#00c800",
          pixelValue: 0,
        },
        {
          label: "Pest Affected", 
          percentage: pestStats.pest_percentage || 0,
          color: "#ff0000",
          pixelValue: 1,
        },
      ];
    }

    if (!currentPlotFeature?.properties?.indices_analysis) {
      console.log('🗺️ legendData: No indices_analysis found in currentPlotFeature');
      console.log('🗺️ legendData: currentPlotFeature properties keys:', currentPlotFeature?.properties ? Object.keys(currentPlotFeature.properties) : 'No properties');
      return [];
    }

    const analysis = currentPlotFeature.properties.indices_analysis.find(
      (i: any) => i.index_name === activeLayer
    );

    console.log('🗺️ legendData: Found analysis for', activeLayer, ':', analysis);
    console.log('🗺️ legendData: All available analyses:', currentPlotFeature.properties.indices_analysis.map((a: any) => a.index_name));

    if (!analysis?.classifications) {
      console.log('🗺️ legendData: No classifications found in analysis');
      console.log('🗺️ legendData: Analysis structure:', analysis);
      return [];
    }

    const totalPixels = analysis.total_pixels || 1;

    return CLASS_RANGES[activeLayer].map((range) => {
      const matching = analysis.classifications.filter((c: any) => 
        c.class_name && c.class_name.toLowerCase().includes(range.label.toLowerCase())
      );

      const pixelCount = matching.reduce(
        (sum: number, c: any) => sum + (typeof c.pixel_count === 'number' ? c.pixel_count : 0), 
        0
      );

      const percentage = Math.round((pixelCount / totalPixels) * 100);

      // Enhanced debugging for SWI layer
      if (activeLayer === "SWI") {
        console.log(`Legend item "${range.label}":`, {
          matching: matching.map((c: any) => ({ 
            class_name: c.class_name, 
            pixel_count: c.pixel_count 
          })),
          totalPixels,
          pixelCount,
          percentage
        });
      }

      return {
        label: range.label,
        percentage,
        color: range.color,
        pixelValue: analysis.current_value,
      };
    });
  }, [currentPlotFeature, activeLayer, pestData]);

  // Debug logging for legend data
  useEffect(() => {
    console.log('🗺️ legendData result:', legendData);
    console.log('🗺️ legendData length:', legendData.length);
  }, [legendData]);

  // Enhanced filtered pixels with comprehensive debugging
  const getFilteredPixels = useMemo(() => {
    if (!selectedLegendClass) return [];
    
    if (activeLayer === "PEST") return [];
    
    if (!plotData?.features || !currentPlotFeature) return [];

    // Don't show pixels if percentage is 99% or higher
    const selectedLegendItem = legendData.find(item => item.label === selectedLegendClass);
    if (selectedLegendItem && selectedLegendItem.percentage >= 99) return [];

    // Get plot boundary coordinates
    const plotGeometry = currentPlotFeature.geometry;
    if (!plotGeometry || plotGeometry.type !== "Polygon") return [];

    const plotBoundary = plotGeometry.coordinates[0].map((coord: [number, number]) => 
      [coord[0], coord[1]] as [number, number]
    );

    // Get all pixel features
    const pixelFeatures = plotData.features.filter(
      (feature: any) => feature.properties.feature_type === "pixel_data"
    );

    if (!pixelFeatures.length) return [];

    console.log(`Total pixel features found: ${pixelFeatures.length}`);
    console.log(`Selected legend class: ${selectedLegendClass}`);
    console.log(`Active layer: ${activeLayer}`);

    // Enhanced debugging for SWI layer
    if (activeLayer === "SWI") {
      console.log('Sample SWI pixel values:', pixelFeatures.slice(0, 10).map((p: any) => ({
        id: p.id || 'unknown',
        value: p.properties.SWI,
        coords: p.geometry.coordinates
      })));
    }

    // Get the classification range for the selected legend class
    const classRange = CLASS_RANGES[activeLayer]?.find(range => 
      range.label === selectedLegendClass
    );

    if (!classRange) {
      console.log(`No class range found for ${selectedLegendClass} in ${activeLayer}`);
      return [];
    }

    console.log(`Class range for ${selectedLegendClass}:`, classRange);

    // Filter pixels based on the classification range
    const filteredPixels = pixelFeatures.filter((pixel: any) => {
      const pixelValue = pixel.properties[activeLayer];
      
      if (typeof pixelValue !== 'number') {
        console.log(`Pixel ${pixel.id || 'unknown'} has non-numeric value:`, pixelValue);
        return false;
      }

      // Check if pixel value falls within the classification range
      const isInRange = pixelValue >= classRange.min && 
        (classRange.max === Infinity ? true : pixelValue < classRange.max);

      console.log(`Pixel ${pixel.id || 'unknown'} value: ${pixelValue}, range: ${classRange.min} to ${classRange.max}, inRange: ${isInRange}`);

      if (!isInRange) return false;

      // Check if pixel is inside plot boundary
      const pixelCoords = pixel.geometry.coordinates;
      const isInsidePlot = isPointInPolygon([pixelCoords[0], pixelCoords[1]], plotBoundary);

      if (!isInsidePlot) {
        console.log(`Pixel ${pixel.id || 'unknown'} is outside plot boundary`);
        return false;
      }

      return true;
    });

    console.log(`Filtered pixels for "${selectedLegendClass}":`, filteredPixels.length);
    console.log('Sample pixel values:', filteredPixels.slice(0, 5).map(p => ({
      value: p.properties[activeLayer],
      coords: p.geometry.coordinates,
      classification: classifyPixelValue(activeLayer, p.properties[activeLayer])
    })));

    return filteredPixels;
  }, [plotData, selectedLegendClass, activeLayer, currentPlotFeature, legendData]);

  // Handle legend click
  const handleLegendClick = (label: string, percentage: number) => {
    if (percentage === 0) return;
    
    // Don't show pixels if percentage is 99% or higher
    if (percentage >= 99) {
      setSelectedLegendClass(null);
      return;
    }
    
    setSelectedLegendClass((prev) => (prev === label ? null : label));
  };

  const getLayerClassificationInfo = (layerName: string, baseValue: number, x: number, y: number) => {
    if (layerName === "PEST") {
      if (!pestData?.pest_statistics) return null;
      
      const pestStats = pestData.pest_statistics;
      const className = pestStats.pest_percentage > 0 ? "Pest Affected" : "Healthy";
      const description = pestStats.pest_percentage > 0 ? "pest detected in area" : "no pest detected";
      
      return {
        layer: layerName,
        label: LAYER_LABELS[layerName],
        className: className,
        description: description,
        value: pestStats.pest_percentage,
        pixelValue: pestStats.pest_percentage,
      };
    }

    const analysis = currentPlotFeature?.properties.indices_analysis.find(
      (i: any) => i.index_name === layerName
    );

    if (!analysis) return null;

    const pixelValue = baseValue;
    const className = classifyPixelValue(layerName, pixelValue);
    const description = getClassificationDescription(layerName, className);

    return {
      layer: layerName,
      label: LAYER_LABELS[layerName],
      className: className,
      description: description,
      value: baseValue,
      pixelValue: pixelValue,
    };
  };

  const handlePlotHover = (e: LeafletMouseEvent) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const analysis = currentPlotFeature?.properties.indices_analysis.find(
      (i: any) => i.index_name === activeLayer
    );

    if (!analysis) return;

    const rect = mapWrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x: px, y: py } = e.containerPoint;
    const sx = rect.left + px;
    const sy = rect.top + py;

    const allLayersInfo: any[] = [];
    const layerOrder = ["VV", "RVI", "SWI", "PEST"] as const;

    layerOrder.forEach(layer => {
      if (layer === "PEST") {
        const layerInfo = getLayerClassificationInfo(layer, 0, px, py);
        if (layerInfo) {
          allLayersInfo.push(layerInfo);
        }
      } else {
        const layerAnalysis = currentPlotFeature?.properties.indices_analysis.find(
          (i: any) => i.index_name === layer
        );
        if (layerAnalysis) {
          const layerInfo = getLayerClassificationInfo(layer, layerAnalysis.current_value || 0, px, py);
          if (layerInfo) {
            allLayersInfo.push(layerInfo);
          }
        }
      }
    });

    // Set tooltip with reduced delay for faster response
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPlotInfo({
        x: sx,
        y: sy,
        allLayersInfo: allLayersInfo,
      });
    }, 50);
  };

  const handlePlotLeave = () => {
    // Clear timeout and hide tooltip with reduced delay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPlotInfo(null);
    }, 100);
  };

  const renderPlotBorder = () => {
    const geom = currentPlotFeature?.geometry;
    console.log('🗺️ renderPlotBorder: geom:', geom);
    console.log('🗺️ renderPlotBorder: currentPlotFeature:', currentPlotFeature);
    
    if (!geom || geom.type !== "Polygon") {
      console.log('🗺️ renderPlotBorder: No valid geometry found');
      return null;
    }

    const coords = geom.coordinates[0]
      .map((c: any) => [c[1], c[0]] as LatLngTuple)
      .filter((tuple: LatLngTuple) => !isNaN(tuple[0]) && !isNaN(tuple[1]));

    console.log('🗺️ renderPlotBorder: coords:', coords);

    return (
      <Polygon
        positions={coords}
        pathOptions={{
          fillOpacity: 0,
          color: "#FFD700",
          weight: 3,
        }}
        eventHandlers={{
          mousemove: handlePlotHover,
          mouseout: handlePlotLeave,
        }}
      />
    );
  };

  // Enhanced filtered pixels rendering with comprehensive hover functionality
  const renderFilteredPixels = () => {
    if (!selectedLegendClass || getFilteredPixels.length === 0) return null;

    return getFilteredPixels.map((pixel: any, index: number) => {
      const coords = pixel.geometry.coordinates;
      
      // Create a smaller square around the pixel coordinates
      const squareSize = 0.00003;
      const bounds: [LatLngTuple, LatLngTuple] = [
        [coords[1] - squareSize, coords[0] - squareSize], // Southwest corner
        [coords[1] + squareSize, coords[0] + squareSize], // Northeast corner
      ];

      return (
        <Rectangle
          key={`filtered-pixel-${pixel.properties.pixel_id || index}`}
          bounds={bounds}
          pathOptions={{
            fillColor: "#FFFFFF", // White color for all markers
            fillOpacity: 0.8,
            color: "#FFFFFF", // White border
            weight: 1,
            opacity: 0.9,
          }}
          eventHandlers={{
            mouseover: (e) => {
              // Clear any existing timeout
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }

              const rect = mapWrapperRef.current?.getBoundingClientRect();
              if (!rect) return;

              const { x: px, y: py } = e.containerPoint;
              const sx = rect.left + px;
              const sy = rect.top + py;

              // Create hover info for ALL layers for this specific pixel
              const allLayersInfo: any[] = [];
              const layerOrder = ["VV", "RVI", "SWI", "PEST"] as const;

              layerOrder.forEach(layer => {
                if (layer === "PEST") {
                  if (pestData?.pest_statistics) {
                    const pestStats = pestData.pest_statistics;
                    const className = pestStats.pest_percentage > 0 ? "Pest Affected" : "Healthy";
                    const description = pestStats.pest_percentage > 0 ? "pest detected in area" : "no pest detected";
                    
                    allLayersInfo.push({
                      layer: layer,
                      label: LAYER_LABELS[layer],
                      className: className,
                      description: description,
                      value: pestStats.pest_percentage,
                      pixelValue: pestStats.pest_percentage,
                    });
                  }
                } else {
                  const pixelValue = pixel.properties[layer]; // Get pixel value for each layer
                  if (typeof pixelValue === 'number') {
                    const pixelClassName = classifyPixelValue(layer, pixelValue);
                    const pixelDescription = getClassificationDescription(layer, pixelClassName);
                    
                    allLayersInfo.push({
                      layer: layer,
                      label: LAYER_LABELS[layer],
                      className: pixelClassName,
                      description: pixelDescription,
                      value: pixelValue,
                      pixelValue: pixelValue,
                    });
                  }
                }
              });

              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredPlotInfo({
                  x: sx,
                  y: sy,
                  allLayersInfo: allLayersInfo, // Show all layers data for this pixel
                });
              }, 50);
            },
            mouseout: () => {
              // Clear timeout and hide tooltip
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredPlotInfo(null);
              }, 100);
            }
          }}
        />
      );
    });
  };

  return (
    <div className="map-wrapper">
      {/* Enhanced Top Layer Controls */}
      <div className="top-layer-controls">
        <div className="layer-buttons">
          {(["VV", "RVI", "SWI", "PEST"] as const).map((layer) => (
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

        {/* Enhanced Plot Selector */}
        {profile && (
          <div className="plot-selector-compact">
            <select
              value={selectedPlotName}
              onChange={(e) => {
                const newPlot = e.target.value;
                setSelectedPlotName(newPlot);
                localStorage.setItem('selectedPlot', newPlot);
                
                // Fetch new data for selected plot
                fetchPlotData(newPlot);
                fetchFieldAnalysis(newPlot);
                fetchPestData(newPlot);
              }}
              disabled={loading}
            >
              {profile.plots?.map(plot => (
                <option key={plot.fastapi_plot_id} value={plot.fastapi_plot_id}>
                  {plot.fastapi_plot_id}
                </option>
              )) || []}
            </select>
          </div>
        )}

        {/* Enhanced Status Indicators */}
        {loading && <div className="status-indicator loading">Loading...</div>}
        {error && <div className="status-indicator error">{error}</div>}
        {!loading && !error && !currentPlotFeature && selectedPlotName && (
          <div className="status-indicator warning">
            No plot data available for {selectedPlotName}. Please check the API connection.
            <button 
              onClick={() => fetchPlotData(selectedPlotName)} 
              className="retry-btn"
              style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
            >
              Retry
            </button>
          </div>
        )}
        
      </div>

      <div className="map-container" ref={mapWrapperRef}>
        <button 
          className="fullscreen-btn" 
          onClick={() => {
            if (!document.fullscreenElement) 
              mapWrapperRef.current?.requestFullscreen();
            else 
              document.exitFullscreen();
          }}
        >
          ⛶
        </button>

        {currentPlotFeature && (
          <div className="plot-info">
            <div className="plot-area">
              {currentPlotFeature.properties.area_hectares.toFixed(2)} ha
            </div>
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          maxZoom={22}
          minZoom={10}
        >
          {/* Base satellite layer */}
          <TileLayer
            url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution="© Google"
            maxZoom={22}
          />

          {currentPlotFeature?.geometry?.coordinates?.[0] && (
            <AutoZoomToPlot coordinates={currentPlotFeature.geometry.coordinates[0]} />
          )}

          {/* Enhanced active layer rendering with comprehensive logging */}
          {(() => {
            const activeUrl = getActiveLayerUrl();
            console.log('🗺️ Rendering active layer with URL:', activeUrl);
            console.log('🗺️ Active layer:', activeLayer);
            console.log('🗺️ Layer change key:', layerChangeKey);
            return activeUrl ? (
              <CustomTileLayer
                url={activeUrl}
                opacity={0.7}
                key={`${activeLayer}-layer-${layerChangeKey}`}
              />
            ) : (
              <div style={{ display: 'none' }}>
                {(() => {
                  console.log('🗺️ ❌ No active layer URL available for layer:', activeLayer);
                  return null;
                })()}
              </div>
            );
          })()}

          {/* Show filtered pixels ON TOP of the active layer when legend class is selected */}
          {selectedLegendClass && renderFilteredPixels()}

          {renderPlotBorder()}
        </MapContainer>

        {/* Enhanced hover tooltip with comprehensive layer information */}
        {hoveredPlotInfo && hoveredPlotInfo.allLayersInfo && (
          <div
            className="enhanced-tooltip"
            style={{
              left: hoveredPlotInfo.x + 10,
              top: hoveredPlotInfo.y - 20,
              transform: hoveredPlotInfo.x > window.innerWidth - 350 ? 'translateX(-100%)' : 'none'
            }}
          >
            {hoveredPlotInfo.allLayersInfo.map((layerInfo, index) => (
              <div key={index} className="enhanced-tooltip-line">
                <span className="layer-name">{layerInfo.label}:</span>
                <span className="layer-description">{layerInfo.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced legend container with improved click handling */}
      {(() => {
        console.log('🗺️ Legend rendering check - legendData.length:', legendData.length);
        console.log('🗺️ Legend rendering check - legendData:', legendData);
        return legendData.length > 0;
      })() && (
        <div className="legend-container">
          <div className="legend-header">
            <div className="legend-title">
              {LAYER_LABELS[activeLayer]}%
            </div>
          </div>
          <div className="legend-items">
            {legendData.map((item: any, index: number) => (
              <div
                key={index}
                className={`legend-item ${
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
                {/* Enhanced legend circle with gradient background */}
                <div
                  className="legend-circle cursor-pointer transition-all duration-150"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}20, ${item.color}80)`,
                    border: `3px solid ${item.color}`,
                    boxShadow: `0 2px 8px ${item.color}40`
                  }}
                >
                  <div className="legend-percentage font-bold text-lg md:text-3xl text-gray-900">
                    {item.percentage}
                  </div>
                </div>
                <div className="legend-label">{item.label}</div>
                {item.pixelCount && (
                  <div className="legend-pixel-count text-xs text-gray-600">
                    {item.pixelCount} pixels
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Fallback message when no legend data is available */}
      {!loading && !error && legendData.length === 0 && selectedPlotName && (
        <div className="legend-container">
          <div className="legend-header">
            <div className="legend-title">
              {LAYER_LABELS[activeLayer]} - No Data
            </div>
          </div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-circle" style={{ backgroundColor: "#cccccc" }} />
              <div className="legend-label">No data available</div>
              <div className="legend-percentage">0%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;