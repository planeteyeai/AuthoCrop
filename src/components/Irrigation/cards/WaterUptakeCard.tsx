// import React, { useEffect, useState } from "react";
// import { Activity } from "lucide-react";
// import "../Irrigation.css";
// import { useAppContext } from "../../../context/AppContext";
 
// const WaterUptakeCard: React.FC = () => {
//   const { appState } = useAppContext();
 
//   // Get today's water requirement from irrigation schedule data stored in appState
//   const irrigationSchedule = appState.irrigationScheduleData || [];
//   const todayData = irrigationSchedule.find((day: any) => day.isToday);
//   const waterReqLiters = todayData?.waterRequired ?? 0;
 
//   const value = waterReqLiters;
//   const [loading] = useState<boolean>(false);
//   const [error] = useState<string | null>(null);
//   const [average] = useState<number>(12000); // sample average value in L
 
//   // Log the water requirement value
//   useEffect(() => {
//     console.log('WaterUptakeCard: Today water required from schedule:', waterReqLiters, 'L');
//     console.log('WaterUptakeCard: IrrigationSchedule data:', irrigationSchedule);
//   }, [waterReqLiters, irrigationSchedule]);
 
//   const minRadius = 60;
//   const maxRadius = 90;
//   const maxValue = 20000; // L scale
//   const radius = Math.min(
//     maxRadius,
//     minRadius + (value / maxValue) * (maxRadius - minRadius)
//   );
//   const circumference = 2 * Math.PI * radius;
//   const strokeDashoffset = circumference * (1 - value / maxValue);
 
//   return (
//     <div className="irrigation-card">
//       <div className="card-header">
//         <Activity className="card-icon" size={28} />
//         <h3 className="font-semibold"> Plant Water Uptake</h3>
//       </div>
 
//       <div className="card-content card-content-water">
//         <div className="ring-wrapper">
//           <svg
//             className="progress-ring"
//             width={radius * 2 + 20}
//             height={radius * 2 + 20}
//           >
//             <circle
//               className="progress-ring-circle-bg"
//               stroke="#e2e8f0"
//               strokeWidth="17"
//               fill="transparent"
//               r={radius}
//               cx={(radius * 2 + 20) / 2}
//               cy={(radius * 2 + 20) / 2}
//             />
//             <circle
//               className="progress-ring-circle"
//               stroke="#3b82f6"
//               strokeWidth="17"
//               strokeLinecap="round"
//               fill="transparent"
//               r={radius}
//               cx={(radius * 2 + 20) / 2}
//               cy={(radius * 2 + 20) / 2}
//               style={{
//                 strokeDasharray: `${circumference} ${circumference}`,
//                 strokeDashoffset,
//                 transform: "rotate(-90deg)",
//                 transformOrigin: "center",
//               }}
//             />
//             <text
//               x="50%"
//               y="47%"
//               textAnchor="middle"
//               className="progress-text value"
//             >
//               {loading ? "..." : value.toLocaleString()}
//             </text>
//             <text
//               x="50%"
//               y="60%"
//               textAnchor="middle"
//               className="progress-text unit"
//             >
//               L/h
//             </text>
//           </svg>
//         </div>
 
//         {/* <div
//           className="uptake-efficiency"
//           style={{ color: getEfficiencyColor() }}
//         >
//           Efficiency: {loading ? "..." : `${efficiency}%`}
//         </div> */}
//         <div className="uptake-average">Average: {average.toLocaleString(1)} L/h</div>
 
//         {error && <div className="text-red-500 mt-1">{error}</div>}
//       </div>
//     </div>
//   );
// };
 
// export default WaterUptakeCard;
import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import "../Irrigation.css";
import { useAppContext } from "../../../context/AppContext";
import { useFarmerProfile } from "../../../hooks/useFarmerProfile";

