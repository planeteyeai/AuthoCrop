// import React, { useEffect, useState } from "react";
// import "./Irrigation/Irrigation.css";
// import { useAppContext } from "../context/AppContext";
// import { useFarmerProfile } from "../hooks/useFarmerProfile";
// import budData from "./bud.json";
// import { fetchWeatherForecast, extractNumericValue } from "../services/weatherForecastService";

// const IrrigationSchedule: React.FC = () => {
//   const { getCached, setCached } = useAppContext();
//   const { profile, loading: profileLoading } = useFarmerProfile();

//   const [plotName, setPlotName] = useState<string>("");
//   const [etValue, setEtValue] = useState<number>(0.1); // Default fallback
//   const [rainfallMm, setRainfallMm] = useState<number>(0);
//   const [forecastRainfall, setForecastRainfall] = useState<number[]>([]);
//   const [kc, setKc] = useState<number>(0.3);
//   const [stage, setStage] = useState<string>("");
//   const [motorHp, setMotorHp] = useState<number | null>(null);
//   const [flowRateLph, setFlowRateLph] = useState<number | null>(null);
//   const [emittersCount, setEmittersCount] = useState<number>(0);
//   const [totalPlants, setTotalPlants] = useState<number>(0);
//   const [irrigationTypeCode, setIrrigationTypeCode] = useState<string>("flood");
//   const [irrigationType, setIrrigationType] = useState<string>("Flood");
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   const calculateNetET = (et: number, rainfall: number) => {
//     const net = Number(et) - Number(rainfall);
//     return net > 0 ? net : 0;
//   };

//   const waterFromNetET = (netEt: number, kcVal: number) => {
//     if (!Number.isFinite(netEt) || !Number.isFinite(kcVal) || netEt <= 0) return 0;
//     // Water requirement per acre: netEt × KC × 0.94 × 4046.86
//     const liters = netEt * kcVal * 0.94 * 4046.86;
//     return Math.round(liters);
//   };

//   const formatTimeHrsMins = (hoursTotal: number) => {
//     if (!Number.isFinite(hoursTotal) || hoursTotal <= 0) return "0 hrs 0 mins";
    
//     const h = Math.floor(hoursTotal);
//     const m = Math.round((hoursTotal - h) * 60);
//     return `${h} hrs ${m} mins`;
//   };

//   const calcIrrigationTime = (waterRequired: number, rainfall: number) => {
//     // Formula: (waterRequired - rainfall) / flowRate
//     // Time = liters / (liters per hour)
    
//     const netWater = waterRequired - rainfall;
//     if (netWater <= 0) return "0 hrs 0 mins";

//     let flowRateLitersPerHour = 0;
//     if (irrigationTypeCode === "drip") {
//       if (!flowRateLph || flowRateLph <= 0 || !emittersCount || emittersCount <= 0 || !totalPlants || totalPlants <= 0) return "N/A";
//       // Total flow rate = flowRate per emitter × emitters per plant × total plants
//       flowRateLitersPerHour = flowRateLph * emittersCount * totalPlants;
//     } else {
//       // Flood: motorHp × 1050 L/hr
//       if (!motorHp || motorHp <= 0) return "N/A";
//       flowRateLitersPerHour = motorHp * 1050;
//     }

//     if (flowRateLitersPerHour <= 0) return "N/A";

//     const hours = (netWater * 60) / denominator;
//     return formatTimeHrsMins(hours);
//   };

//   useEffect(() => {
//     if (!profile || profileLoading) return;

//     const plotNames = profile.plots?.map((p: any) => p.fastapi_plot_id) || [];
//     const defaultPlot = plotNames.length > 0 ? plotNames[0] : "";
//     setPlotName(defaultPlot);

//     try {
//       const coords = profile.plots?.[0]?.coordinates?.location?.coordinates;
//       if (Array.isArray(coords) && coords.length >= 2) {
//         const [lon, lat] = coords;
//         fetchCurrentRainfall(lat, lon);
//         fetchForecastRainfall(lat, lon);
//       }
//     } catch (e) {
//       console.warn("IrrigationSchedule: coords missing", e);
//     }

//     const firstFarm = profile.plots?.[0]?.farms?.[0];
//     if (firstFarm?.plantation_date) {
//       const plantationDate = new Date(firstFarm.plantation_date);
//       const days = Math.floor((Date.now() - plantationDate.getTime()) / (1000 * 60 * 60 * 24));

//       let derivedStage = "Germination";
//       if (days > 210) derivedStage = "Maturity & Ripening";
//       else if (days > 90) derivedStage = "Grand Growth";
//       else if (days > 30) derivedStage = "Tillering";

//       setStage(derivedStage);

//       let kcValue = 0.3;
//       try {
//         for (const method of (budData as any).fertilizer_schedule || []) {
//           for (const st of method.stages || []) {
//             if (st.stage === derivedStage && st.kc !== undefined) {
//               kcValue = Number(st.kc) || kcValue;
//             }
//           }
//         }
//       } catch {}
//       setKc(kcValue);
//       console.log("Stage-based KC from bud.json:", { stage: derivedStage, kc: kcValue });
//     }

//     if (firstFarm) {
//       // Get irrigation data from the irrigations array
//       const firstIrrigation = firstFarm.irrigations?.[0];
      
//       const hp = firstIrrigation?.motor_horsepower ?? null;
//       const flow = firstIrrigation?.flow_rate_lph ?? null;
//       const emitters = firstIrrigation?.emitters_count ?? 0;
//       const irrigationCode = firstIrrigation?.irrigation_type_code || "flood";
//       const plants = firstFarm?.plants_in_field ?? 0;

//       setMotorHp(hp);
//       setFlowRateLph(flow);
//       setEmittersCount(emitters);
//       setTotalPlants(plants);
//       setIrrigationTypeCode(irrigationCode);
//       setIrrigationType(irrigationCode === "drip" ? "Drip" : "Flood");
      
//       console.log("Irrigation params from farm and irrigations:", {
//         motorHp: hp,
//         flowRateLph: flow,
//         emittersCount: emitters,
//         totalPlants: plants,
//         irrigationCode,
//         dripDenominator: plants && flow && emitters ? plants * flow * emitters : 0,
//         floodDenominator: plants && hp ? plants * hp : 0
//       });
//     }
//   }, [profile, profileLoading]);

//   useEffect(() => {
//     if (!plotName) return;
//     const cacheKey = `etData_${plotName}`;
//     const cached = getCached(cacheKey);
//     if (cached) {
//       const value = Number(cached.etValue);
//       setEtValue(value > 0 ? value : 0.1); // ✅ fallback if 0
//       setLoading(false);
//       return;
//     }
//     fetchETData();
//   }, [plotName]);

//   const fetchETData = async () => {
//     if (!plotName) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const currentDate = new Date().toISOString().split("T")[0];
//       const startDate = new Date();
//       startDate.setDate(startDate.getDate() - 7);
//       const apiUrl = `http://192.168.41.73:8009/plots/${plotName}/compute-et/`;
//       const response = await fetch(apiUrl, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           plot_name: plotName,
//           start_date: startDate.toISOString().split("T")[0],
//           end_date: currentDate,
//         }),
//       });
//       if (!response.ok) {
//         const txt = await response.text();
//         throw new Error(`ET API ${response.status}: ${txt}`);
//       }
//       const data = await response.json();
//       const et = data.et_24hr ?? data.ET_mean_mm_per_day ?? data.et ?? 0;
//       const finalEt = Number(et) > 0 ? Number(et) : 0.1;
//       setEtValue(finalEt);
//       setCached(`etData_${plotName}`, { etValue: finalEt });
//     } catch (err: any) {
//       console.error("fetchETData err", err);
//       setError("Failed to fetch ET");
//       setEtValue(0.1); // ✅ fallback
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchCurrentRainfall = async (lat: number, lon: number) => {
//     try {
//       const url = `https://dev-currentw.cropeye.ai/current-weather?lat=${lat}&lon=${lon}`;
//       const resp = await fetch(url);
//       if (!resp.ok) throw new Error(`Current weather ${resp.status}`);
//       const data = await resp.json();
//       const precip = Number(data?.precip_mm) || 0;
//       setRainfallMm(precip);
//     } catch (e) {
//       console.error("fetchCurrentRainfall failed", e);
//       setRainfallMm(0);
//     }
//   };

//   useEffect(() => {
//     let interval: any = null;
//     try {
//       const coords = profile?.plots?.[0]?.coordinates?.location?.coordinates;
//       if (Array.isArray(coords) && coords.length >= 2) {
//         const [lon, lat] = coords;
//         interval = setInterval(() => fetchCurrentRainfall(lat, lon), 3600 * 1000);
//       }
//     } catch {}
//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [profile]);

//   const fetchForecastRainfall = async (lat: number, lon: number) => {
//     try {
//       const forecastData = await fetchWeatherForecast(lat, lon);
//       const rainfallValues = (forecastData.data || []).map((d: any) =>
//         Number(extractNumericValue(d.precipitation ?? 0))
//       );
//       const arr: number[] = [];
//       for (let i = 0; i < 6; i++) {
//         arr.push(rainfallValues[i] ?? 0);
//       }
//       setForecastRainfall(arr);
//     } catch (e) {
//       console.error("fetchForecastRainfall failed", e);
//       setForecastRainfall([0, 0, 0, 0, 0, 0]);
//     }
//   };

//   // Function to generate ET for next 6 days applying 5% variation and 2% decrease if rainfall detected
//   const generateAdjustedET = (baseEt: number, forecastRainfallArr: number[]) => {
//     const etArray: number[] = [];

//     for (let i = 0; i < 6; i++) {
//       let et = baseEt;

//       // Apply 5% random variation: +/- 5%
//       const variationFactor = 1 + (Math.random() * 0.1 - 0.05); // between 0.95 and 1.05
//       et = et * variationFactor;

//       // Apply 2% decrease if forecast rainfall > 0
//       if (forecastRainfallArr[i] > 0) {
//         et = et * 0.98;
//       }

//       // Ensure ET is never zero or negative
//       etArray.push(et > 0 ? et : 0.1);
//     }

//     return etArray;
//   };

//   const generateScheduleData = () => {
//     const scheduleData: Array<any> = [];
//     const today = new Date();

//     // Generate adjusted ET for next 6 days
//     const next6Et = generateAdjustedET(etValue, forecastRainfall);

//     for (let i = 0; i < 7; i++) {
//       const date = new Date(today);
//       date.setDate(today.getDate() + i);

//       const isToday = i === 0;

//       // Determine ET to use:
//       // Today = etValue (current ET)
//       // Next days = adjusted ET values from next6Et array
//       const etForDay = isToday ? etValue : next6Et[i - 1];

//       // Rainfall: today current rainfall, else forecast
//       const rainfall = isToday ? rainfallMm : forecastRainfall[i - 1] ?? 0;

//       const netEt = calculateNetET(etForDay, rainfall);
//       const waterRequired = waterFromNetET(netEt, kc);
//       const time = calcIrrigationTime(waterRequired, rainfall);

//       scheduleData.push({
//         date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
//         isToday,
//         etDisplayed: etForDay, // Display actual ET, not Net ET
//         rainfall,
//         waterRequired,
//         time,
//       });
//     }

//     return scheduleData;
//   };

//   const scheduleData = generateScheduleData();

//   return (
//     <div className="irrigation-schedule-card">
//       <div className="card-header">
//         <h3>7-Day Irrigation Schedule</h3>
//         </div>
//       <div className="schedule-table">
//         <table>
//           <thead>
//             <tr>
//               <th>DATE</th>
//               <th>ET (mm/day)</th>
//               <th>KC</th>
//               <th>RAINFALL (mm)</th>
//               <th>WATER REQ. (L)</th>
//               <th>{irrigationType} TIME</th>
//                 </tr>
//               </thead>
//               <tbody>
//             {scheduleData.map((day, idx) => (
//               <tr key={idx}>
//                 <td>
//                   <strong>{day.date}</strong>
//                         {day.isToday && (
//                     <>
//                       <br />
//                       <span className="today-label">Today</span>
//                     </>
//                       )}
//                     </td>
//                 <td>
//                   {loading ? (
//                     <div className="loading-spinner-small" />
//                   ) : (
//                     <strong>{Number(day.etDisplayed).toFixed(2)}</strong>
//                       )}
//                     </td>
//                 <td><strong>{kc.toFixed(2)}</strong></td>
//                 <td>{Number(day.rainfall).toFixed(1)}</td>
//                 <td>{day.waterRequired.toLocaleString()}</td>
//                 <td><strong>{day.time}</strong></td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//       {error && <div className="error-message-small">{error}</div>}
//     </div>
//   );
// };

// export default IrrigationSchedule;



import React, { useEffect, useState } from "react";
import "./Irrigation/Irrigation.css";
import { useAppContext } from "../context/AppContext";
import { useFarmerProfile } from "../hooks/useFarmerProfile";
import budData from "./bud.json";
import { fetchWeatherForecast, extractNumericValue } from "../services/weatherForecastService";
import { Sun } from "lucide-react";

const IrrigationSchedule: React.FC = () => {
  const { getCached, setCached, setAppState } = useAppContext();
  const { profile, loading: profileLoading } = useFarmerProfile();
  
  const [plotName, setPlotName] = useState<string>("");
  const [etValue, setEtValue] = useState<number>(0.1); // Default fallback
  const [rainfallMm, setRainfallMm] = useState<number>(0);
  const [forecastRainfall, setForecastRainfall] = useState<number[]>([]);
  const [kc, setKc] = useState<number>(0.3);
  const [stage, setStage] = useState<string>("");
  const [motorHp, setMotorHp] = useState<number | null>(null);
  const [flowRateLph, setFlowRateLph] = useState<number | null>(null);
  const [emittersCount, setEmittersCount] = useState<number>(0);
  const [totalPlants, setTotalPlants] = useState<number>(0);
  const [spacingA, setSpacingA] = useState<number>(0);
  const [spacingB, setSpacingB] = useState<number>(0);
  const [irrigationTypeCode, setIrrigationTypeCode] = useState<string>("flood");
  const [irrigationType, setIrrigationType] = useState<string>("Flood");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const calculateNetET = (et: number, rainfall: number) => {
    const net = Number(et) - Number(rainfall);
    return net > 0 ? net : 0;
  };

  const waterFromNetET = (netEt: number, kcVal: number) => {
    if (!Number.isFinite(netEt) || !Number.isFinite(kcVal) || netEt <= 0) return 0;
    // Water requirement per acre: netEt × KC × 0.94 × 4046.86
    const liters = netEt * kcVal * 0.94 * 4046.86;
    return Math.round(liters);
  };

  const formatTimeHrsMins = (hoursTotal: number) => {
    if (!Number.isFinite(hoursTotal) || hoursTotal <= 0) return "0 hrs 0 mins";
    
    const h = Math.floor(hoursTotal);
    const m = Math.round((hoursTotal - h) * 60);
    return `${h} hrs ${m} mins`;
  };

  const calcIrrigationTime = (waterRequired: number, rainfall: number) => {
    // const netWater = waterRequired - rainfall;
    if (waterRequired <= 0) return "0 hrs 0 mins";
    
    if (irrigationTypeCode === "drip") {
      if (!flowRateLph || flowRateLph <= 0 || !emittersCount || emittersCount <= 0 || !totalPlants || totalPlants <= 0) return "N/A";
      
      // Drip formula: ((waterRequired - rainfall) × 60 / totalPlants) × (emittersCount × flowRateLph)
      const timeInMinutes = ((waterRequired * 60) / (43560/spacingA*spacingB) * (emittersCount * flowRateLph));
      
      // Convert minutes to hours for formatting
      const hours = timeInMinutes / 60;
      return formatTimeHrsMins(hours);
    } else {
      // Flood: motorHp × 1050 L/hr
      if (!motorHp || motorHp <= 0) return "N/A";
      const flowRateLitersPerHour = ((waterRequired * 60) / motorHp * 7000) ;
      const hours = waterRequired / flowRateLitersPerHour;
      return formatTimeHrsMins(hours);
    }
  };

  useEffect(() => {
    if (!profile || profileLoading) return;
    
    const plotNames = profile.plots?.map((p: any) => p.fastapi_plot_id) || [];
    const defaultPlot = plotNames.length > 0 ? plotNames[0] : "";
    setPlotName(defaultPlot);

    try {
      const coords = profile.plots?.[0]?.coordinates?.location?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const [lon, lat] = coords;
        fetchCurrentRainfall(lat, lon);
        fetchForecastRainfall(lat, lon);
      }
    } catch (e) {
      console.warn("IrrigationSchedule: coords missing", e);
    }

    const firstFarm = profile.plots?.[0]?.farms?.[0];
    if (firstFarm?.plantation_date) {
      const plantationDate = new Date(firstFarm.plantation_date);
      const days = Math.floor((Date.now() - plantationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let derivedStage = "Germination";
      if (days > 210) derivedStage = "Maturity & Ripening";
      else if (days > 90) derivedStage = "Grand Growth";
      else if (days > 30) derivedStage = "Tillering";
      
      setStage(derivedStage);

      let kcValue = 0.3;
      try {
        for (const method of (budData as any).fertilizer_schedule || []) {
          for (const st of method.stages || []) {
            if (st.stage === derivedStage && st.kc !== undefined) {
              kcValue = Number(st.kc) || kcValue;
            }
          }
        }
      } catch {}
      
      setKc(kcValue);
      console.log("Stage-based KC from bud.json:", { stage: derivedStage, kc: kcValue });
    }

    if (firstFarm) {
      // Get irrigation data from the irrigations array
      const firstIrrigation = firstFarm.irrigations?.[0];
      
      const hp = firstIrrigation?.motor_horsepower ?? null;
      const flow = firstIrrigation?.flow_rate_lph ?? null;
      const emitters = firstIrrigation?.emitters_count ?? 0;
      const irrigationCode = firstIrrigation?.irrigation_type_code || "flood";
      const plants = firstFarm?.plants_in_field ?? 0;
      const spacing_a = firstFarm?.spacing_a ?? 0;
      const spacing_b = firstFarm?.spacing_b ?? 0;

      setMotorHp(hp);
      setFlowRateLph(flow);
      setEmittersCount(emitters);
      setTotalPlants(plants);
      setSpacingA(spacing_a);
      setSpacingB(spacing_b);
      setIrrigationTypeCode(irrigationCode);
      setIrrigationType(irrigationCode === "drip" ? "Drip" : "Flood");
      
      console.log("Irrigation params from farm and irrigations:", {
        motorHp: hp,
        flowRateLph: flow,
        emittersCount: emitters,
        totalPlants: plants,
        spacing_a,
        spacing_b,
        irrigationCode,
        dripDenominator: plants && flow && emitters ? plants * flow * emitters : 0,
        floodDenominator: plants && hp ? plants * hp : 0
      });
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    if (!plotName) return;
    
    const cacheKey = `etData_${plotName}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
      const value = Number(cached.etValue);
      setEtValue(value > 0 ? value : 0.1); // ✅ fallback if 0
      setLoading(false);
      return;
    }

    fetchETData();
  }, [plotName]);

  const fetchETData = async () => {
    if (!plotName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const apiUrl = `http://192.168.41.73:8009/plots/${plotName}/compute-et/`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_name: plotName,
          start_date: startDate.toISOString().split("T")[0],
          end_date: currentDate,
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`ET API ${response.status}: ${txt}`);
      }

      const data = await response.json();
      const et = data.et_24hr ?? data.ET_mean_mm_per_day ?? data.et ?? 0;
      const finalEt = Number(et) > 0 ? Number(et) : 0.1;
      
      setEtValue(finalEt);
      setCached(`etData_${plotName}`, { etValue: finalEt });
    } catch (err: any) {
      console.error("fetchETData err", err);
      setError("Failed to fetch ET");
      setEtValue(0.1); // ✅ fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRainfall = async (lat: number, lon: number) => {
    try {
      const url = `https://dev-currentw.cropeye.ai/current-weather?lat=${lat}&lon=${lon}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Current weather ${resp.status}`);
      
      const data = await resp.json();
      const precip = Number(data?.precip_mm) || 0;
      setRainfallMm(precip);
    } catch (e) {
      console.error("fetchCurrentRainfall failed", e);
      setRainfallMm(0);
    }
  };

  useEffect(() => {
    let interval: any = null;
    
    try {
      const coords = profile?.plots?.[0]?.coordinates?.location?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const [lon, lat] = coords;
        interval = setInterval(() => fetchCurrentRainfall(lat, lon), 3600 * 1000);
      }
    } catch {}
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [profile]);

  const fetchForecastRainfall = async (lat: number, lon: number) => {
    try {
      const forecastData = await fetchWeatherForecast(lat, lon);
      const rainfallValues = (forecastData.data || []).map((d: any) =>
        Number(extractNumericValue(d.precipitation ?? 0))
      );
      
      console.log("📊 Forecast API rainfall data:", rainfallValues);
      
      // The forecast API returns 7 days starting from tomorrow
      // We need exactly 6 days (tomorrow to day+6)
      const arr: number[] = [];
      for (let i = 0; i < 6; i++) {
        arr.push(rainfallValues[i] ?? 0);
      }
      setForecastRainfall(arr);
      console.log("📊 Stored forecast for next 6 days:", arr);
    } catch (e) {
      console.error("fetchForecastRainfall failed", e);
      setForecastRainfall([0, 0, 0, 0, 0, 0]);
    }
  };

  // Function to generate ET for next 6 days applying 5% variation and 2% decrease if rainfall detected
  const generateAdjustedET = (baseEt: number, forecastRainfallArr: number[]) => {
    const etArray: number[] = [];
    for (let i = 0; i < 6; i++) {
      let et = baseEt;
      // Apply 5% random variation: +/- 5%
      const variationFactor = 1 + (Math.random() * 0.1 - 0.05); // between 0.95 and 1.05
      et = et * variationFactor;
      
      // Apply 2% decrease if forecast rainfall > 0
      if (forecastRainfallArr[i] > 0) {
        et = et * 0.98;
      }
      
      // Ensure ET is never zero or negative
      etArray.push(et > 0 ? et : 0.1);
    }
    return etArray;
  };

  const generateScheduleData = () => {
    const scheduleData: Array<any> = [];
    const today = new Date();
    
    // Generate adjusted ET for next 6 days
    const next6Et = generateAdjustedET(etValue, forecastRainfall);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const isToday = i === 0;
      
      // Determine ET to use:
      // Today = etValue (current ET)
      // Next days = adjusted ET values from next6Et array
      const etForDay = isToday ? etValue : next6Et[i - 1];
      
      // Rainfall: today current rainfall, else forecast
      const rainfall = isToday ? rainfallMm : forecastRainfall[i ] ?? 0;
      
      if (i <= 2) {
        console.log(`Day ${i} (${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}): rainfall = ${rainfall}, isToday = ${isToday}, forecastRainfall[${i-1}] = ${forecastRainfall[i-1]}`);
      }
      
      const netEt = calculateNetET(etForDay, rainfall);
      const waterRequired = waterFromNetET(netEt, kc);
      const time = calcIrrigationTime(waterRequired, rainfall);

      scheduleData.push({
        date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        isToday,
        etDisplayed: etForDay, // Display actual ET, not Net ET
        rainfall,
        waterRequired,
        time,
      });
    }
    
    return scheduleData;
  };

  const scheduleData = generateScheduleData();

  // Store schedule data in appState for WaterUptakeCard to access
  useEffect(() => {
    if (scheduleData && scheduleData.length > 0) {
      setAppState((prev: any) => ({
        ...prev,
        irrigationScheduleData: scheduleData,
      }));
      console.log('✅ Irrigation schedule data stored in appState:', scheduleData);
    }
  }, [scheduleData]);

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow h-full">
      <div className="bg-green-600 text-white p-2 flex items-center gap-2 ">
        <h2 className="text-sm font-semibold">7-Day Irrigation Schedule</h2>
      </div>

      <div className="overflow-x-auto ">
        <table className="w-full text-xs h-full">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium">DATE</th>
              <th className="px-2 py-2 text-left text-xs font-medium">EVAPOTRANSPIRATION</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">RAINFALL (mm)</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">WATER REQ.(L)</th>
              <th className="px-2 py-2 text-left text-xs font-medium">{irrigationType} TIME</th>
                </tr>
              </thead>
              <tbody>
            {scheduleData.map((day, idx) => (
                  <tr
                key={idx}
                className={`${idx % 2 ? 'bg-white' : 'bg-gray-50'} ${
                      day.isToday ? 'ring-2 ring-blue-300' : ''
                    }`}
                  >
                    <td className="px-2 py-2 font-medium">
                      <div className="flex gap-1 items-center flex-wrap">
                    <span className="text-xs">{day.date}</span>
                        {day.isToday && (
                          <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                            Today
                          </span>
                        )}
                          <Sun className="h-3 w-3 text-orange-500" />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                  {loading ? (
                    <div className="loading-spinner-small" />
                  ) : (
                    <span className="text-xs text-gray-700 font-semibold">
                      {Number(day.etDisplayed).toFixed(2)} mm/day
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                  <span className="font-medium text-xs text-gray-500">
                          {Number(day.rainfall).toFixed(1)}
                        </span>
                    </td>
                    <td className="px-2 py-2 text-blue-600 font-semibold text-xs">
                      {day.waterRequired.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-gray-800 text-xs">
                  <strong>{day.time}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      
      {error && <div className="error-message-small">{error}</div>}
    </div>
  );
};

export default IrrigationSchedule;