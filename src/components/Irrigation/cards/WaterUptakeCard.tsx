import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import "../Irrigation.css";
import { useAppContext } from "../../../context/AppContext";

const WaterUptakeCard: React.FC = () => {
  const { appState } = useAppContext();
  
  // Get today's water requirement from irrigation schedule data stored in appState
  const irrigationSchedule = appState.irrigationScheduleData || [];
  const todayData = irrigationSchedule.find((day: any) => day.isToday);
  const waterReqLiters = todayData?.waterRequired ?? 0;
  
  const value = waterReqLiters;
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);
  const [average] = useState<number>(12000); // sample average value in L

  // Log the water requirement value
  useEffect(() => {
    console.log('WaterUptakeCard: Today water required from schedule:', waterReqLiters, 'L');
    console.log('WaterUptakeCard: IrrigationSchedule data:', irrigationSchedule);
  }, [waterReqLiters, irrigationSchedule]);

  const minRadius = 60;
  const maxRadius = 90;
  const maxValue = 20000; // L scale
  const radius = Math.min(
    maxRadius,
    minRadius + (value / maxValue) * (maxRadius - minRadius)
  );
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - value / maxValue);

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
              {loading ? "..." : value.toLocaleString()}
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

        {/* <div
          className="uptake-efficiency"
          style={{ color: getEfficiencyColor() }}
        >
          Efficiency: {loading ? "..." : `${efficiency}%`}
        </div> */}
        <div className="uptake-average">Average: {average.toLocaleString(1)} L/h</div>

        {error && <div className="text-red-500 mt-1">{error}</div>}
      </div>
    </div>
  );
};

export default WaterUptakeCard;
