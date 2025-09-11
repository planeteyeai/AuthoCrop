import React, { useEffect, useState } from "react";
import { Download, Info, Satellite } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useFarmerProfile } from "../hooks/useFarmerProfile";

interface NutrientData {
  name: string;
  symbol: string;
  value: number | string | null;
  unit: string;
  optimalRange: string;
  level: "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown";
  percentage: number;
}

interface SoilAnalysisProps {
  selectedPlotName: string | null;
  phValue: number | null;
  phStatistics?: {
    phh2o_0_5cm_mean_mean: number;
  };
}

interface ApiSoilData {
  // NPK Uptake values (first three cards)
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  
  // Basic soil properties
  ph?: number;
  pH?: number;
  cec?: number;
  cation_exchange_capacity?: number;
  organic_carbon?: number;
  soil_organic_carbon?: number;
  soil_density?: number;
  bulk_density?: number;
  ocd?: number;
  soc?: number;
  total_nitrogen?: number;
  organic_carbon_stock?: number;
  plot_name?: string;

  // Iron-related fields
  fe?: number;
  fe_ppm_estimated?: number;
  fe_index_primary?: number;
  fe_index_difference?: number;
  fe_index_normalized?: number;
  fe_image_date?: string;
  fe_polarizations?: number[];
  
  // Backscatter values
  vv_backscatter_db?: number;
  vh_backscatter_db?: number;
  
  // Alternative field names that might be used
  bdod_0_5cm_mean?: number;
  soc_0_5cm_mean?: number;
  nitrogen_0_5cm_mean?: number;
  cec_0_5cm_mean?: number;
  ocd_0_5cm_mean?: number;
  ocs_0_30cm_mean?: number;
  phh2o?: number;
  phh2o_0_5cm_mean?: number;
}

