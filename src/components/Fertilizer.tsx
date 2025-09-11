import React, { useState, useEffect, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import "./App.css";
import { useAppContext } from "../context/AppContext";

interface FertilizerEntry {
  day: number;
  stage: string;
  nutrients: string;
  recommendedDosage: string;
  chemical: string;
}

interface NPKData {
  N?: number;
  P?: number;
  K?: number;
  area_acres?: number;
}

const videoList = [
  {
    title: "Drip Irrigation Benefits",
    url: "https://www.youtube.com/embed/oWcgyCL-8i4?si=2GMM2g17CbiJDbhu",
    desc: "Drip Irrigation Benefits",
    isLocal: false,
  },
  {
    title: "Fertilizer Application Practices",
    url: "https://www.youtube.com/embed/i6KHztNpu2Y?si=YpYpgHkHp7EOTm3B",
    desc: "Fertilizer Application Practices",
    isLocal: false,
  },
  {
    title: "ऊस खत नियोजन 2025 | Sugarcane Fertilizer",
    url: "https://www.youtube.com/embed/9cf6LYMOtsA",
    desc: "Sugarcane Fertilizer Management",
    isLocal: false,
  },
];

import { useFarmerProfile } from "../hooks/useFarmerProfile";

const Fertilizer: React.FC = () => {
  const { getDefaultPlotName } = useFarmerProfile();
  const PLOT_NAME = getDefaultPlotName();
  const PLANTATION_DATE = "2025-06-07";
  const API_BASE_URL = "http://192.168.41.73:8003";

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  const { appState, setAppState, getCached, setCached } = useAppContext();
  const data = appState.fertilizerData || [];
  const npkData = appState.npkData || {};
  const [isLoading, setIsLoading] = useState(true);
  const [npkLoading, setNpkLoading] = useState(false);
  const [npkError, setNpkError] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchNPKData = useCallback(async () => {
    setNpkLoading(true);
    setNpkError(null);
    const cacheKey = "npkData";
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({ ...prev, npkData: cached }));
      setNpkLoading(false);
      return;
    }
    try {
      const url = `${API_BASE_URL}/analyze-npk/${encodeURIComponent(
        PLOT_NAME
      )}?plantation_date=${PLANTATION_DATE}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
        mode: "cors",
      });
      if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);
      const json = await res.json();
      const analysis = json.npk_analysis;
      if (analysis && analysis.recommended_dose) {
        const npk = {
          N: analysis.recommended_dose.N,
          P: analysis.recommended_dose.P,
          K: analysis.recommended_dose.K,
          area_acres: analysis.area_acres,
        };
        setAppState((prev: any) => ({ ...prev, npkData: npk }));
        setCached(cacheKey, npk);
      } else {
        throw new Error("Invalid NPK response structure.");
      }
    } catch (err: any) {
      setNpkError(err.message || "Failed to fetch NPK data");
      setAppState((prev: any) => ({ ...prev, npkData: {} }));
    } finally {
      setNpkLoading(false);
    }
  }, [getCached, setCached, setAppState]);

  useEffect(() => {
    const cacheKey = "fertilizerData";
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({ ...prev, fertilizerData: cached }));
      setIsLoading(false);
      return;
    }
    fetch("/fertilizer.json")
      .then((res) => res.json())
      .then((json) => {
        const entries: FertilizerEntry[] = json
          .map((entry: any) => ({
            day: Number(entry["Duration (Days)"]),
            stage: entry["Stage"] || "",
            nutrients: entry["Nutrients "] || "",
            recommendedDosage: entry["Recommended Dosage "] || "",
            chemical: entry["Chemical "] || "",
          }))
          .filter((e) => e.day >= 8 && e.day <= 14);
        setAppState((prev: any) => ({ ...prev, fertilizerData: entries }));
        setCached(cacheKey, entries);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [getCached, setCached, setAppState]);

  useEffect(() => {
    fetchNPKData();
  }, [fetchNPKData]);

  const handleDownloadPDF = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current);
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 10, w, h);
      pdf.save("fertilizer_table.pdf");
    }
  };

  const infoCards = [
    {
      short: "N",
      long: "Nitrogen",
      value: npkLoading ? "Loading..." : npkData.N?.toFixed(2) ?? "No Data",
      desc: npkData.area_acres ? `Recommended: ${npkData.N} kg/ha` : "",
      bgColor: "bg-green-50",
      iconBg: "bg-green-500",
      textColor: "text-green-700",
    },
    {
      short: "P",
      long: "Phosphorus",
      value: npkLoading ? "Loading..." : npkData.P?.toFixed(2) ?? "No Data",
      desc: npkData.area_acres ? `Recommended: ${npkData.P} kg/ha` : "",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-500",
      textColor: "text-blue-700",
    },
    {
      short: "K",
      long: "Potassium",
      value: npkLoading ? "Loading..." : npkData.K?.toFixed(2) ?? "No Data",
      desc: npkData.area_acres ? `Recommended: ${npkData.K} kg/ha` : "",
      bgColor: "bg-yellow-50",
      iconBg: "bg-yellow-500",
      textColor: "text-yellow-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <div className="container mx-auto px-4 pt-6">
        <div className="flex justify-between items-center bg-white shadow-lg rounded-lg px-6 py-4 mb-8 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-700 flex items-center">
            <span className="mr-3 text-3xl">🌿</span> Fertilizer NPK Status
          </div>
          <div className="text-right">
            <div className="text-lg font-medium text-gray-700">
              {getCurrentDate()}
            </div>
            {npkLoading && (
              <div className="text-sm text-blue-600 mt-1">
                📊 Loading NPK data...
              </div>
            )}
            {npkError && (
              <div className="text-sm text-red-600 mt-1">❌ {npkError}</div>
            )}
          </div>
        </div>

        {/* NPK Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {infoCards.map((card, idx) => (
            <div
              key={idx}
              className={`${card.bgColor} shadow-lg rounded-xl p-6 text-center`}
            >
              <div
                className={`${card.iconBg} w-20 h-20 rounded-full flex flex-col items-center justify-center mx-auto mb-4`}
              >
                <span className="text-4xl font-bold text-white">
                  {card.short}
                </span>
                <span className="text-xs text-white mt-1">{card.long}</span>
              </div>
              <div className={`text-4xl font-extrabold ${card.textColor} mb-2`}>
                {card.value}
              </div>
              <div className="text-sm text-gray-600">{card.desc}</div>
            </div>
          ))}
        </div>

        {/* Fertilizer Table */}
        <div
          className="bg-white shadow-lg rounded-lg overflow-hidden mb-12"
          ref={tableRef}
        >
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-2xl font-bold text-green-700">
              Fertilizer Schedule
            </h2>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="mr-2 h-5 w-5" />
              Download PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Day",
                    "Stage",
                    "Nutrients",
                    "Recommended Dosage",
                    "Chemical",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      Loading fertilizer data...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No fertilizer data available.
                    </td>
                  </tr>
                ) : (
                  data.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{entry.day}</td>
                      <td className="px-6 py-4">{entry.stage}</td>
                      <td className="px-6 py-4">{entry.nutrients}</td>
                      <td className="px-6 py-4">{entry.recommendedDosage}</td>
                      <td className="px-6 py-4">{entry.chemical}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Videos */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-green-700 mb-4">
            Video Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videoList.map((video, index) => (
              <div key={index} className="bg-white shadow-lg rounded-lg">
                <div className="relative pb-60 overflow-hidden">
                  <iframe
                    src={video.url}
                    title={video.title}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {video.title}
                  </h3>
                  <p className="text-gray-600">{video.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fertilizer;
