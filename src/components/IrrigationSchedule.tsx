import React, { useState, useEffect } from 'react';
import { Droplets, Calendar, Activity, AlertCircle, CloudRain, Sun } from 'lucide-react';
import { getFarmerProfile } from '../api';

interface TimePicker {
  value: { hours: number; minutes: number };
  onChange: (value: { hours: number; minutes: number }) => void;
  maxHours: number;
}

const TimePicker: React.FC<TimePicker> = ({ value, onChange, maxHours }) => {
  const handleHoursChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, hours: parseInt(e.target.value) });
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, minutes: parseInt(e.target.value) });
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <select 
        value={value.hours}
        onChange={handleHoursChange}
        className="bg-white/20 text-white rounded px-2 py-1 text-sm border border-white/30"
      >
        {Array.from({ length: maxHours + 1 }, (_, i) => (
          <option key={i} value={i} className="text-gray-800">
            {i} hrs
          </option>
        ))}
      </select>
      <select
        value={value.minutes}
        onChange={handleMinutesChange}
        className="bg-white/20 text-white rounded px-2 py-1 text-sm border border-white/30"
      >
        {Array.from({ length: 61 }, (_, i) => (
          <option key={i} value={i} className="text-gray-800">
            {i} mins
          </option>
        ))}
      </select>
    </div>
  );
};

interface ETData {
  et_mm: number;
  date: string;
}

interface ForecastData {
  Date: string;
  Rainfall_Forecast: number;
  Temprature_Forecast: number;
  Humidity_Forecast: number;
  Wind_Forecast: number;
}

interface IrrigationDay {
  date: string;
  evapotranspiration: number | null;
  etRange: 'Low' | 'Medium' | 'High' | null;
  rainfall: number;
  isRainfall: boolean;
  waterRequired: number;
  floodTimeHours: string;
  isToday: boolean;
  adjustedByFarmer: boolean;
  dayType: 'current' | 'predicted';
}

interface IrrigationDetails {
  id: number;
  farm_id: number;
  farm_uid: string;
  irrigation_type: string;
  irrigation_type_code: string;
  location: {
    type: string;
    coordinates: number[];
  };
  status: boolean;
  status_display: string;
  motor_horsepower: number | null;
  pipe_width_inches: number | null;
  distance_motor_to_plot_m: number | null;
  plants_per_acre: number | null;
  flow_rate_lph: number | null;
  emitters_count: number | null;
}

// These will be fetched from the API