const SoilAnalysis: React.FC<SoilAnalysisProps> = ({
  selectedPlotName,
  phValue,
  phStatistics,
}) => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  const { profile, loading: profileLoading } = useFarmerProfile();
  const soilData = appState.soilData || null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlotName, setCurrentPlotName] = useState<string | null>(selectedPlotName);

  // Get display name for the selected plot
  const getPlotDisplayName = (plotId: string | null) => {
    if (!plotId || !profile?.plots) return plotId;
    
    const plot = profile.plots.find(p => p.fastapi_plot_id === plotId);
    if (plot) {
      // Use gat_number or plot_number as display name, fallback to fastapi_plot_id
      return plot.gat_number || plot.plot_number || plot.fastapi_plot_id;
    }
    
    return plotId;
  };

  // Auto-select first plot from farmer profile if no plot is selected
  useEffect(() => {
    console.log('SoilAnalysis: Profile loading state:', profileLoading);
    console.log('SoilAnalysis: Profile data:', profile);
    console.log('SoilAnalysis: Profile plots array:', profile?.plots);
    console.log('SoilAnalysis: Profile plots length:', profile?.plots?.length);
    console.log('SoilAnalysis: Selected plot name:', selectedPlotName);
    console.log('SoilAnalysis: Current plot name:', currentPlotName);
    
    if (!selectedPlotName && profile?.plots && profile.plots.length > 0) {
      const firstPlot = profile.plots[0];
      console.log('SoilAnalysis: First plot data:', firstPlot);
      const plotName = firstPlot.fastapi_plot_id || `${firstPlot.gat_number}_${firstPlot.plot_number}`;
      console.log('SoilAnalysis: Generated plot name:', plotName);
      setCurrentPlotName(plotName);
      console.log('SoilAnalysis: Auto-selected plot from farmer profile:', plotName);
    } else if (selectedPlotName) {
      setCurrentPlotName(selectedPlotName);
      console.log('SoilAnalysis: Using selected plot name:', selectedPlotName);
    } else {
      console.log('SoilAnalysis: No plot available - profile plots:', profile?.plots);
      console.log('SoilAnalysis: Profile plots length:', profile?.plots?.length);
      console.log('SoilAnalysis: Selected plot name is null:', selectedPlotName === null);
    }
  }, [selectedPlotName, profile, profileLoading]);

  const plotDisplayName = getPlotDisplayName(currentPlotName);

  // Debug logging for selectedPlotName changes
  useEffect(() => {
    console.log("SoilAnalysis: selectedPlotName changed to:", selectedPlotName);
  }, [selectedPlotName]);

  useEffect(() => {
    if (!currentPlotName) {
      setAppState((prev: any) => ({ ...prev, soilData: null }));
      return;
    }
    const cacheKey = `soilData_${currentPlotName}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({ ...prev, soilData: cached }));
      setLoading(false);
      return;
    }

    const fetchSoilData = async (retryCount = 0) => {
      // Don't retry more than 2 times
      if (retryCount > 2) {
        setError('Failed to fetch soil data after multiple attempts');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        // Get current date for the API call
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const plantationDate = "2025-01-01"; // Default plantation date
        
        const response = await fetch(
          `http://192.168.41.73:8003/analyze-npk/${currentPlotName}?plantation_date=2025-01-01&date=${currentDate}&fe_days_back=30`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            mode: "cors",
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          "SoilAnalysis: Fetched soil data for plot",
          currentPlotName,
          ":",
          data
        );

        // Process the new API response structure
        let soilDataToSet: ApiSoilData | null = null;

        if (data && data.soil_statistics) {
          // Extract NPK uptake data
          const npkUptake = data.estimated_npk_uptake_perAcre || {};
          
          // Map the new API response to our existing structure
          soilDataToSet = {
            // NPK Uptake values (first three cards)
            nitrogen: npkUptake.N || 0,
            phosphorus: npkUptake.P || 0,
            potassium: npkUptake.K || 0,
            
            // Soil statistics
            ph: data.soil_statistics.phh2o || 0,
            bulk_density: data.soil_statistics.bulk_density || 0,
            soil_organic_carbon: data.soil_statistics.soil_organic_carbon || 0,
            total_nitrogen: data.soil_statistics.total_nitrogen || 0,
            cation_exchange_capacity: data.soil_statistics.cation_exchange_capacity || 0,
            organic_carbon_stock: data.soil_statistics.organic_carbon_stock || 0,
            
            // Additional fields from the API
            fe_index_primary: data.soil_statistics.fe_index_primary || 0,
            fe_index_difference: data.soil_statistics.fe_index_difference || 0,
            fe_index_normalized: data.soil_statistics.fe_index_normalized || 0,
            fe_ppm_estimated: data.soil_statistics.fe_ppm_estimated || 0,
            vv_backscatter_db: data.soil_statistics.vv_backscatter_db || 0,
            vh_backscatter_db: data.soil_statistics.vh_backscatter_db || 0,
            fe_image_date: data.soil_statistics.fe_image_date || "",
            fe_polarizations: data.soil_statistics.fe_polarizations || [],
            
            // Keep plot name for reference
            plot_name: currentPlotName,
          };
          
          console.log("SoilAnalysis: Processed new API response:", soilDataToSet);
        }

        if (soilDataToSet) {
          setAppState((prev: any) => ({ ...prev, soilData: soilDataToSet }));
          setCached(cacheKey, soilDataToSet);
        } else {
          throw new Error(
            "Unexpected API response structure. Could not find soil statistics."
          );
        }
      } catch (err: any) {
        console.error(
          "SoilAnalysis: Error fetching or parsing soil data:",
          err
        );
        
        // Handle different types of errors
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else if (err.message.includes('Failed to fetch')) {
          setError('Network error: Unable to connect to soil analysis service');
        } else if (err.message.includes('HTTP error')) {
          setError(`Server error: ${err.message}`);
        } else {
          setError(`Failed to fetch soil data: ${err.message}`);
        }
        
        // Set fallback data instead of null to prevent crashes
        const fallbackData: ApiSoilData = {
          plot_name: currentPlotName,
          nitrogen: undefined,
          phosphorus: undefined,
          potassium: undefined,
          pH: undefined,
          cec: undefined,
          organic_carbon: undefined,
          soil_density: undefined,
          ocd: undefined,
          soc: undefined,
          bulk_density: undefined,
          soil_organic_carbon: undefined,
          total_nitrogen: undefined,
          cation_exchange_capacity: undefined,
           fe: undefined,
          organic_carbon_stock: undefined,
          phh2o: undefined,
          bdod_0_5cm_mean: undefined,
          soc_0_5cm_mean: undefined,
          nitrogen_0_5cm_mean: undefined,
          cec_0_5cm_mean: undefined,
          ocd_0_5cm_mean: undefined,
          ocs_0_30cm_mean: undefined,
          phh2o_0_5cm_mean: undefined,
        };
        
        setAppState((prev: any) => ({ ...prev, soilData: fallbackData }));
        
        // Retry the request if it's a network error
        if (err.message.includes('Failed to fetch') && retryCount < 2) {
          console.log(`Retrying soil data request (attempt ${retryCount + 1})...`);
          setTimeout(() => {
            fetchSoilData(retryCount + 1);
          }, 2000); // Wait 2 seconds before retry
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSoilData();
  }, [currentPlotName]);

  function getPHLevel(
    pHValue: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (pHValue === null) return "unknown";
    if (pHValue < 5.0) return "very-low";
    if (pHValue < 6.0) return "low";
    if (pHValue < 6.2) return "medium";
    if (pHValue <= 7.5) return "optimal";
    return "very-high";
  }

  function calculatePHPercentage(pHValue: number | null): number {
    if (pHValue === null) return 0;
    const minPH = 4.0;
    const maxPH = 8.0;
    const optimalMin = 6.2;
    const optimalMax = 7.5;

    if (pHValue <= optimalMin) {
      return Math.max(0, ((pHValue - minPH) / (optimalMin - minPH)) * 50);
    } else if (pHValue >= optimalMax) {
      return Math.min(
        100,
        50 + ((pHValue - optimalMax) / (maxPH - optimalMax)) * 50
      );
    } else {
      return 50 + ((pHValue - optimalMin) / (optimalMax - optimalMin)) * 50;
    }
  }

  // Helper functions to calculate levels and percentages for different nutrients
  function getNitrogenLevel(
    value: number
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" {
    if (value < 30) return "very-low";
    if (value < 50) return "low";
    if (value < 50) return "medium";
    if (value <= 150) return "optimal";
    return "very-high";
  }

  function getPhosphorusLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 15) return "very-low";
    if (value < 25) return "low";
    if (value < 25) return "medium";
    if (value <= 75) return "optimal";
    return "very-high";
  }

  function getPotassiumLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 10) return "very-low";
    if (value < 20) return "low";
    if (value < 20) return "medium";
    if (value <= 100) return "optimal";
    return "very-high";
  }

  function getCECLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 8) return "very-low";
    if (value < 15) return "low";
    if (value < 15) return "medium";
    if (value <= 40) return "optimal";
    return "very-high";
  }

  function getFeLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 2.0) return "very-low";
    if (value < 4.5) return "low";
    if (value < 6.0) return "medium";
    if (value <= 10.0) return "optimal";
    return "very-high";
  }

  function getOCLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 0.5) return "very-low";
    if (value < 1.0) return "low";
    if (value < 1.5) return "medium";
    if (value <= 3.5) return "optimal";
    return "very-high";
  }

  function getOCDLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 2.0) return "very-low";
    if (value < 2.5) return "low";
    if (value < 3.0) return "medium";
    if (value <= 4.0) return "optimal";
    return "very-high";
  }

  function getSOCLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 0.5) return "very-low";
    if (value < 1.0) return "low";
    if (value < 1.5) return "medium";
    if (value <= 3.5) return "optimal";
    return "very-high";
  }

  // Helper functions for new soil parameters
  function getBulkDensityLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 2.0) return "very-low";
    if (value < 2.3) return "low";
    if (value < 2.5) return "medium";
    if (value <= 2.75) return "optimal";
    return "very-high";
  }

  function getTotalNitrogenLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 0.5) return "very-low";
    if (value < 1.0) return "low";
    if (value < 1.5) return "medium";
    if (value <= 2.5) return "optimal";
    return "very-high";
  }

  function getOrganicCarbonStockLevel(
    value: number | null
  ): "very-low" | "low" | "medium" | "optimal" | "very-high" | "unknown" {
    if (value === null) return "unknown";
    if (value < 1) return "very-low";
    if (value < 2) return "low";
    if (value < 2) return "medium";
    if (value <= 15) return "optimal";
    return "very-high";
  }

  // Helper function to calculate percentage based on value and optimal range
  function calculatePercentage(
    value: number | null,
    minOptimal: number,
    maxOptimal: number,
    minRange: number,
    maxRange: number
  ): number {
    if (value === null) return 0;
    if (value <= minOptimal) {
      return Math.max(0, ((value - minRange) / (minOptimal - minRange)) * 50);
    } else if (value >= maxOptimal) {
      return Math.min(
        100,
        50 + ((value - maxOptimal) / (maxRange - maxOptimal)) * 50
      );
    } else {
      return 50 + ((value - minOptimal) / (maxOptimal - minOptimal)) * 50;
    }
  }

  // Helper function to extract values with fallbacks
  const getSoilValue = (
    primary: number | undefined,
    fallback: number | undefined
  ): number | null => {
    if (primary !== undefined && primary !== null) return primary;
    if (fallback !== undefined && fallback !== null) return fallback;
    return null;
  };

  // Calculate current pH value with fallbacks
  const currentPhValue =
    phValue !== null
      ? phValue
      : phStatistics?.phh2o_0_5cm_mean_mean
      ? phStatistics.phh2o_0_5cm_mean_mean
      : null; // Fallback to null

  const metrics: NutrientData[] = [
    {
      name: " Nitrogen",
      symbol: "N",
      value: getSoilValue(
        soilData?.nitrogen,
        soilData?.total_nitrogen
      ),
      unit: "Kg/ha",
      optimalRange: "50 - 150",
      level: getNitrogenLevel(
        getSoilValue(soilData?.nitrogen, soilData?.total_nitrogen) || 0
      ),
      percentage: calculatePercentage(
        getSoilValue(soilData?.nitrogen, soilData?.total_nitrogen),
        50,
        150,
        10,
        200
      ),
    },
    {
      name: "Phosphorus",
      symbol: "P",
      value: getSoilValue(soilData?.phosphorus, undefined),
      unit: "Kg/ha",
      optimalRange: "25 - 75",
      level: getPhosphorusLevel(getSoilValue(soilData?.phosphorus, undefined)),
      percentage: calculatePercentage(
        getSoilValue(soilData?.phosphorus, undefined),
        25,
        75,
        5,
        100
      ),
    },
    {
      name: "Potassium",
      symbol: "K",
      value: getSoilValue(soilData?.potassium, undefined),
      unit: "Kg/ha",
      optimalRange: "20 - 100",
      level: getPotassiumLevel(getSoilValue(soilData?.potassium, undefined)),
      percentage: calculatePercentage(
        getSoilValue(soilData?.potassium, undefined),
        20,
        100,
        5,
        150
      ),
    },

    {
      name: "Soil pH",
      symbol: "pH",
      value:
        getSoilValue(soilData?.phh2o, soilData?.phh2o_0_5cm_mean) ??
        currentPhValue,
      unit: "",
      optimalRange: "6.2 - 7.5",
      level: getPHLevel(
        getSoilValue(soilData?.phh2o, soilData?.phh2o_0_5cm_mean) ??
          currentPhValue
      ),
      percentage: calculatePHPercentage(
        getSoilValue(soilData?.phh2o, soilData?.phh2o_0_5cm_mean) ??
          currentPhValue
      ),
    },
    {
      name: "CEC",
      symbol: "CEC",
      value: getSoilValue(
        soilData?.cation_exchange_capacity,
        soilData?.cec_0_5cm_mean
      ),
      unit: "C mol/Kg",
      optimalRange: "15 - 40",
      level: getCECLevel(
        getSoilValue(
          soilData?.cation_exchange_capacity,
          soilData?.cec_0_5cm_mean
        )
      ),
      percentage: calculatePercentage(
        getSoilValue(
          soilData?.cation_exchange_capacity,
          soilData?.cec_0_5cm_mean
        ),
        15,
        40,
        5,
        50
      ),
    },
    {
      name: "Organic Carbon",
      symbol: "OC",
      value: getSoilValue(
        soilData?.organic_carbon_stock,
        soilData?.ocs_0_30cm_mean
      ),
      unit: " T/ha",
      optimalRange: "2 - 15",
      level: getOrganicCarbonStockLevel(
        getSoilValue(soilData?.organic_carbon_stock, soilData?.ocs_0_30cm_mean)
      ),
      percentage: calculatePercentage(
        getSoilValue(soilData?.organic_carbon_stock, soilData?.ocs_0_30cm_mean),
        2,
        15,
        0.5,
        20
      ),
    },
    {
      name: "Bulk Density",
      symbol: "BD",
      value: getSoilValue(soilData?.bulk_density, soilData?.bdod_0_5cm_mean),
      unit: "Kg/m³",
      optimalRange: "2.64 - 2.75",
      level: getBulkDensityLevel(
        getSoilValue(soilData?.bulk_density, soilData?.bdod_0_5cm_mean)
      ),
      percentage: calculatePercentage(
        getSoilValue(soilData?.bulk_density, soilData?.bdod_0_5cm_mean),
        2.64,
        2.75,
        2.0,
        3.0
      ),
    },
    {
      name: "Fe",
      symbol: "Fe",
      value: getSoilValue(
        soilData?.fe_ppm_estimated || soilData?.fe || soilData?.iron || soilData?.Iron || soilData?.Fe || soilData?.iron_content || soilData?.iron_concentration || soilData?.iron_percentage,
        soilData?.fe_ppm_estimated || soilData?.fe || soilData?.iron || soilData?.Iron || soilData?.Fe || soilData?.iron_content || soilData?.iron_concentration || soilData?.iron_percentage
      ),
      unit: "ppm",
      optimalRange: "4.5 - 10",
      level: getFeLevel(
        getSoilValue(soilData?.fe_ppm_estimated || soilData?.fe || soilData?.iron || soilData?.Iron || soilData?.Fe || soilData?.iron_content || soilData?.iron_concentration || soilData?.iron_percentage, soilData?.fe_ppm_estimated || soilData?.fe || soilData?.iron || soilData?.Iron || soilData?.Fe || soilData?.iron_content || soilData?.iron_concentration || soilData?.iron_percentage)
      ),
      percentage: calculatePercentage(
        getSoilValue(soilData?.fe_ppm_estimated || soilData?.fe || soilData?.iron || soilData?.Iron || soilData?.Fe || soilData?.iron_content || soilData?.iron_concentration || soilData?.iron_percentage, soilData?.fe_ppm_estimated || soilData?.fe || soilData?.iron || soilData?.Iron || soilData?.Fe || soilData?.iron_content || soilData?.iron_concentration || soilData?.iron_percentage),
        4.5,
        10,
        2.0,
        15.0
      ),
    },
    {
      name: "Soil Organic Carbon",
      symbol: "SOC",
      value: getSoilValue(
        soilData?.soil_organic_carbon,
        soilData?.soc_0_5cm_mean
      ),
      unit: "%",
      optimalRange: "1.5 - 3.5",
      level: getOCLevel(
        getSoilValue(soilData?.soil_organic_carbon, soilData?.soc_0_5cm_mean)
      ),
      percentage: calculatePercentage(
        getSoilValue(soilData?.soil_organic_carbon, soilData?.soc_0_5cm_mean),
        1.5,
        3.5,
        0.5,
        4.0
      ),
    },
  ];

  const getLevelColor = (level: string): string => {
    switch (level) {
      case "very-low":
        return "bg-red-500";
      case "low":
        return "bg-orange-400";
      case "medium":
        return "bg-yellow-400";
      case "optimal":
        return "bg-green-500";
      case "very-high":
        return "bg-green-700";
      default:
        return "bg-gray-400";
    }
  };

  const getLevelBorderColor = (level: string): string => {
    switch (level) {
      case "very-low":
        return "border-red-200";
      case "low":
        return "border-orange-200";
      case "medium":
        return "border-yellow-200";
      case "optimal":
        return "border-green-200";
      case "very-high":
        return "border-green-300";
      default:
        return "border-gray-200";
    }
  };

  return (
    <div className="w-full max-w-xs sm:max-w-sm md:max-w-md p-2 sm:p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600 font-semibold">
              Soil Analysis Report
            </span>
            {plotDisplayName && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Plot: {plotDisplayName}
              </span>
            )}
          </div>
          <button className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4 text-gray-500 flex items-center justify-center">
          <Satellite className="w-4 h-4 animate-spin mr-2" />
          Loading soil data...
        </div>
      )}

      {error && <div className="text-center py-4 text-red-500">{error}</div>}

      {profileLoading && (
        <div className="text-center py-8 text-gray-500">
          <Satellite className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
          <p>Loading farmer profile...</p>
        </div>
      )}

      {!profileLoading && !currentPlotName && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No plot data available for soil analysis</p>
          <p className="text-xs mt-2 text-gray-400">
            Debug: profileLoading={profileLoading.toString()}, currentPlotName={currentPlotName || 'null'}, loading={loading.toString()}, error={error || 'null'}
          </p>
        </div>
      )}

      {currentPlotName && loading && (
        <div className="text-center py-8 text-gray-500">
          <Satellite className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
          <p>Loading soil analysis data for your plot...</p>
        </div>
      )}

      {currentPlotName && !loading && !error && (
        <>
          {/* Chart with Y-Axis Labels */}
          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-xs text-gray-600 h-40 py-1">
              <span>Very High</span>
              <span>Optimal</span>
              <span>Medium</span>
              <span>Low</span>
              <span>Very Low</span> 
            </div>
            <div className="flex-1 overflow-x-auto">
              <div className="flex items-end justify-between gap-2 h-40">
                {metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-end h-full w-20 border ${getLevelBorderColor(
                      metric.level
                    )} rounded`}
                  >
                    <div
                      className={`w-full ${getLevelColor(
                        metric.level
                      )} rounded-t`}
                      style={{ height: `${metric.percentage}%` }}
                    ></div>
                    <div className="text-center text-xs mt-1">
                      <strong>{metric.symbol}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-sm mr-1"></div>
              <span className="text-xs text-gray-600 mr-4">Very Low</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-400 rounded-sm mr-1"></div>
              <span className="text-xs text-gray-600 mr-4">Low</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-400 rounded-sm mr-1"></div>
              <span className="text-xs text-gray-600 mr-4">Medium</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-sm mr-1"></div>
              <span className="text-xs text-gray-600 mr-4">Optimal</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-700 rounded-sm mr-1"></div>
              <span className="text-xs text-gray-600">Very High</span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 mt-6">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className={`border ${getLevelBorderColor(
                  metric.level
                )} rounded p-3 text-center shadow-sm`}
              >
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={`${getLevelColor(metric.level)} h-full`}
                    style={{ width: `${metric.percentage}%` }}
                  ></div>
                </div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {metric.name}
                </h3>
                <p className="text-xs text-gray-500">({metric.symbol})</p>
                <p className="text-lg font-bold text-gray-900">
                  {metric.value === null
                    ? "N/A"
                    : typeof metric.value === "number"
                    ? metric.value.toFixed(2)
                    : metric.value}
                  {metric.value !== null && metric.unit && (
                    <span className="text-sm text-gray-500 ml-1">
                      {metric.unit}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-500 bg-gray-100 rounded mt-1 px-2 py-1">
                  Optimal: {metric.optimalRange}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SoilAnalysis;
