import React, { useEffect, useState } from "react";
import { Waves } from "lucide-react";
import "../Irrigation.css";
import { useAppContext } from "../../../context/AppContext";
import { useFarmerProfile } from "../../../hooks/useFarmerProfile";

interface ETResponse {
  plot_name: string;
  start_date: string;
  end_date: string;
  area_hectares: number;
  ET_mean_mm_per_day: number;
  ET_total_liters_per_day: number;
}

const EvapotranspirationCard: React.FC = () => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  const { profile, loading: profileLoading } = useFarmerProfile();
  const [plotName, setPlotName] = useState<string>("");
  const etValue = appState.etValue ?? 0;
  const trendData = appState.etTrendData ?? [];
  const [loading, setLoading] = useState<boolean>(!etValue);
  const [error, setError] = useState<string | null>(null);
  const [average] = useState<number>(2.5); // Optional: update dynamically if needed

  // Set plot name when profile loads
  useEffect(() => {
    if (profile && !profileLoading) {
      const plotNames = profile.plots?.map(plot => plot.fastapi_plot_id) || [];
      const defaultPlot = plotNames.length > 0 ? plotNames[0] : null;
      setPlotName(defaultPlot);
      console.log('EvapotranspirationCard: Setting plot name to:', defaultPlot);
    }
  }, [profile, profileLoading]);

  // Fetch ET data when plot name is available
  useEffect(() => {
    if (!plotName) return;
    
    const cacheKey = `etData_${plotName}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({
        ...prev,
        etValue: cached.etValue,
        etTrendData: cached.trendData,
      }));
      setLoading(false);
      return;
    }
    fetchETData();
  }, [plotName]);

  const fetchETData = async () => {
    try {
      setLoading(true);
      setError(null);

      const targetDate = "2025-06-07";
      const response = await fetch(
        `http://192.168.41.73:8009/plots/${plotName}/compute-et/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plot_name: plotName, end_date: targetDate }),
        }
      );
      if (!response.ok) {
        if (response.status === 404) throw new Error("Plot not found");
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      let etValue = 0;
      if (data.et_24hr !== undefined) etValue = data.et_24hr;
      else if (data.ET_mean_mm_per_day !== undefined)
        etValue = data.ET_mean_mm_per_day;
      else if (data.et !== undefined) etValue = data.et;
      else if (typeof data === "number") etValue = data;
      else etValue = 2.5;
      // Simulate 24-hour trend from ET value
      const base = etValue;
      const generatedTrend = Array.from({ length: 24 }, (_, i) => {
        const fluctuation = (Math.sin(i / 3) + 1) * 0.1 * base;
        return Math.round((base + fluctuation) * 10) / 10;
      });
      setAppState((prev: any) => ({
        ...prev,
        etValue,
        etTrendData: generatedTrend,
      }));
      setCached(`etData_${plotName}`, { etValue, trendData: generatedTrend });
    } catch (err: any) {
      setError("Failed to fetch ET data");
      setAppState((prev: any) => ({ ...prev, etValue: 0, etTrendData: [] }));
    } finally {
      setLoading(false);
    }
  };

  const comparison =
    etValue > average
      ? { status: "Above average", className: "text-orange-500" }
      : { status: "Below average", className: "text-green-500" };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="irrigation-card">
      <div className="card-header">
        <Waves className="card-icon" size={20} />
        <h3>Evapotranspiration</h3>
      </div>

      <div className="card-content evapotranspiration">
        <div className="evap-icon">
          <Waves size={40} color="#4287f5" />
        </div>

        <div className="metric-value">
          {loading ? (
            <div className="loading-spinner-small"></div>
          ) : (
            <>
              <span className="value">{etValue.toFixed(2)}</span>
              <span className="unit">mm</span>
            </>
          )}
        </div>

        {error && <div className="error-message-small">{error}</div>}

        <div className={`evap-comparison ${comparison.className}`}>
          {comparison.status} ({average.toFixed(1)}mm)
        </div>

        <div className="evap-trend">
          <div className="trend-label">24h Trend</div>
          <div className="trend-chart">
            {trendData.map((val, i) => (
              <div
                key={i}
                className="trend-bar"
                title={`${i}:00 - ${val} mm`}
                style={{ height: `${val * 10}px` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvapotranspirationCard;
