import React, { useState, useEffect, useRef } from 'react';
import { Satellite } from 'lucide-react';
import { getFarmerProfile } from '../api';
import budData from './bud.json';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FertilizerEntry {
  date: string;
  stage: string;
  days: string;
  N_kg_ha: string;
  P_kg_ha: string;
  K_kg_ha: string;
}

interface FarmData {
  id: number;
  farm_uid: string;
  plantation_type: string;
  planting_method: string;
  created_at: string;
  crop_type_name: string;
  area_size: string;
}

const FertilizerTable: React.FC = () => {
  const [data, setData] = useState<FertilizerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Helper function to calculate days since plantation
  const calculateDaysSincePlantation = (plantationDate: string): number => {
    const plantation = new Date(plantationDate);
    const today = new Date();
    const diffTime = today.getTime() - plantation.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper function to get current stage based on days
  const getCurrentStage = (days: number, stages: any[]): any => {
    for (const stage of stages) {
      const [minDays, maxDays] = stage.days.split('–').map((d: string) => parseInt(d.trim()));
      if (days >= minDays && days <= maxDays) {
        return stage;
      }
    }
    // Return the last stage if no match found
    return stages[stages.length - 1];
  };

  // Helper function to generate 7 days of data
  const generateSevenDaysData = (plantationDate: string, plantingMethod: string): FertilizerEntry[] => {
    console.log('🔍 Generating fertilizer data for:', { plantationDate, plantingMethod });
    
    // Normalize the planting method to match bud.json format
    const normalizedMethod = plantingMethod
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    console.log('🔍 Normalized method:', normalizedMethod);
    
    // Find the fertilizer schedule for this planting method
    const fertilizerSchedule = budData.fertilizer_schedule.find(schedule => {
      const scheduleMethod = schedule.method
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      console.log(`🔍 Comparing: "${normalizedMethod}" vs "${scheduleMethod}"`);
      return scheduleMethod === normalizedMethod;
    });
    
    if (!fertilizerSchedule) {
      console.log('❌ No fertilizer schedule found for method:', plantingMethod);
      console.log('📋 Available methods:', budData.fertilizer_schedule.map(s => s.method));
      
      // Use the first available schedule as fallback
      const fallbackSchedule = budData.fertilizer_schedule[0];
      if (fallbackSchedule) {
        console.log('✅ Using fallback schedule:', fallbackSchedule.method);
        return generateSevenDaysDataWithSchedule(plantationDate, fallbackSchedule);
      } else {
        throw new Error(`No fertilizer schedules available in bud.json`);
      }
    }
    
    console.log('✅ Found fertilizer schedule:', fertilizerSchedule.method);
    return generateSevenDaysDataWithSchedule(plantationDate, fertilizerSchedule);
  };

  // Helper function to generate data with a specific schedule
  const generateSevenDaysDataWithSchedule = (plantationDate: string, fertilizerSchedule: any): FertilizerEntry[] => {
    const daysSincePlantation = calculateDaysSincePlantation(plantationDate);

    const sevenDaysData: FertilizerEntry[] = [];
    const currentDate = new Date();

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setDate(currentDate.getDate() + i);
      
      const targetDays = daysSincePlantation + i;
      const currentStage = getCurrentStage(targetDays, fertilizerSchedule.stages);
      
      sevenDaysData.push({
        date: targetDate.toLocaleDateString('en-GB'),
        stage: currentStage.stage,
        days: `${targetDays}`,
        N_kg_ha: currentStage.N_kg_ha,
        P_kg_ha: currentStage.P_kg_ha,
        K_kg_ha: currentStage.K_kg_ha,
      });
    }

    return sevenDaysData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 Fetching farmer profile data using getFarmerProfile()...');
        
        // Use the correct API function that has the data
        const profileData = await getFarmerProfile();
        console.log('📊 Farmer profile response:', profileData);
        
        if (!profileData || !profileData.plots || profileData.plots.length === 0) {
          throw new Error('No plots found in farmer profile');
        }
        
        // Get the first plot and its farm data
        const firstPlot = profileData.plots[0];
        console.log('🔍 First plot:', JSON.stringify(firstPlot, null, 2));
        
        if (!firstPlot.farms || firstPlot.farms.length === 0) {
          throw new Error('No farms found in the first plot');
        }
        
        const firstFarm = firstPlot.farms[0];
        console.log('🔍 First farm:', JSON.stringify(firstFarm, null, 2));
        
        // Extract data from the farm - based on the actual API response structure
        const plantationDate = firstFarm.created_at || firstFarm.plantation_date || firstFarm.planting_date || firstFarm.date_created || firstFarm.registration_date;
        const plantingMethod = firstFarm.planting_method || firstFarm.plantation_method || firstFarm.method || firstFarm.planting_technique;
        const plantationType = firstFarm.plantation_type || firstFarm.planting_type || firstFarm.crop_plantation_type;
        
        console.log('✅ Extracted data:');
        console.log('  - Plantation date:', plantationDate);
        console.log('  - Planting method:', plantingMethod);
        console.log('  - Plantation type:', plantationType);
        
        if (!plantationDate || !plantingMethod) {
          throw new Error('Plantation date or planting method not found in farm data');
        }
        
        const finalPlantationDate = plantationDate;
        const finalPlantingMethod = plantingMethod;
        const finalPlantationType = plantationType || 'N/A';

        // Set farm data for display
        setFarmData({
          id: firstFarm.id || 0,
          farm_uid: firstFarm.farm_uid,
          plantation_type: finalPlantationType,
          planting_method: finalPlantingMethod,
          created_at: finalPlantationDate,
          crop_type_name: firstFarm.crop_type || 'Sugarcane',
          area_size: firstFarm.area_size || 'N/A'
        });

        // Generate 7 days fertilizer data
        const fertilizerData = generateSevenDaysData(
          finalPlantationDate,
          finalPlantingMethod
        );

        setData(fertilizerData);
        setIsLoading(false);
      } catch (error: any) {
        console.error('Failed to load fertilizer data:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadPDF = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 10, width, height);
      pdf.save('fertilizer_table.pdf');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Fertilizer Schedule</h2>
        <button
          onClick={handleDownloadPDF}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>
      </div>

      {farmData && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Farm Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Farm ID:</span>
              <span className="ml-2 text-gray-800">{farmData.farm_uid}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Plantation Date:</span>
              <span className="ml-2 text-gray-800">{new Date(farmData.created_at).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Planting Method:</span>
              <span className="ml-2 text-gray-800">{farmData.planting_method}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Plantation Type:</span>
              <span className="ml-2 text-gray-800">{farmData.plantation_type}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Crop Type:</span>
              <span className="ml-2 text-gray-800">{farmData.crop_type_name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Area Size:</span>
              <span className="ml-2 text-gray-800">{farmData.area_size} acres</span>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Satellite className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading fertilizer data...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">Error loading fertilizer data</div>
          <div className="text-gray-600 text-sm">{error}</div>
        </div>
      ) : (
        <div ref={tableRef} className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  N (kg/ha)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  P (kg/ha)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  K (kg/ha)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b">
                    {row.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b">
                    {row.stage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b">
                    {row.days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b">
                    {row.N_kg_ha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b">
                    {row.P_kg_ha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b">
                    {row.K_kg_ha}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FertilizerTable;