const IrrigationSchedule: React.FC = () => {
  const [etData, setETData] = useState<ETData[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [currentRainfall, setCurrentRainfall] = useState<number>(0);
  const [irrigationSchedule, setIrrigationSchedule] = useState<IrrigationDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmerTimeInput, setFarmerTimeInput] = useState<{ hours: number; minutes: number }>({
    hours: 0,
    minutes: 0
  });
  const [inputError, setInputError] = useState<string>('');
  const [irrigationDetails, setIrrigationDetails] = useState<IrrigationDetails | null>(null);
  const [farmerDetails, setFarmerDetails] = useState<any>(null);
  const [plotName, setPlotName] = useState<string>('');

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    // Add today and next 6 days (7 days total)
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const getETRange = (etValue: number): 'Low' | 'Medium' | 'High' => {
    if (etValue <= 3.0) return 'Low';
    if (etValue <= 5.5) return 'Medium';
    return 'High';
  };

  const predictET = (baseET: number, rainfall: number, dayOffset: number): number => {
    // Simple ET prediction model based on base ET, rainfall, and day offset
    let predictedET = baseET;

    // Reduce ET if significant rainfall
    if (rainfall > 5) {
      predictedET *= 0.7; // 30% reduction for heavy rain
    } else if (rainfall > 1) {
      predictedET *= 0.85; // 15% reduction for moderate rain
    }

    // Slight variation for future days (simulate weather variation)
    const variation = Math.sin(dayOffset * 0.5) * 0.3;
    predictedET += variation;

    return Math.max(1.0, Math.min(8.0, predictedET)); // Keep within reasonable bounds
  };

  const fetchETData = async () => {
    if (!plotName) {
      console.log('⚠️ Plot name not available yet, skipping ET data fetch');
      return;
    }

    try {
      const response = await fetch(`http://192.168.41.73:8009/plots/${plotName}/compute-et/`);
      if (response.ok) {
        const data = await response.json();
        setETData(data);
        console.log('✅ ET data loaded for plot:', plotName);
        return;
      }
    } catch (error) {
      console.error('ET API error:', error);
    }

    // Fallback with mock data for yesterday and today
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const mockData = [
      { et_mm: 3.8, date: yesterdayStr },
      { et_mm: 3.2, date: today }
    ];
    setETData(mockData);
  };

  const fetchCurrentRainfall = async () => {
    try {
      // Use forecast API to obtain today's rainfall
      const response = await fetch(`https://dev-weather.cropeye.ai/forecast?lat=19.9993&lon=73.7900`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      const rawList: any[] = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
      const parseNum = (v: any) => {
        if (v === null || v === undefined) return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return parseFloat(v.replace(/[^\d.+-]/g, '')) || 0;
        return 0;
      };
      const toISO = (d: any) => {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d).slice(0, 10) : dt.toISOString().split('T')[0];
      };

      const todayIso = new Date().toISOString().split('T')[0];
      const todayItem = rawList.find((item: any) => toISO(item.date || item.Date) === todayIso);
      const rainfall = parseNum(todayItem?.precipitation ?? todayItem?.Rainfall_Forecast);
      setCurrentRainfall(rainfall);
    } catch (error) {
      console.error('Current rainfall (forecast) API error:', error);
      setCurrentRainfall(0);
    }
  };

  const fetchForecastData = async () => {
    try {
      const response = await fetch(`https://dev-weather.cropeye.ai/forecast?lat=19.9993&lon=73.7900`)
      if (!response.ok) {
        console.error('Forecast API response not ok:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('Forecast API response:', data); // Debug log

      const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      const parseNum = (v: any) => {
        if (v === null || v === undefined) return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') return parseFloat(v.replace(/[^\d.+-]/g, '')) || 0;
        return 0;
      };
      const toISO = (d: any) => {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d).slice(0, 10) : dt.toISOString().split('T')[0];
      };

      // Index forecast by ISO date
      const byDate = new Map<string, any>();
      rawList.forEach((item: any) => {
        const iso = toISO(item.date || item.Date);
        if (!iso) return;
        byDate.set(iso, item);
      });

      // Next 6 days only (tomorrow .. +6)
      const dates = generateDates().slice(1);
      const forecastInfo: ForecastData[] = dates.map((iso) => {
        const src = byDate.get(iso) || {};
        return {
          Date: iso,
          Rainfall_Forecast: parseNum(src.precipitation ?? src.Rainfall_Forecast),
          Temprature_Forecast: parseNum(src.temperature_max ?? src.Temprature_Forecast),
          Humidity_Forecast: parseNum(src.humidity_max ?? src.Humidity_Forecast),
          Wind_Forecast: parseNum(src.wind_speed_max ?? src.Wind_Forecast)
        } as ForecastData;
      });

      setForecastData(forecastInfo);
      console.log('Processed forecast data:', forecastInfo); // Debug log
    } catch (error) {
      console.error('Forecast API error:', error);
      // Mock forecast data as fallback (same structure as WeatherForecast)
      const dates = generateDates().slice(1);
      const mockForecast: ForecastData[] = dates.map((date) => ({
        Date: date,
        Rainfall_Forecast: Math.random() > 0.7 ? Math.random() * 15 : 0,
        Temprature_Forecast: 25 + Math.random() * 10,
        Humidity_Forecast: 60 + Math.random() * 30,
        Wind_Forecast: 5 + Math.random() * 15
      }));
      setForecastData(mockForecast);
      console.log('Using mock forecast data:', mockForecast); // Debug log
    }
  };

  const calculateWaterRequirement = (et: number, rainfall: number, isToday: boolean): number => {
    // Base requirement proportional to ET (liters)
    let waterLiters = et * 4200;

    // New rainfall impact: subtract a fixed amount per mm of rain
    // This makes even light rain lower the requirement noticeably
    const RAIN_IMPACT_PER_MM = 4000; // liters reduced per mm rainfall
    if (rainfall > 0) {
      waterLiters = Math.max(0, waterLiters - rainfall * RAIN_IMPACT_PER_MM);
    }

    // Apply farmer input only for today (subtract pumped water)
    if (isToday && (farmerTimeInput.hours > 0 || farmerTimeInput.minutes > 0)) {
      const totalHours = farmerTimeInput.hours + farmerTimeInput.minutes / 60;
      const farmerWater = totalHours * 3150;
      waterLiters = Math.max(0, waterLiters - farmerWater);
    }

    return Math.round(waterLiters);
  };

  const calculateFloodTime = (liters: number): string => {
    // Use motor_horsepower from irrigation details - no default value
    if (!irrigationDetails?.motor_horsepower) {
      return 'N/A';
    }
    
    const motorHorsepower = irrigationDetails.motor_horsepower;
    const pumpCapacity = motorHorsepower * 1050; // Approximate liters per hour per HP
    const hours = liters / pumpCapacity;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h} hrs ${m} mins`;
  };

  const calculateDripTime = (liters: number): string => {
    // For drip irrigation, use flow_rate_lph - no default value
    if (!irrigationDetails?.flow_rate_lph) {
      return 'N/A';
    }
    
    const flowRate = irrigationDetails.flow_rate_lph;
    const hours = liters / flowRate;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h} hrs ${m} mins`;
  };

  const fetchFarmerAndIrrigationDetails = async () => {
    try {
      const data = await getFarmerProfile();
      
      // Set farmer details
      if (data.farmer_profile) {
        setFarmerDetails(data.farmer_profile);
        console.log('✅ Farmer details loaded:', data.farmer_profile);
      }
      
      // Set plot name from first plot
      if (data.plots && data.plots.length > 0) {
        const firstPlot = data.plots[0];
        const plotDisplayName = `${firstPlot.gat_number}_${firstPlot.plot_number}`;
        setPlotName(plotDisplayName);
        console.log('✅ Plot name set:', plotDisplayName);
      }
      
      // Set irrigation details from farms data
      if (data.plots && data.plots.length > 0) {
        const firstPlot = data.plots[0];
        if (firstPlot.farms && firstPlot.farms.length > 0) {
          const firstFarm = firstPlot.farms[0];
          // Create irrigation details from farm data
          const irrigationData: IrrigationDetails = {
            id: firstFarm.id || 0,
            farm_id: firstFarm.id || 0,
            farm_uid: firstFarm.farm_uid || '',
            irrigation_type: firstFarm.crop_type?.irrigation_type || 'Flood Irrigation',
            irrigation_type_code: firstFarm.crop_type?.irrigation_type_code || 'flood',
            location: {
              type: 'Point',
              coordinates: firstFarm.location?.coordinates || [0, 0]
            },
            status: true,
            status_display: 'Active',
            motor_horsepower: firstFarm.motor_horsepower || null,
            pipe_width_inches: firstFarm.pipe_width_inches || null,
            distance_motor_to_plot_m: firstFarm.distance_motor_to_plot_m || null,
            plants_per_acre: firstFarm.plants_per_acre || null,
            flow_rate_lph: firstFarm.flow_rate_lph || null,
            emitters_count: firstFarm.emitters_count || null
          };
          setIrrigationDetails(irrigationData);
          console.log('✅ Irrigation details loaded from farm data:', irrigationData);
        } else {
          console.log('⚠️ No farm data found for irrigation details');
        }
      } else {
        console.log('⚠️ No plots found for irrigation details');
      }
    } catch (error) {
      console.error('❌ Error fetching farmer and irrigation details:', error);
    }
  };

  const generateSchedule = () => {
    const today = new Date().toISOString().split('T')[0];
    const dates = generateDates();

    // Get base ET for predictions (use today's ET or fallback)
    const todayET = etData.find(d => d.date === today);
    const baseETForPrediction = todayET?.et_mm || 3.2;

    const schedule: IrrigationDay[] = dates.map((date, i) => {
      const isToday = date === today;
      let et: number | null = null;
      let dayType: 'current' | 'predicted' = 'predicted';

      // Determine ET value and day type
      if (isToday) {
        const etRecord = etData.find(d => d.date === date);
        et = etRecord?.et_mm || null;
        dayType = 'current';
      } else {
        // Predict ET for future days
        const dayOffset = i;
        // Find forecast rainfall for this date
        const forecastRecord = forecastData.find(r => {
          const forecastDate = new Date(r.Date).toISOString().split('T')[0];
          return forecastDate === date;
        });
        const forecastRainfall = forecastRecord?.Rainfall_Forecast || 0;
        et = predictET(baseETForPrediction, forecastRainfall, dayOffset);
        dayType = 'predicted';
      }

      // Get rainfall data
      let rainfall = 0;
      if (isToday) {
        rainfall = currentRainfall;
      } else {
        // Use forecast data for future days (matching WeatherForecast structure)
        const forecastRecord = forecastData.find(r => {
          const forecastDate = new Date(r.Date).toISOString().split('T')[0];
          return forecastDate === date;
        });
        rainfall = forecastRecord?.Rainfall_Forecast || 0;
      }

      const waterRequired = et ? calculateWaterRequirement(et, rainfall, isToday) : 0;
      const isRainfall = rainfall > 0; // Consider any > 0 mm as rainfall

      return {
        date,
        evapotranspiration: et,
        etRange: et !== null ? getETRange(et) : null,
        rainfall,
        isRainfall,
        waterRequired,
        floodTimeHours: et ? (irrigationDetails?.irrigation_type_code === 'drip' ? calculateDripTime(waterRequired) : calculateFloodTime(waterRequired)) : '-',
        isToday,
        adjustedByFarmer: isToday && (farmerTimeInput.hours > 0 || farmerTimeInput.minutes > 0),
        dayType
      };
    });

    setIrrigationSchedule(schedule);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        fetchCurrentRainfall(),
        fetchForecastData(),
        fetchFarmerAndIrrigationDetails()
      ]);
      setLoading(false);
    };

    load();
  }, []);

  // Fetch ET data when plot name is available
  useEffect(() => {
    if (plotName) {
      fetchETData();
    }
  }, [plotName]);

  useEffect(() => {
    if (!loading) {
      generateSchedule();
    }
  }, [etData, forecastData, currentRainfall, farmerTimeInput, loading, irrigationDetails, plotName]);

  const handleTimeChange = (t: { hours: number; minutes: number }) => {
    setInputError('');
    setFarmerTimeInput(t);
  };

  if (loading) {
    return (
      <div className="text-center p-10 text-gray-600">
        <div className="animate-pulse">Loading irrigation data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-800">Smart Irrigation Schedule</h1>
        </div>
        {farmerDetails && (
          <div className="text-sm text-gray-600">
            Farmer: {farmerDetails.first_name} {farmerDetails.last_name} | Plot: {plotName}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Farmer Input */}
        <div className="mb-4 bg-orange-500 text-white p-3 rounded-lg max-w-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Water Given Today</h3>
          </div>
          <TimePicker
            value={farmerTimeInput}
            onChange={handleTimeChange}
            maxHours={24}
          />
          {inputError && (
            <p className="text-xs mt-2 text-red-100 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {inputError}
            </p>
          )}
          {(farmerTimeInput.hours > 0 || farmerTimeInput.minutes > 0) && (
            <p className="text-xs mt-2 bg-white/20 rounded px-2 py-1">
              ✓ Adjusted by farmer ({farmerTimeInput.hours} hrs {farmerTimeInput.minutes} mins)
            </p>
          )}
        </div>






        {/* Schedule Table */}
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <div className="bg-green-600 text-white p-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <h2 className="text-sm font-semibold">7-Day Irrigation Schedule</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium">DATE</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">ETO</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">RAINFALL (mm)</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">WATER REQ.(L)</th>
                  <th className="px-2 py-2 text-left text-xs font-medium">
                    {irrigationDetails?.irrigation_type_code === 'drip' ? 'DRIP TIME' : 'FLOOD TIME'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {irrigationSchedule.map((day, index) => (
                  <tr
                    key={day.date}
                    className={`${index % 2 ? 'bg-white' : 'bg-gray-50'} ${
                      day.isToday ? 'ring-2 ring-blue-300' : ''
                    }`}
                  >
                    <td className="px-2 py-2 font-medium">
                      <div className="flex gap-1 items-center flex-wrap">
                        <span className="text-xs">
                          {new Date(day.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        {day.isToday && (
                          <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                            Today
                          </span>
                        )}
                        {day.dayType === 'predicted' && (
                          <Sun className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {day.etRange !== null ? (
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                              day.etRange === 'High'
                                ? 'bg-red-100 text-red-800'
                                : day.etRange === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {day.etRange}
                          </span>
                          {day.evapotranspiration !== null && (
                            <span className="text-xs text-gray-500">
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className={`font-medium text-xs ${
                            day.isRainfall ? 'text-blue-600' : 'text-gray-500'
                          }`}
                        >
                          {Number(day.rainfall).toFixed(1)}
                        </span>
                        {day.isRainfall && (
                          <CloudRain className="h-3 w-3 text-blue-500" />
                        )}
                        {!day.isToday && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                            forecast
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-blue-600 font-semibold text-xs">
                      {day.waterRequired.toLocaleString()}
                      {day.adjustedByFarmer && (
                        <span className="ml-1 text-xs text-orange-600">*</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-800 text-xs">{day.floodTimeHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IrrigationSchedule;