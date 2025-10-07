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
    if (!plotName) {
      console.error('❌ Cannot fetch ET: plotName is empty or undefined');
      setError("No plot selected");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days before for better data
      const startDateStr = startDate.toISOString().split('T')[0];

      const requestBody = {
        plot_name: plotName,
        start_date: startDateStr,
        end_date: currentDate
      };

      // Multiple attempts: 7002 POST, 8009 POST, 7002 GET
      const attempts: Array<{ url: string; init?: RequestInit; note: string }> = [
        {
          url: `https://dev-field.cropeye.ai/plots/${plotName}/compute-et/`,
          init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) },
          note: '7002 POST',
        },
        {
          url: `https://dev-field.cropeye.ai/plots/${plotName}/compute-et/`,
          init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) },
          note: '8009 POST',
        },
        {
          url: `https://dev-field.cropeye.ai/plots/${encodeURIComponent(plotName)}/compute-et/?start_date=${startDateStr}&end_date=${currentDate}`,
          init: { method: 'GET' },
          note: '7002 GET',
        },
      ];

      let data: any = null;
      let lastError: any = null;

      for (const attempt of attempts) {
        try {
          console.log('🌱 ET attempt:', attempt.note, attempt.url);
          const resp = await fetch(attempt.url, attempt.init);
          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`HTTP ${resp.status} ${resp.statusText} - ${txt}`);
          }
          data = await resp.json();
          console.log('🌱 ET success via', attempt.note);
          lastError = null;
          break;
        } catch (e) {
          console.warn('⚠️ ET fetch failed via', attempt.note, e);
          lastError = e;
        }
      }

      if (!data) {
        throw lastError || new Error('All ET attempts failed');
      }
      console.log('🌱 ET API Response:', data);
      console.log('🌱 Response type:', typeof data);
      
      let etValue = 0;
      let etSource = 'fallback (2.5)';

      if (data.et_24hr !== undefined) {
        etValue = data.et_24hr;
        etSource = 'data.et_24hr';
      } else if (data.ET_mean_mm_per_day !== undefined) {
        etValue = data.ET_mean_mm_per_day;
        etSource = 'data.ET_mean_mm_per_day';
      } else if (data.et !== undefined) {
        etValue = data.et;
        etSource = 'data.et';
      } else if (typeof data === "number") {
        etValue = data;
        etSource = 'direct number';
      } else {
        etValue = 2.5;
      }
      
      console.log('🌱 Extracted ET value:', etValue, 'mm/day from:', etSource);

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

      setCached("etData", {
        etValue,
        trendData: generatedTrend,
      });

      console.log('✅ ET data successfully saved to AppContext:', etValue);
    } catch (err: any) {
      console.error('❌ ET API Error:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Plot name used:', plotName);
      
      setError(`Failed to fetch ET data: ${err.message}`);
      setAppState((prev: any) => ({
        ...prev,
        etValue: 0,
        etTrendData: [],
      }));
    } finally {
      setLoading(false);
    }
  };

  const comparison = etValue > average
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
                style={{
                  height: `${val * 10}px`,
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvapotranspirationCard;