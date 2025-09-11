import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import "../Irrigation.css";
import { useAppContext } from "../../../context/AppContext";
import { useFarmerProfile } from "../../../hooks/useFarmerProfile";

const WaterUptakeCard: React.FC = () => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  const { profile, loading: profileLoading } = useFarmerProfile();
  const value = appState.waterUptakeValue ?? 0;
  const efficiency = appState.waterUptakeEfficiency ?? 0;
  const [loading, setLoading] = useState<boolean>(!value);
  const [error, setError] = useState<string | null>(null);
  const [plotName, setPlotName] = useState<string>("");
  const [average] = useState<number>(1.0); // sample average value

  // Set plot name when profile loads
  useEffect(() => {
    if (profile && !profileLoading) {
      const plotNames = profile.plots?.map(plot => plot.fastapi_plot_id) || [];
      const defaultPlot = plotNames.length > 0 ? plotNames[0] : null;
      setPlotName(defaultPlot);
      console.log('WaterUptakeCard: Setting plot name to:', defaultPlot);
    }
  }, [profile, profileLoading]);

  const fetchNDMIData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];
      const url = `http://192.168.41.73:7030/analyze?plot_name=${plotName}&end_date=${today}&days_back=7`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plot_name: plotName,
          end_date: today,
          days_back: 7,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      console.log("NDMI API Response:", data);

      let uptakeRatio = 0;

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const ndmi = feature.properties?.indices_analysis?.find(
          (i: any) => i.index_name === "NDMI"
        );

        if (ndmi && ndmi.classifications) {
          const sufficientUptake = ndmi.classifications.find((c: any) =>
            c.class_name.toLowerCase().includes("sufficientuptake")
          );

          if (sufficientUptake && ndmi.total_pixels > 0) {
            uptakeRatio = sufficientUptake.pixel_count / ndmi.total_pixels;
          }
        }
      }

      const percentage = Math.round(uptakeRatio * 100);
      const maxValue = 2; // Max expected L/h
      const actualValue = +(maxValue * uptakeRatio).toFixed(2);

      setAppState((prev: any) => ({
        ...prev,
        waterUptakeValue: actualValue,
        waterUptakeEfficiency: percentage,
      }));
      setCached(`waterUptake_${plotName}`, {
        value: actualValue,
        efficiency: percentage,
      });
    } catch (err: any) {
      console.error("Error fetching NDMI:", err.message);
      setError("Failed to fetch water uptake data");
      setAppState((prev: any) => ({
        ...prev,
        waterUptakeValue: 0,
        waterUptakeEfficiency: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch water uptake data when plot name is available
  useEffect(() => {
    if (!plotName) return;
    
    const cacheKey = `waterUptake_${plotName}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({
        ...prev,
        waterUptakeValue: cached.value,
        waterUptakeEfficiency: cached.efficiency,
      }));
      setLoading(false);
      return;
    }
    fetchNDMIData();
  }, [plotName]);

  const minRadius = 60;
  const maxRadius = 90;
  const maxValue = 2; // L/h scale
  const radius = Math.min(
    maxRadius,
    minRadius + (value / maxValue) * (maxRadius - minRadius)
  );
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - value / maxValue);

  const getEfficiencyColor = () => {
    if (efficiency >= 80) return "#22c55e"; // green
    if (efficiency >= 60) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div className="irrigation-card">
      <div className="card-header">
        <Activity className="card-icon" size={28} />
        <h3 className="font-semibold"> Plant Water Uptake</h3>
      </div>

      <div className="card-content card-content-water">
        <div className="ring-wrapper">
          <svg
            className="progress-ring"
            width={radius * 2 + 20}
            height={radius * 2 + 20}
          >
            <circle
              className="progress-ring-circle-bg"
              stroke="#e2e8f0"
              strokeWidth="17"
              fill="transparent"
              r={radius}
              cx={(radius * 2 + 20) / 2}
              cy={(radius * 2 + 20) / 2}
            />
            <circle
              className="progress-ring-circle"
              stroke="#3b82f6"
              strokeWidth="17"
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx={(radius * 2 + 20) / 2}
              cy={(radius * 2 + 20) / 2}
              style={{
                strokeDasharray: `${circumference} ${circumference}`,
                strokeDashoffset,
                transform: "rotate(-90deg)",
                transformOrigin: "center",
              }}
            />
            <text
              x="50%"
              y="47%"
              textAnchor="middle"
              className="progress-text value"
            >
              {loading ? "..." : value.toFixed(1)}
            </text>
            <text
              x="50%"
              y="60%"
              textAnchor="middle"
              className="progress-text unit"
            >
              L/h
            </text>
          </svg>
        </div>

        <div
          className="uptake-efficiency"
          style={{ color: getEfficiencyColor() }}
        >
          Efficiency: {loading ? "..." : `${efficiency}%`}
        </div>
        <div className="uptake-average">Average: {average.toFixed(1)} L/h</div>

        {error && <div className="text-red-500 mt-1">{error}</div>}
      </div>
    </div>
  );
};

export default WaterUptakeCard;