const WaterUptakeCard: React.FC = () => {
  const { appState } = useAppContext();

  const irrigationSchedule = appState.irrigationScheduleData || [];
  const todayData = irrigationSchedule.find((day: any) => day.isToday);
  const waterReqLiters = todayData?.waterRequired ?? 0;
  const { profile, loading: profileLoading } = useFarmerProfile();
  const storedPlot = typeof window !== 'undefined' ? localStorage.getItem('selectedPlot') : null;
  const plotName = (appState.plotName && appState.plotName.trim())
    || (storedPlot && storedPlot.trim())
    || (profile?.plots?.[0]?.fastapi_plot_id || "");

  const [efficiency, setEfficiency] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Dynamically calculate average from today's water requirement
  const average = ((waterReqLiters * 23) / 1000).toFixed(2);

  const currentDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchEfficiency = async () => {
      if (!plotName) {
        console.log("WaterUptakeCard: No plot name available");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log("WaterUptakeCard: Fetching efficiency for plot:", plotName);
        const url = `https://dev-plot.cropeye.ai/wateruptake?plot_name=${plotName}&end_date=${currentDate}&days_back=7`;
        console.log("WaterUptakeCard: Request URL:", url);
        const response = await fetch(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        // Log status and raw body for debugging
        console.log("WaterUptakeCard: HTTP Status:", response.status, response.statusText);
        const rawBody = await response.clone().text().catch(() => "<unreadable body>");
        console.log("WaterUptakeCard: RAW Response:", rawBody);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No response body');
          console.error(`WaterUptakeCard: API error ${response.status}:`, errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("WaterUptakeCard: API response:", data);

        const pixelSummary = data.pixel_summary;

        if (!pixelSummary) {
          console.warn("WaterUptakeCard: No pixel_summary in response");
          setEfficiency(0);
          setLoading(false);
          return;
        }

        const adequate = pixelSummary?.adequat_pixel_percentage ?? 0;
        const excellent = pixelSummary?.excellent_pixel_percentage ?? 0;
        console.log("WaterUptakeCard: Parsed percentages -> adequate:", adequate, "excellent:", excellent);

        // Consolidated summary for current user/plot
        console.log("WaterUptakeCard: CURRENT USER WATERUPTAKE DATA", {
          plotName,
          endDate: currentDate,
          tile_url: data?.tile_url || data?.properties?.tile_url,
          pixel_summary: {
            ...pixelSummary,
            // helpful sizes if arrays exist
            adequat_pixel_coordinates_len: Array.isArray(pixelSummary?.adequat_pixel_coordinates) ? pixelSummary.adequat_pixel_coordinates.length : 0,
            excellent_pixel_coordinates_len: Array.isArray(pixelSummary?.excellent_pixel_coordinates) ? pixelSummary.excellent_pixel_coordinates.length : 0,
          },
        });

        const totalEfficiency = Math.round(adequate + excellent);
        console.log(`WaterUptakeCard: Efficiency calculated: ${totalEfficiency}% (adequate: ${adequate}%, excellent: ${excellent}%)`);

        setEfficiency(totalEfficiency);
        setError(null);
        setLoading(false);
      } catch (err: any) {
        console.error("WaterUptakeCard: Error fetching efficiency:", err);
        setError(`Failed to fetch efficiency data: ${err.message}`);
        setEfficiency(null);
        setLoading(false);
      }
    };

    fetchEfficiency();
  }, [plotName, currentDate]);

  // Circle visuals
  const minRadius = 60;
  const maxRadius = 90;
  const maxValue = 20000;
  const radius = Math.min(
    maxRadius,
    minRadius + (waterReqLiters / maxValue) * (maxRadius - minRadius)
  );
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - waterReqLiters / maxValue);

  // If still no plot name and profile is loading, show loading
  if (!plotName && profileLoading) {
    return (
      <div className="irrigation-card">
        <div className="card-header">
          <Activity className="card-icon" size={28} />
          <h3 className="font-semibold">Plant Water Uptake</h3>
        </div>
        <div className="card-content card-content-water">
          <div className="text-gray-600 font-semibold">Loading farmer plots...</div>
        </div>
      </div>
    );
  }

  // If no plot name even after profile loaded, then show message
  if (!plotName) {
    return (
      <div className="irrigation-card">
        <div className="card-header">
          <Activity className="card-icon" size={28} />
          <h3 className="font-semibold">Plant Water Uptake</h3>
        </div>
        <div className="card-content card-content-water">
          <div className="text-red-600 font-semibold">WaterUptakeCard: No plot name available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="irrigation-card">
      <div className="card-header">
        <Activity className="card-icon" size={28} />
        <h3 className="font-semibold">Plant Water Uptake</h3>
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
              {loading ? "..." : waterReqLiters.toLocaleString()}
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

        {/* Efficiency Section */}
        <div className="uptake-efficiency" style={{ color: "#16a34a" }}>
          Efficiency: {loading ? "..." : efficiency !== null ? `${efficiency}%` : "--"}
        </div>

        <div className="uptake-average">
          Average: {average.toLocaleString()} L/h
        </div>

        {error && <div className="text-red-500 mt-1">{error}</div>}
      </div>
    </div>
  );
};

export default WaterUptakeCard;

