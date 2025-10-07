import React, { useState, useEffect } from "react";

interface FieldHealthAnalysisProps {
  fieldAnalysisData: {
    plotName: string; // e.g., "Plot 12"
    overallHealth: number; // e.g., 76.3
    healthStatus: string; // e.g., "Good"
    statistics: {
      mean: number;
    };
  } | null;
}

// Map overallHealth value to status string
function getStatusLabel(score: number): string {
  if (score >= 75 && score <= 100) return "Excellent";
  if (score >= 65 && score <= 74) return "Good";
  if (score >= 55 && score <= 64) return "Moderate";
  if (score >= 45 && score <= 54) return "Poor";
  if (score >= 0 && score <= 44) return "Very Poor";
  return "Unknown";
}

export const FieldHealthAnalysis: React.FC<FieldHealthAnalysisProps> = ({
  fieldAnalysisData,
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const targetPercent = fieldAnalysisData?.overallHealth ?? 0;

  useEffect(() => {
    // Animate the gauge from 0 to the target percentage
    const animationTimeout = setTimeout(() => {
      setAnimatedPercent(targetPercent);
    }, 100); // Small delay to ensure transition is applied

    return () => clearTimeout(animationTimeout);
  }, [targetPercent]);

  // Use computed status from the final target percentage
  const computedStatus = getStatusLabel(targetPercent);

  const getHealthStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-green-500";
      case "moderate":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
      case "very poor":
        return "text-red-700";
      default:
        return "text-gray-500";
    }
  };

  const getHealthStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "excellent":
        return "bg-green-100";
      case "good":
        return "bg-green-50";
      case "moderate":
        return "bg-yellow-50";
      case "poor":
        return "bg-red-50";
      case "very poor":
        return "bg-red-100";
      default:
        return "bg-gray-50";
    }
  };

  const arcColor = targetPercent >= 85 ? "#16a34a" : "#f59e0b"; // green if healthy
  const remainingColor = targetPercent >= 85 ? "#f59e0b" : "#16a34a"; // orange otherwise

  return (
    <div className="card h-full flex flex-col relative p-4 min-h-[320px]">
      <div className="flex justify-between items-start">
        <h2 className="card-title text-lg font-semibold text-gray-800">
          Field Score
        </h2>
        {fieldAnalysisData && (
          <div className="text-right text-sm text-gray-700">
            <div className="font-medium">
              PlotID : {fieldAnalysisData.plotName}
            </div>
          </div>
        )}
      </div>

      <div className="card-body mt-4">
        {fieldAnalysisData ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-60 h-60 relative">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  {/* Background circle */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3.8"
                  />
                  {/* Health arc */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={arcColor}
                    strokeWidth="3.8"
                    strokeDasharray={`${animatedPercent}, 100`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1.5s ease-in-out" }}
                  />
                  {/* Remaining arc */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={arcColor}
                    strokeWidth="3.8"
                    strokeDasharray={`${100 - animatedPercent}, 100`}
                    strokeDashoffset={`-${animatedPercent}`}
                    strokeLinecap="round"
                    style={{
                      transition: "all 1.5s ease-in-out",
                      strokeOpacity: 0.2,
                    }}
                  />
                  {/* Center text */}
                  <text
                    x="18"
                    y="20.5"
                    textAnchor="middle"
                    className="fill-gray-800 text-[0.45rem] font-bold transition-all duration-1000"
                  >
                    {targetPercent.toFixed(1)}%
                  </text>
                </svg>
              </div>
            </div>

            {/* Status summary box at the bottom */}
            <div className={`mt-6 flex justify-center`}>
              <div
                className={`px-6 py-3 rounded-lg shadow text-center w-full max-w-xs sm:max-w-sm md:max-w-md p-2 sm:p-4
                  ${
                    ["Excellent", "Good"].includes(computedStatus)
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-orange-100 text-orange-800 border border-orange-300"
                  }`}
              >
                <div className="font-bold text-xl mb-1">
                  Status: {computedStatus}
                </div>
                <div className="text-sm">
                  Optimal range:{" "}
                  {(() => {
                    switch (computedStatus) {
                      case "Excellent":
                        return "75-100";
                      case "Good":
                        return "65-74";
                      case "Moderate":
                        return "55-64";
                      case "Poor":
                        return "45-54";
                      case "Very Poor":
                        return "0-44";
                      default:
                        return "";
                    }
                  })()}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-center py-10">
            No data available for the selected plot.
          </div>
        )}
      </div>
    </div>
  );
};
