import React, { useEffect, useState } from "react";
import { Droplets } from "lucide-react";
import "../Irrigation.css";
import { useAppContext } from "../../../context/AppContext";
import { useFarmerProfile } from "../../../hooks/useFarmerProfile";

interface SoilMoistureCardProps {
  optimalRange: [number, number]; // [min%, max%]
  moistGroundPercent?: number | null;
  targetDate?: string; // Optional date input (format: YYYY-MM-DD)
}

interface MoistureAPIResponse {
  type: string;
  features: Array<{
    type: string;
    properties: {
      plot_name?: string;
      feature_type?: string;
      indices_analysis?: Array<{
        index_name: string;
        classifications: Array<{
          class_name: string;
          value_range: string;
          pixel_count: number;
          percentage: number;
        }>;
        total_pixels?: number;
      }>;
    };
  }>;
}

const SoilMoistureCard: React.FC<SoilMoistureCardProps> = ({
  optimalRange,
  moistGroundPercent,
  targetDate = "2025-06-07",
}) => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  const { profile, loading: profileLoading } = useFarmerProfile();
  const moisturePercent = appState.moisturePercent ?? 0;
  const currentSoilMoisture = appState.currentSoilMoisture ?? moisturePercent; // Use shared value from SoilMoistureTrendCard
  const status = appState.moistureStatus ?? "Loading...";
  
  // Prioritize shared value from SoilMoistureTrendCard
  const displayMoisture = currentSoilMoisture > 0 ? currentSoilMoisture : moisturePercent;
  
  // Debug: Log the values being used
  console.log('SoilMoistureCard Debug:', {
    currentSoilMoisture: currentSoilMoisture,
    moisturePercent: moisturePercent,
    displayMoisture: displayMoisture,
    appState: appState
  });
  
  const [loading, setLoading] = useState<boolean>(!displayMoisture);
  const [error, setError] = useState<string | null>(null);
  const [plotName, setPlotName] = useState<string>("");

  // Set plot name when profile loads
  useEffect(() => {
    if (profile && !profileLoading) {
      const plotNames = profile.plots?.map(plot => plot.fastapi_plot_id) || [];
      const defaultPlot = plotNames.length > 0 ? plotNames[0] : null;
      setPlotName(defaultPlot);
      console.log('SoilMoistureCard: Setting plot name to:', defaultPlot);
    }
  }, [profile, profileLoading]);

  // Monitor when shared value changes
  useEffect(() => {
    if (currentSoilMoisture > 0) {
      console.log('SoilMoistureCard: Shared value updated:', currentSoilMoisture);
      setLoading(false);
    }
  }, [currentSoilMoisture]);

  // Fetch moisture data when plot name is available
  useEffect(() => {
    if (!plotName) return;
    
    // If we already have the shared current moisture value, use it
    if (currentSoilMoisture > 0) {
      console.log('SoilMoistureCard: Using shared value from SoilMoistureTrendCard:', currentSoilMoisture);
      setLoading(false);
      return;
    }
    
    const cacheKey = `soilMoisture_${plotName}_${targetDate}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({
        ...prev,
        moisturePercent: cached.moisturePercent,
        moistureStatus: cached.status,
      }));
      setLoading(false);
      return;
    }
    fetchMoistureData();
  }, [plotName, targetDate, currentSoilMoisture]);

  const fetchMoistureData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `http://192.168.41.73:7030/analyze?plot_name=${encodeURIComponent(
        plotName
      )}&end_date=${targetDate}&days_back=7`;

      console.log("=== MAKING API CALL ===");
      console.log("URL:", url);
      console.log("Plot Name:", plotName);
      console.log("Target Date:", targetDate);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
        },
        body: "",
      });

      console.log("=== RESPONSE STATUS ===");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
      console.log("OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data: MoistureAPIResponse = await response.json();

      console.log("=== FULL API RESPONSE ===");
      console.log(JSON.stringify(data, null, 2));

      // Check if data structure is as expected (FeatureCollection)
      if (
        !data ||
        !data.type ||
        data.type !== 'FeatureCollection' ||
        !data.features ||
        !Array.isArray(data.features)
      ) {
        console.error("=== INVALID DATA STRUCTURE ===");
        console.error("Data:", data);
        throw new Error("Invalid API response structure - expected FeatureCollection");
      }

      // Find the plot boundary feature (first feature with plot boundary)
      const plotFeature = data.features.find(feature => 
        feature.properties?.feature_type === 'plot_boundary' ||
        feature.properties?.plot_name
      );

      if (!plotFeature || !plotFeature.properties?.indices_analysis) {
        console.error("=== NO PLOT FEATURE FOUND ===");
        console.error("Available features:", data.features.map(f => f.properties?.feature_type));
        throw new Error("No plot boundary feature found in response");
      }

      // Find SWI (Soil Water Index) analysis
      const swiAnalysis = plotFeature.properties.indices_analysis.find(
        (analysis: any) => analysis.index_name === "SWI"
      );

      if (!swiAnalysis || !swiAnalysis.classifications) {
        console.error("=== NO SWI ANALYSIS FOUND ===");
        console.error("Available indices:", plotFeature.properties.indices_analysis.map((a: any) => a.index_name));
        throw new Error("No SWI analysis found in plot data");
      }

      // Debug: Log all class names to see what's available
      console.log("=== ALL SWI CLASS NAMES ===");
      swiAnalysis.classifications.forEach((c: any, index: number) => {
        console.log(
          `${index}: "${c.class_name}" - ${c.percentage}% (${c.pixel_count} pixels)`
        );
      });

      // Filter for "Moist Ground" classes - try multiple approaches
      let moistGroundClasses = swiAnalysis.classifications.filter((c: any) => {
        return c.class_name && c.class_name.startsWith("Moist Ground");
      });

      // If no results, try case-insensitive search
      if (moistGroundClasses.length === 0) {
        console.log("=== TRYING CASE-INSENSITIVE SEARCH ===");
        moistGroundClasses = swiAnalysis.classifications.filter((c: any) => {
          const className = c.class_name ? c.class_name.toLowerCase() : "";
          return className.includes("moist") && className.includes("ground");
        });
      }

      // If still no results, try just 'moist'
      if (moistGroundClasses.length === 0) {
        console.log('=== TRYING BROADER SEARCH FOR "MOIST" ===');
        moistGroundClasses = swiAnalysis.classifications.filter((c: any) => {
          const className = c.class_name ? c.class_name.toLowerCase() : "";
          return className.includes("moist");
        });
      }

      console.log("=== FILTERED MOIST GROUND CLASSES ===");
      console.log("Found", moistGroundClasses.length, "classes");
      moistGroundClasses.forEach((c: any, index: number) => {
        console.log(
          `${index}: "${c.class_name}" - ${c.percentage}% (${c.pixel_count} pixels)`
        );
      });

      // Calculate total moisture percentage
      let totalMoisturePercentage = 0;

      if (moistGroundClasses.length > 0) {
        totalMoisturePercentage = moistGroundClasses.reduce(
          (sum: number, c: any) => sum + (c.percentage || 0),
          0
        );
        console.log("=== MOISTURE CALCULATION ===");
        console.log(
          "Number of Moist Ground classes found:",
          moistGroundClasses.length
        );
        console.log(
          "Individual percentages:",
          moistGroundClasses.map((c: any) => c.percentage)
        );
        console.log("Total moisture percentage:", totalMoisturePercentage);
      } else {
        console.log("=== NO MOIST GROUND CLASSES FOUND ===");
        console.log(
          "Available classes:",
          swiAnalysis.classifications.map((c: any) => c.class_name)
        );

        // For debugging - let's try to use any available data
        if (swiAnalysis.classifications.length > 0) {
          console.log("=== USING FIRST AVAILABLE CLASS FOR DEBUGGING ===");
          totalMoisturePercentage = swiAnalysis.classifications[0].percentage || 0;
          console.log(
            "Using:",
            swiAnalysis.classifications[0].class_name,
            "-",
            totalMoisturePercentage + "%"
          );
        }
      }

      const finalPercentage = parseFloat(totalMoisturePercentage.toFixed(2));
      let status = "Loading...";
      if (
        finalPercentage >= optimalRange[0] &&
        finalPercentage <= optimalRange[1]
      )
        status = "Moderated";
      else if (finalPercentage < optimalRange[0]) status = "Low";
      else status = "High";
      setAppState((prev: any) => ({
        ...prev,
        moisturePercent: finalPercentage,
        moistureStatus: status,
      }));
      const cacheKey = `soilMoisture_${plotName}_${targetDate}`;
      setCached(cacheKey, { moisturePercent: finalPercentage, status });

      console.log("=== FINAL CALCULATIONS ===");
      console.log("Total moisture percentage:", totalMoisturePercentage);
      console.log("Final percentage set:", finalPercentage);
      console.log("Raw NDWI:", totalMoisturePercentage / 100);
    } catch (err: any) {
      console.error("=== ERROR FETCHING SOIL MOISTURE DATA ===");
      console.error("Error:", err);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);

      setError(`Failed to fetch soil moisture data: ${err.message}`);
      setAppState((prev: any) => ({
        ...prev,
        moisturePercent: 0,
        moistureStatus: "Error",
      }));
    } finally {
      setLoading(false);
    }
  };



  const statusColor =
    status === "Moderated"
      ? "text-green-500"
      : status === "Low"
      ? "text-yellow-500"
      : status === "High"
      ? "text-red-500"
      : "text-gray-500";

  return (
    <div className="irrigation-card">
      <div className="card-header">
        <Droplets className="card-icon" size={24} />
        <h3 className="font-semibold">Soil Moisture</h3>
        <span className="text-sm text-gray-500">({targetDate})</span>
      </div>
      <div className="card-content soil-moisture">
        <div className="moisture-container">
          <div
            className="moisture-level"
            style={{
              height:
                displayMoisture > 0
                  ? `${Math.max(displayMoisture, 10)}%`
                  : "10%",
              minHeight: "30px",
              backgroundColor: displayMoisture > 0 ? "#3b82f6" : "#ef4444",
            }}
          >
            <span
              className="moisture-percentage"
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              {loading ? "..." : `${displayMoisture.toFixed(2)}%`}
            </span>
          </div>
        </div>

        <div
          className="moisture-info"
          style={{ textAlign: "center", marginTop: "15px" }}
        >
          <div
            className="moisture-percentage-display"
            style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}
          >
            {loading ? "..." : `${displayMoisture.toFixed(2)}%`}
          </div>
          <small className="text-gray-600">Soil Moisture Level</small>
        </div>

        <div className="moisture-status">
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : (
            <span className={statusColor}>{status}</span>
          )}
        </div>

        <div className="moisture-range">
          Range: {optimalRange[0]}–{optimalRange[1]}%
        </div>
      </div>
    </div>
  );
};

export default SoilMoistureCard;
