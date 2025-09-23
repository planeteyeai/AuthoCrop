import React, { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polygon, useMap, Popup, Rectangle, ZoomControl } from "react-leaflet";
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

// Classification ranges for vegetation indices with gradient color schemes
const CLASS_RANGES = {
  VV: [
    { label: "Weak", min: -20, max: -12, color: "#90EE90" },      // Light green
    { label: "Stress", min: -12, max: -11, color: "#32CD32" },      // Lime green
    { label: "Moderate", min: -11, max: -10, color: "#228B22" },    // Forest green
    { label: "Healthy", min: -10, max: 0, color: "#006400" },       // Dark green
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
      // Calculate center point of the plot
      const centerLat = latlngs.reduce((sum, coord) => sum + coord[0], 0) / latlngs.length;
      const centerLng = latlngs.reduce((sum, coord) => sum + coord[1], 0) / latlngs.length;
      
      // Set fixed zoom level to 18 for detailed view
      map.setView([centerLat, centerLng], 18, {
        animate: true,
        duration: 1.5
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
  onSoilDataChange?: (data: {
    plotName: string;
    phValue: number | null;
    nitrogenValue: number | null;
    phStatistics?: {
      phh2o_0_5cm_mean_mean: number;
    };
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
    chewingPestPercentage: number;
    chewingPestPixels: number;
    suckingPercentage: number;
    suckingPixels: number;
  }) => void;
}

// Simplified CustomTileLayer without cache busting that might be causing issues
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
      url={url} // Use original URL without modifications
      opacity={opacity}
      maxZoom={22}
      minZoom={10}
      tileSize={256}
      // Add error handling to see what's happening
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
  const [mapCenter] = useState<LatLngTuple>([
    17.842832246588202,
    74.91558702408217,
  ]);
  const [selectedPlotName, setSelectedPlotName] = useState("Sarang Gulve 122436");
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

  // Reduced hover timeout for faster response (from 100ms to 50ms)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for selected legend class
  const [selectedLegendClass, setSelectedLegendClass] = useState<string | null>(null);

  // Add layer change counter to force tile layer re-render
  const [layerChangeKey, setLayerChangeKey] = useState(0);

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

  // Auto-select first plot from farmer profile when profile loads
  useEffect(() => {
    console.log('🗺️ Map useEffect: profileLoading:', profileLoading, 'profile:', profile);
    
    // Wait for profile to load before setting plot name
    if (profileLoading || !profile) {
      console.log('🗺️ Map useEffect: Waiting for profile to load...');
      return;
    }

    // Get the first plot from the loaded profile
    const plotNames = profile.plots?.map(plot => plot.fastapi_plot_id) || [];
    const defaultPlot = plotNames.length > 0 ? plotNames[0] : null;
    
    console.log('🗺️ Map useEffect: Available plots:', plotNames);
    console.log('🗺️ Map useEffect: Setting default plot from profile:', defaultPlot);
    console.log('🗺️ Map useEffect: Profile plots data:', profile.plots);
    
    if (defaultPlot) {
      setSelectedPlotName(defaultPlot);
      localStorage.setItem('selectedPlot', defaultPlot);
      
      // Fetch data for the selected plot
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
  }, [profile, profileLoading]);

  const fetchPlotData = async (plotName: string) => {
    setLoading(true);
    setError(null);
    try {
      const currentDate = getCurrentDate();
      const resp = await fetch(
        ` http://192.168.41.73:7031/analyze?plot_name=${plotName}&end_date=${currentDate}&days_back=7`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
    if (!plotName) {
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

      // Handle the response data
      let fieldData: any = null;
      if (Array.isArray(data)) {
        // Find the most recent data for this plot
        const plotData = data.filter((item: any) => {
          const itemPlotName = item.plot_name || item.plot || item.name || '';
          return itemPlotName === plotName;
        });

        if (plotData.length > 0) {
          // Sort by date and get the latest
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

      // Extract field analysis values
      const overallHealth = fieldData?.overall_health ?? fieldData?.health_score ?? fieldData?.field_health ?? 0;
      const healthStatus = fieldData?.health_status ?? fieldData?.status ?? fieldData?.condition ?? "Unknown";
      const meanValue = fieldData?.statistics?.mean ?? fieldData?.mean ?? fieldData?.average ?? 0;

      const fieldAnalysisResult = {
        plotName: fieldData.plot_name ?? plotName,
        overallHealth: overallHealth,
        healthStatus: healthStatus,
        statistics: {
          mean: meanValue,
        },
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
    if (!plotName) {
      setPestData(null);
      return;
    }

    try {
      console.log("Map.tsx: Fetching chewing pest detection for plot:", plotName);
      const currentDate = getCurrentDate();
      const resp = await fetch(
        `http://192.168.41.73:7031/pest-detection-combined?plot_name=${plotName}&end_date=${currentDate}&pest_threshold=0.3&nir_threshold=0.15&ndwi_threshold=0.4&cloud_threshold=30`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!resp.ok) throw new Error(`Chewing pest detection API failed: ${resp.status} ${resp.statusText}`);

      const data = await resp.json();
      console.log("Map.tsx: Chewing pest detection API response:", data);

      setPestData(data);

      // Call the pest data change callback with all pest type data from pixel_summary
      if (data?.pixel_summary && onPestDataChange) {
        const chewingPestPercentage = data.pixel_summary.chewing_affected_pixel_percentage || 0;
        const suckingPercentage = data.pixel_summary.sucking_affected_pixel_percentage || 0;
        const fungiiPercentage = data.pixel_summary.fungii_affected_pixel_percentage || 0;
        const soilBornePercentage = data.pixel_summary.SoilBorne_affected_pixel_percentage || 0;
        const totalAffectedPercentage = chewingPestPercentage + suckingPercentage + fungiiPercentage + soilBornePercentage;
        const healthyPercentage = 100 - totalAffectedPercentage;
        
        onPestDataChange({
          plotName: plotName,
          pestPercentage: totalAffectedPercentage,
          healthyPercentage: healthyPercentage,
          totalPixels: data.pixel_summary.total_pixel_count || 0,
          pestAffectedPixels: (data.pixel_summary.chewing_affected_pixel_count || 0) + 
                             (data.pixel_summary.sucking_affected_pixel_count || 0) + 
                             (data.pixel_summary.fungii_affected_pixel_count || 0) + 
                             (data.pixel_summary.SoilBorne_pixel_count || 0),
          chewingPestPercentage: chewingPestPercentage,
          chewingPestPixels: data.pixel_summary.chewing_affected_pixel_count || 0,
          suckingPercentage: suckingPercentage,
          suckingPixels: data.pixel_summary.sucking_affected_pixel_count || 0,
        });
      }
    } catch (err) {
      console.error("Map.tsx: Error in fetchPestData:", err);
      setPestData(null);
    }
  };

  const getActiveLayerUrl = () => {
    if (activeLayer === "PEST") {
      const pestTileUrl = pestData?.features?.[0]?.properties?.tile_url;
      console.log('Pest tile URL:', pestTileUrl);
      return pestTileUrl;
    }

    const urls = plotData?.features?.[0]?.properties?.tile_urls;
    console.log('All tile URLs:', urls); // Debug log

    if (!urls) {
      console.log('No tile URLs found in plot data');
      return null;
    }

    const layerUrlKey = `${activeLayer}_tile_url` as "VV_tile_url" | "RVI_tile_url" | "SWI_tile_url";
    const url = urls[layerUrlKey];
    console.log(`Active layer: ${activeLayer}, URL key: ${layerUrlKey}, URL: ${url}`); // Debug log

    return url;
  };

  const currentPlotFeature = plotData?.features?.[0];

  const healthAnalysis = useMemo(() => {
    if (!currentPlotFeature?.properties?.indices_analysis) return null;

    const ndvi = currentPlotFeature.properties.indices_analysis.find(
      (i: any) => i.index_name === "VV"
    );

    if (!ndvi?.classifications) return null;

    const healthy = ["Healthy", "Over Growth"];
    const goodPx = ndvi.classifications
      .filter((c: any) => healthy.some((h) => c.class_name?.includes(h)))
      .reduce((sum: number, c: any) => sum + (c && typeof c.pixel_count === 'number' ? c.pixel_count : 0), 0);

    const total = ndvi.total_pixels || 1;

    return {
      goodHealthPercent: Math.round((goodPx / total) * 100),
      needsAttentionPercent: 100 - Math.round((goodPx / total) * 100),
      totalArea: currentPlotFeature.properties?.area_acres || 0,
      plotName: selectedPlotName || "",
    };
  }, [currentPlotFeature, selectedPlotName]);

  useEffect(() => {
    if (healthAnalysis) onHealthDataChange?.(healthAnalysis);
  }, [healthAnalysis, onHealthDataChange]);

  const legendData = useMemo(() => {
    if (activeLayer === "PEST") {
      // Get all pest type percentages from pixel_summary in the API response
      const chewingPestPercentage = pestData?.pixel_summary?.chewing_affected_pixel_percentage || 0;
      const suckingPercentage = pestData?.pixel_summary?.sucking_affected_pixel_percentage || 0;
      const fungiiPercentage = pestData?.pixel_summary?.fungii_affected_pixel_percentage || 0;
      const soilBornePercentage = pestData?.pixel_summary?.SoilBorne_affected_pixel_percentage || 0;
      
      return [
        {
          label: "Chewing Pests",
          color: "#DC2626", // Red-600
          percentage: Math.round(chewingPestPercentage), // Display as rounded whole number (e.g., 9)
          description: "Areas affected by chewing pests"
        },
        {
          label: "Sucking Pests", 
          color: "#B91C1C", // Red-700
          percentage: Math.round(suckingPercentage), // Display as rounded whole number (e.g., 3)
          description: "Areas affected by sucking disease"
        },
        {
          label: "Fungi",
          color: "#991B1B", // Red-800
          percentage: Math.round(fungiiPercentage), // Display fungii percentage from API
          description: "fungii infections affecting plants"
        },
        {
          label: "Soil    Borne",
          color: "#7F1D1D", // Red-900
          percentage: Math.round(soilBornePercentage), // Display SoilBorne percentage from API
          description: "SoilBorne infections affecting plants"
        }
      ];
    }

    if (!currentPlotFeature?.properties?.indices_analysis) return [];

    const analysis = currentPlotFeature?.properties?.indices_analysis?.find(
      (i: any) => i.index_name === activeLayer
    );

    if (!analysis?.classifications) return [];

    const totalPixels = analysis.total_pixels || 1;

    return CLASS_RANGES[activeLayer].map((range) => {
      const matching = analysis.classifications.filter((c: any) =>
        c?.class_name && c.class_name.toLowerCase().includes(range.label.toLowerCase())
      );

      const pixelCount = matching.reduce(
        (sum: number, c: any) => sum + (typeof c.pixel_count === 'number' ? c.pixel_count : 0),
        0
      );

      const percentage = Math.round((pixelCount / totalPixels) * 100);

      // Debug: Log matching for SWI layer
      if (activeLayer === "SWI") {
        console.log(`Legend item "${range.label}":`, {
          matching: matching.map((c: any) => ({ class_name: c.class_name, pixel_count: c.pixel_count })),
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

  // FIXED: Get filtered pixels based on selected legend class
  const getFilteredPixels = useMemo(() => {
    if (!selectedLegendClass) return [];
    
    // For pest detection, show pixels for all pest categories
    if (activeLayer === "PEST") {
      if (!pestData || !currentPlotFeature) return [];
      
      // Show pixels for any pest category
      if (!["Chewing Pests", "sucking Pests", "fungii", "SoilBorne"].includes(selectedLegendClass)) return [];
      
      let coordinates = [];
      let pestType = "";
      
      if (selectedLegendClass === "Chewing Pests") {
        coordinates = pestData.pixel_summary?.chewing_affected_pixel_coordinates || [];
        pestType = "Chewing Pests";
      } else if (selectedLegendClass === "sucking Pests") {
        coordinates = pestData.pixel_summary?.sucking_affected_pixel_coordinates || [];
        pestType = "sucking Pests";
      } else if (selectedLegendClass === "fungii") {
        coordinates = pestData.pixel_summary?.fungii_affected_pixel_coordinates || [];
        pestType = "fungii";
      } else if (selectedLegendClass === "SoilBorne") {
        coordinates = pestData.pixel_summary?.SoilBorne_affected_pixel_coordinates || [];
        pestType = "SoilBorne";
      }
      
      if (!coordinates || !Array.isArray(coordinates)) return [];
      
      // Convert API coordinates to pixel objects
      const actualPixels = coordinates.map((coord, index) => {
        if (!Array.isArray(coord) || coord.length < 2) return null;
        
        return {
          geometry: { coordinates: [coord[0], coord[1]] }, // [lng, lat]
          properties: {
            pixel_id: `${pestType.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            pest_type: pestType,
            pest_category: pestType
          }
        };
      }).filter(Boolean); // Remove any null entries
      
      return actualPixels;
    }
    
    if (!plotData?.features || !currentPlotFeature) return [];
    
    // Don't show pixels if percentage is 99% or higher (almost entire plot is one classification)
    const selectedLegendItem = legendData.find(item => item.label === selectedLegendClass);
    if (selectedLegendItem && selectedLegendItem.percentage >= 99) return [];
    
    // Get plot boundary coordinates
    const plotGeometry = currentPlotFeature.geometry;
    if (!plotGeometry || plotGeometry.type !== "Polygon") return [];
    
    const plotBoundary = plotGeometry.coordinates[0].map((coord: [number, number]) => 
      [coord[0], coord[1]] as [number, number]
    );
    
    // Get all pixel features (features with feature_type === "pixel_data")
    const pixelFeatures = plotData.features.filter(
      (feature: any) => feature?.properties?.feature_type === "pixel_data"
    );
    
    if (!pixelFeatures.length) return [];
    
    console.log(`Total pixel features found: ${pixelFeatures.length}`);
    console.log(`Selected legend class: ${selectedLegendClass}`);
    console.log(`Active layer: ${activeLayer}`);
    
    // Debug: Log sample pixel values for SWI layer
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
      const pixelValue = pixel?.properties?.[activeLayer];
      
      if (typeof pixelValue !== 'number') {
        console.log(`Pixel ${pixel?.id || 'unknown'} has non-numeric value:`, pixelValue);
        return false;
      }
      
      // Check if pixel value falls within the classification range
      const isInRange = pixelValue >= classRange.min && 
                       (classRange.max === Infinity ? true : pixelValue < classRange.max);
      
      console.log(`Pixel ${pixel.id || 'unknown'} value: ${pixelValue}, range: ${classRange.min} to ${classRange.max}, inRange: ${isInRange}`);
      
      if (!isInRange) return false;
      
      // Check if pixel is inside plot boundary
      const pixelCoords = pixel?.geometry?.coordinates;
      if (!pixelCoords || !Array.isArray(pixelCoords) || pixelCoords.length < 2) {
        console.log(`Pixel ${pixel?.id || 'unknown'} has invalid coordinates:`, pixelCoords);
        return false;
      }
      const isInsidePlot = isPointInPolygon([pixelCoords[0], pixelCoords[1]], plotBoundary);
      
      if (!isInsidePlot) {
        console.log(`Pixel ${pixel.id || 'unknown'} is outside plot boundary`);
        return false;
      }
      
      return true;
    });
    
    console.log(`Filtered pixels for "${selectedLegendClass}":`, filteredPixels.length);
    console.log('Sample pixel values:', filteredPixels.slice(0, 5).map((p: any) => ({
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

  const getLayerClassificationInfo = (layerName: string, baseValue: number) => {
    if (layerName === "PEST") {
      if (!pestData?.pixel_summary) return null;

      const chewingPestPercentage = pestData.pixel_summary.chewing_affected_pixel_percentage || 0;
      const suckingPercentage = pestData.pixel_summary.sucking_affected_pixel_percentage || 0;
      const fungiiPercentage = pestData.pixel_summary.fungii_affected_pixel_percentage || 0;
      const soilBornePercentage = pestData.pixel_summary.SoilBorne_affected_pixel_percentage || 0;
      
      // Determine the most prominent pest type
      let className = "Healthy";
      let description = "no pest damage detected";
      let value = 0;
      
      // Find the highest percentage pest type
      const pestTypes = [
        { name: "Chewing Pests", percentage: chewingPestPercentage, description: "chewing pest damage detected in area" },
        { name: "sucking Pests", percentage: suckingPercentage, description: "sucking disease damage detected in area" },
        { name: "fungii", percentage: fungiiPercentage, description: "fungii infections detected in area" },
        { name: "SoilBorne", percentage: soilBornePercentage, description: "SoilBorne infections detected in area" }
      ];
      
      const dominantPest = pestTypes.reduce((prev, current) => 
        (current.percentage > prev.percentage) ? current : prev
      );
      
      if (dominantPest.percentage > 0) {
        className = dominantPest.name;
        description = dominantPest.description;
        value = dominantPest.percentage;
      }

      return {
        layer: layerName,
        label: LAYER_LABELS[layerName],
        className: className,
        description: description,
        value: value,
        pixelValue: value,
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
        const layerInfo = getLayerClassificationInfo(layer, 0);
        if (layerInfo) {
          allLayersInfo.push(layerInfo);
        }
      } else {
        const layerAnalysis = currentPlotFeature?.properties.indices_analysis.find(
          (i: any) => i.index_name === layer
        );
        if (layerAnalysis) {
          const layerInfo = getLayerClassificationInfo(layer, layerAnalysis.current_value || 0);
          if (layerInfo) {
            allLayersInfo.push(layerInfo);
          }
        }
      }
    });

    // Set tooltip with reduced delay for faster response (50ms instead of 100ms)
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPlotInfo({
        x: sx,
        y: sy,
        allLayersInfo: allLayersInfo,
      });
    }, 50);
  };

  const handlePlotLeave = () => {
    // Clear timeout and hide tooltip with reduced delay (100ms instead of 200ms)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPlotInfo(null);
    }, 100);
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
        eventHandlers={{
          mousemove: handlePlotHover,
          mouseout: handlePlotLeave,
        }}
      />
    );
  };

  // Render filtered pixels as Rectangle (square) markers with hover functionality
  const renderFilteredPixels = () => {
    if (!selectedLegendClass || getFilteredPixels.length === 0) return null;

    return getFilteredPixels.map((pixel: any, index: number) => {
      const coords = pixel?.geometry?.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length < 2) {
        console.error(`Invalid pixel coordinates for pixel at index ${index}:`, coords);
        return null;
      }
      
      // Create a much smaller square around the pixel coordinates to stay within plot boundary
      const squareSize = 0.00003; // Reduced size to ensure squares stay within plot boundary
      const bounds: [LatLngTuple, LatLngTuple] = [
        [coords[1] - squareSize, coords[0] - squareSize], // Southwest corner
        [coords[1] + squareSize, coords[0] + squareSize], // Northeast corner
      ];

      return (
        <Rectangle
          key={`filtered-pixel-${pixel?.properties?.pixel_id || index}`}
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
                  if (pestData?.pixel_summary) {
                    const pestCategory = pixel?.properties?.pest_category || "Healthy";
                    let description = "no pest damage detected";
                    let value = 0;
                    
                    if (pestCategory === "Chewing Pests") {
                      description = "chewing pest damage detected in area";
                      value = pestData.pixel_summary.chewing_affected_pixel_percentage || 0;
                    } else if (pestCategory === "sucking Pests") {
                      description = "sucking disease damage detected in area";
                      value = pestData.pixel_summary.sucking_affected_pixel_percentage || 0;
                    } else if (pestCategory === "fungii") {
                      description = "fungii infections detected in area";
                      value = pestData.pixel_summary.fungii_affected_pixel_percentage || 0;
                    } else if (pestCategory === "SoilBorne") {
                      description = "SoilBorne infections detected in area";
                      value = pestData.pixel_summary.SoilBorne_affected_pixel_percentage || 0;
                    }

                    allLayersInfo.push({
                      layer: layer,
                      label: LAYER_LABELS[layer],
                      className: pestCategory,
                      description: description,
                      value: value,
                      pixelValue: value,
                    });
                  }
                } else {
                  const pixelValue = pixel?.properties?.[layer]; // Get pixel value for each layer
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
                  allLayersInfo: allLayersInfo, // Show all 3 layers data for this pixel
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
      <div className="layer-controls">
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

        {/* Plot Selector */}
        {profile && !profileLoading && (
          <div className="plot-selector">
            <label>Select Plot:</label>
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
                  {plot.gat_number || plot.plot_number || plot.fastapi_plot_id}
                </option>
              )) || []}
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

          {currentPlotFeature?.geometry?.coordinates?.[0] && Array.isArray(currentPlotFeature.geometry.coordinates[0]) && (
            <SetFixedZoom coordinates={currentPlotFeature.geometry.coordinates[0]} />
          )}

          {/* Debug: Show active layer URL in console and render tile layer */}
          {(() => {
            const activeUrl = getActiveLayerUrl();
            console.log('Rendering active layer with URL:', activeUrl);
            return activeUrl ? (
              <CustomTileLayer
                url={activeUrl}
                opacity={0.7}
                key={`${activeLayer}-layer-${layerChangeKey}`}
              />
            ) : (
              <div style={{ display: 'none' }}>
                {(() => { console.log('No active layer URL available'); return null; })()}
              </div>
            );
          })()}

          {/* Show filtered pixels ON TOP of the active layer when legend class is selected */}
          {selectedLegendClass && renderFilteredPixels()}

          {renderPlotBorder()}
        </MapContainer>

        {/* Legend circles at bottom of map container */}
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
                      background: `linear-gradient(135deg, ${item.color}40, ${item.color}80)`,
                      border: `5px solid ${item.color}`,
                      boxShadow: `0 5px 8px ${item.color}40`
                    }}
                  >
                    <div className="legend-percentage-bottom font-bold text-xlg text-white-900">
                      {item.percentage}
                    </div>
                  </div>
                  <div className="legend-label-bottom">{item.label}</div>
                  {item.pixelCount && (
                    <div className="legend-pixel-count-bottom text-lg text-white-900">
                      {item.pixelCount} pixels
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

    </div>
  );
};

export default Map;