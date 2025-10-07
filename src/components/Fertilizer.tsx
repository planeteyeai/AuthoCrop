import React, { useState, useEffect, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import "./App.css";
import { useAppContext } from "../context/AppContext";
import FertilizerTable from "./FertilizerTable";

interface FertilizerEntry {
  day: number;
  stage: string;
  nutrients: string;
  recommendedDosage: string;
  chemical: string;
}

const videoList = [
  {
    title: "उस शेतीची ओळख आणि महाराष्ट्राचे हवामान",
    url: "https://www.youtube.com/embed/qzFbZvDin4U?si=y8NwUZfi7wWBWfWV",
    desc: "या व्हिडिओमध्ये ऊस शेतीसाठी आवश्यक हवामान, पाऊस, माती आणि सिंचन याबद्दल माहिती दिली आहे. महाराष्ट्रातील ऊस उत्पादक भाग, पिकाचा कालावधी आणि योग्य व्यवस्थापनाचे महत्त्व जाणून घ्या. ",
  },
  {
    title: "जमीन तयारी आणि मृदा आरोग्य",
    url: "https://www.youtube.com/embed/vLOJbcQECfk?si=ChfTCkHbYjyNdWrT",
    desc: "या भागात आपण मातीची मशागत आणि मातीचे आरोग्य या महत्त्वाच्या टप्प्याबद्दल जाणून घेऊ. चांगली माती ही ऊस पिकाच्या उत्तम उगवणीसाठी, मजबूत मुळे तयार होण्यासाठी आणि जास्त उत्पादनासाठी आवश्यक आहे.",
  },
  {
    title: "ऊस शेतीत योग्य जातीची निवड",
    url: "https://www.youtube.com/embed/Si0hh9xFHvI?si=Y582InMZoil2dccv",
    desc: "ऊस शेतीत योग्य जातीची निवड ही यशस्वी शेतीचा पाया आहे. महाराष्ट्र, उत्तर प्रदेश आणि कर्नाटकात कोणत्या जाती सर्वाधिक लोकप्रिय आहेत, त्यांच्या वैशिष्ट्यांसह जाणून घ्या.",
  },
];

import { useFarmerProfile } from "../hooks/useFarmerProfile";

const Fertilizer: React.FC = () => {
  const { loading: profileLoading, getPlotNames } = useFarmerProfile();
  const plotNames = getPlotNames();
  const PLOT_NAME = plotNames.length > 0 ? plotNames[0] : "";
  const API_BASE_URL = "https://dev-soil.cropeye.ai";

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
  const npkFetchingRef = useRef(false);

  const fetchNPKData = useCallback(async () => {
    if (!PLOT_NAME) {
      console.log("Fertilizer: No plot name available, skipping NPK fetch");
      return;
    }

    // Prevent multiple simultaneous requests
    if (npkFetchingRef.current) {
      console.log("Fertilizer: NPK fetch already in progress, skipping");
      return;
    }

    npkFetchingRef.current = true;
    setNpkLoading(true);
    setNpkError(null);
    const cacheKey = `npkData_${PLOT_NAME}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({ ...prev, npkData: cached }));
      setNpkLoading(false);
      npkFetchingRef.current = false;
      return;
    }
    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const url = `${API_BASE_URL}/analyze-npk/${encodeURIComponent(
        PLOT_NAME
      )}?end_date=${currentDate}&days_back=7`;
      console.log("Fertilizer: Fetching NPK data for plot:", PLOT_NAME);
      console.log("Fertilizer: API URL:", url);
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
        mode: "cors",
      });
      if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);
      const json = await res.json();
      console.log("Fertilizer: API Response:", json);

      // Extract NPK data from the response structure
      const npkAnalysis = json.npk_analysis;

      if (
        npkAnalysis &&
        npkAnalysis.estimated_npk_uptake_perAcre &&
        npkAnalysis.fertilizer_require_perAcre
      ) {
        const estimatedUptake = npkAnalysis.estimated_npk_uptake_perAcre;
        const fertilizerRequire = npkAnalysis.fertilizer_require_perAcre;

        const npk = {
          N: estimatedUptake.N,
          P: estimatedUptake.P,
          K: estimatedUptake.K,
          fertilizer_N: fertilizerRequire.N,
          fertilizer_P: fertilizerRequire.P,
          fertilizer_K: fertilizerRequire.K,
          area_acres: npkAnalysis.area_acres,
        };
        console.log("Fertilizer: Extracted NPK data:", npk);
        setAppState((prev: any) => ({ ...prev, npkData: npk }));
        setCached(cacheKey, npk);
      } else {
        throw new Error(
          "Invalid NPK response structure - missing npk_analysis.estimated_npk_uptake_perAcre or npk_analysis.fertilizer_require_perAcre"
        );
      }
    } catch (err: any) {
      console.error("Fertilizer: NPK fetch error:", err);
      setNpkError(err.message || "Failed to fetch NPK data");
      setAppState((prev: any) => ({ ...prev, npkData: {} }));
    } finally {
      setNpkLoading(false);
      npkFetchingRef.current = false;
    }
  }, [PLOT_NAME, getCached, setCached]); // Removed setAppState to prevent infinite loops

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
          .filter((e: any) => e.day >= 8 && e.day <= 14);
        setAppState((prev: any) => ({ ...prev, fertilizerData: entries }));
        setCached(cacheKey, entries);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []); // Empty dependency array - this effect should only run once

  useEffect(() => {
    if (PLOT_NAME && !profileLoading) {
      fetchNPKData();
    }
  }, [PLOT_NAME, profileLoading]); // Removed fetchNPKData from dependencies to prevent infinite loop

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
      value: npkLoading ? "Loading..." : npkData.N?.toFixed(2) ?? "No Data",
      desc: npkData.fertilizer_N
        ? `Fertilizer Required: ${npkData.fertilizer_N.toFixed(2)} kg/acre`
        : "",
      bgColor: "bg-green-50",
      iconBg: "bg-green-500",
      textColor: "text-green-700",
    },
    {
      short: "P",
      value: npkLoading ? "Loading..." : npkData.P?.toFixed(2) ?? "No Data",
      desc: npkData.fertilizer_P
        ? `Fertilizer Required: ${npkData.fertilizer_P.toFixed(2)} kg/acre`
        : "",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-500",
      textColor: "text-blue-700",
    },
    {
      short: "K",
      value: npkLoading ? "Loading..." : npkData.K?.toFixed(2) ?? "No Data",
      desc: npkData.fertilizer_K
        ? `Fertilizer Required: ${npkData.fertilizer_K.toFixed(2)} kg/acre`
        : "",
      bgColor: "bg-yellow-50",
      iconBg: "bg-yellow-500",
      textColor: "text-yellow-700",
    },
  ];

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-12">
        <div className="container mx-auto px-4 pt-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700 mb-4">
                🌿 Loading Fertilizer Data...
              </div>
              <div className="text-gray-600">Loading farmer profile...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!PLOT_NAME) {
    return (
      <div className="min-h-screen bg-gray-100 pb-12">
        <div className="container mx-auto px-4 pt-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700 mb-4">
                ❌ No Plot Data Available
              </div>
              <div className="text-gray-600">
                Please ensure you have plot data in your profile.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <div className="container mx-auto px-4 pt-6">
        <div className="flex justify-between items-center bg-white shadow-lg rounded-lg px-6 py-4 mb-8 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-700 flex items-center">
            <span className="mr-3 text-3xl">🌿</span> NPK Uptake & Fertilizer
            Requirements
          </div>
          <div className="text-right">
            <div className="text-lg font-medium text-gray-700">
              {getCurrentDate()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Plot: {PLOT_NAME}</div>
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
        <div className="mb-4"></div>
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
        {/* <div
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
                  data.map((entry: FertilizerEntry, index: number) => (
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
        </div> */}
        <FertilizerTable />

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
