import React, { useState, useEffect, useRef } from 'react';
import { Satellite } from 'lucide-react';
import api, { getFarmsWithFarmerDetails, getFarmerProfile } from '../api';
import budData from './bud.json';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FertilizerEntry {
  date: string;
  stage: string;
  days: string;
  N_kg_acre: string;
  P_kg_acre: string;
  K_kg_acre: string;
  fertilizers?: {
    Urea_N_kg_per_acre: number;
    SuperPhosphate_P_kg_per_acre: number;
    Potash_K_kg_per_acre: number;
  };
  organic_inputs?: string[];
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
    console.log('📅 Starting date calculation with plantation date:', plantationDate);
    
    // Try different date parsing methods
    let plantation: Date;
    
    // Method 1: Direct parsing
    plantation = new Date(plantationDate);
    console.log('📅 Method 1 - Direct parsing:', plantation);
    
    // Method 2: Handle different date formats
    if (isNaN(plantation.getTime())) {
      console.log('⚠️ Method 1 failed, trying alternative parsing');
      // Try parsing as YYYY-MM-DD format
      const parts = plantationDate.split('-');
      if (parts.length === 3) {
        plantation = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        console.log('📅 Method 2 - Manual parsing:', plantation);
      } else {
        // Try parsing as DD/MM/YYYY format
        const parts2 = plantationDate.split('/');
        if (parts2.length === 3) {
          plantation = new Date(parseInt(parts2[2]), parseInt(parts2[1]) - 1, parseInt(parts2[0]));
          console.log('📅 Method 3 - DD/MM/YYYY parsing:', plantation);
        }
      }
    }
    
    const today = new Date();
    const diffTime = today.getTime() - plantation.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('📅 Date calculation results:');
    console.log('  - Plantation date string:', plantationDate);
    console.log('  - Plantation Date object:', plantation);
    console.log('  - Plantation timestamp:', plantation.getTime());
    console.log('  - Today:', today);
    console.log('  - Today timestamp:', today.getTime());
    console.log('  - Difference in ms:', diffTime);
    console.log('  - Days since plantation:', days);
    console.log('  - Is plantation valid?', !isNaN(plantation.getTime()));
    
    return days;
  };

  // Helper function to get current stage based on days
  const getCurrentStage = (days: number, stages: any[]): any => {
    console.log('🔍 Getting current stage for days:', days);
    console.log('🔍 Available stages:', stages.map(s => ({ stage: s.stage, days: s.days })));
    
    // Test with known values for debugging
    console.log('🧪 Testing stage ranges:');
    for (const stage of stages) {
      const daysRange = stage.days.replace(/[–-]/g, '-');
      const [minDays, maxDays] = daysRange.split('-').map((d: string) => parseInt(d.trim()));
      console.log(`🧪 Stage "${stage.stage}": ${minDays}-${maxDays}`);
      
      // Test specific values
      [50, 100, 150, 200, 250, 300].forEach(testDay => {
        const matches = testDay >= minDays && testDay <= maxDays;
        if (matches) {
          console.log(`🧪 Day ${testDay} matches "${stage.stage}"`);
        }
      });
    }
    
    for (const stage of stages) {
      // Handle both en-dash (–) and regular hyphen (-) in the days range
      const daysRange = stage.days.replace(/[–-]/g, '-'); // Normalize to regular hyphen
      const [minDays, maxDays] = daysRange.split('-').map((d: string) => parseInt(d.trim()));
      
      console.log(`🔍 Checking stage "${stage.stage}" with range ${minDays}-${maxDays} for days ${days}`);
      console.log(`🔍 Range check: ${days} >= ${minDays} && ${days} <= ${maxDays} = ${days >= minDays && days <= maxDays}`);
      
      if (days >= minDays && days <= maxDays) {
        console.log(`✅ Found matching stage: ${stage.stage}`);
        return stage;
      }
    }
    
    console.log('⚠️ No matching stage found, returning last stage');
    console.log('⚠️ This means the days value is outside all stage ranges');
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
    console.log('🌱 Generating 7 days data with plantation date:', plantationDate);
    
    const daysSincePlantation = calculateDaysSincePlantation(plantationDate);
    console.log('📅 Days since plantation:', daysSincePlantation);

    const sevenDaysData: FertilizerEntry[] = [];
    const currentDate = new Date();

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setDate(currentDate.getDate() + i);
      
      // Calculate days from plantation for this specific day
      const targetDays = daysSincePlantation + i;
      console.log(`📅 Day ${i}: Target days from plantation = ${targetDays}`);
      
      const currentStage = getCurrentStage(targetDays, fertilizerSchedule.stages);
      console.log(`🌱 Day ${i}: Stage determined = ${currentStage.stage}`);
      
      sevenDaysData.push({
        date: targetDate.toLocaleDateString('en-GB'),
        stage: currentStage.stage,
        days: `${targetDays}`,
        N_kg_acre: currentStage.N_kg_acre,
        P_kg_acre: currentStage.P_kg_acre,
        K_kg_acre: currentStage.K_kg_acre,
        fertilizers: currentStage.fertilizers,
        organic_inputs: currentStage.organic_inputs,
      });
    }

    console.log('✅ Generated 7 days data:', sevenDaysData);
    return sevenDaysData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 Fetching complete farmer data using getFarmsWithFarmerDetails()...');
        
        // First, get the current user data to filter farms
        const currentUserResponse = await api.get('/users/me/');
        const currentUser = currentUserResponse.data;
        console.log('👤 Current user data:', currentUser);
        console.log('👤 Current user ID:', currentUser.id);
        console.log('👤 Current user role:', currentUser.role);
        console.log('👤 Current user role_id:', currentUser.role_id);
        
        // Use the API that includes all farmer registration data
        const farmsResponse = await getFarmsWithFarmerDetails();
        console.log('📊 Farms with farmer details response:', farmsResponse);
        console.log('📊 Response data structure:', JSON.stringify(farmsResponse.data, null, 2));
        console.log('📊 Response data type:', typeof farmsResponse.data);
        console.log('📊 Response data keys:', farmsResponse.data ? Object.keys(farmsResponse.data) : 'No keys');
        
        if (!farmsResponse || !farmsResponse.data) {
          throw new Error('Failed to fetch farms data');
        }
        
        const farmsData = farmsResponse.data;
        console.log('📊 Farms data:', farmsData);
        console.log('📊 Farms data type:', typeof farmsData);
        console.log('📊 Farms data keys:', Object.keys(farmsData));
        
        // Extract farms array from response
        let allFarms = [];
        if (Array.isArray(farmsData)) {
          allFarms = farmsData;
        } else if (farmsData.results && Array.isArray(farmsData.results)) {
          allFarms = farmsData.results;
        } else if (farmsData.farms && Array.isArray(farmsData.farms)) {
          allFarms = farmsData.farms;
        } else if (farmsData.data && Array.isArray(farmsData.data)) {
          allFarms = farmsData.data;
        }
        
        console.log('📈 Total farms found:', allFarms.length);
        console.log('📊 All farms data:', allFarms);
        
        // Filter farms based on user role and ownership
        const farms = allFarms.filter((farm: any) => {
          // Check multiple possible fields for farmer ownership
          const farmOwnerId = farm.farm_owner?.id;
          const farmerId = farm.farmer_id;
          const userId = farm.user_id;
          const plotFarmerId = farm.plot?.farmer?.id;
          const createdById = farm.created_by?.id;
          
          let matches = false;
          
          // Role-based filtering logic
          if (currentUser.role === 'farmer' || currentUser.role_id === 1) {
            // For farmers: check if they own the farm or if it was created for them
            matches = farmOwnerId == currentUser.id || 
                     farmerId == currentUser.id || 
                     userId == currentUser.id ||
                     plotFarmerId == currentUser.id;
          } else if (currentUser.role === 'fieldofficer' || currentUser.role_id === 2) {
            // For field officers: check if they created the farm (registered farmers under them)
            matches = createdById == currentUser.id;
          } else if (currentUser.role === 'manager' || currentUser.role_id === 3) {
            // For managers: check if they created the farm or if it belongs to their field officers
            matches = createdById == currentUser.id || 
                     farmOwnerId == currentUser.id;
          } else if (currentUser.role === 'owner' || currentUser.role_id === 4) {
            // For owners: can see all farms
            matches = true;
          } else {
            // Fallback: check all ownership fields
            matches = farmOwnerId == currentUser.id || 
                     farmerId == currentUser.id || 
                     userId == currentUser.id ||
                     plotFarmerId == currentUser.id ||
                     createdById == currentUser.id;
          }
          
          console.log(`🔍 Farm ${farm.id} ownership check for ${currentUser.role}:`);
          console.log(`  - farm_owner.id: ${farmOwnerId}`);
          console.log(`  - farmer_id: ${farmerId}`);
          console.log(`  - user_id: ${userId}`);
          console.log(`  - plot.farmer.id: ${plotFarmerId}`);
          console.log(`  - created_by.id: ${createdById}`);
          console.log(`  - current_user.id: ${currentUser.id}`);
          console.log(`  - current_user.role: ${currentUser.role}`);
          console.log(`  - matches: ${matches}`);
          
          return matches;
        });
        
        console.log('🌾 Filtered farms for current user:', farms.length);
        console.log('🌾 Current user farms:', farms);
        
        if (farms.length === 0) {
          console.log('⚠️ No farms found for current user, trying getFarmerProfile API...');
          
          // Fallback to getFarmerProfile API for current user
          try {
            const profileResponse = await getFarmerProfile();
            console.log('📊 Farmer profile response:', profileResponse);
            
            if (profileResponse && profileResponse.plots && profileResponse.plots.length > 0) {
              // Use the first plot's farm data
              const firstPlot = profileResponse.plots[0];
        const firstFarm = firstPlot.farms[0];
              
              console.log('🌾 Using farm data from profile:', firstFarm);
              
              // Extract data from profile
              const plantationDate = firstFarm.plantation_date || 
                                   firstFarm.planting_date || 
                                   firstFarm.created_at?.split('T')[0] || 
                                   new Date().toISOString().split('T')[0];
              
              const plantingMethod = firstFarm.crop_type?.planting_method || 
                                   firstFarm.planting_method || 
                                   firstFarm.plantation_method || 
                                   '3-bud';
              
              const plantationType = firstFarm.crop_type?.plantation_type || 
                                   firstFarm.plantation_type || 
                                   firstFarm.planting_type || 
                                   'N/A';
              
              console.log('✅ Extracted from profile:');
              console.log('  - Plantation date:', plantationDate);
              console.log('  - Planting method:', plantingMethod);
              console.log('  - Plantation type:', plantationType);
              
              // Set farm data for display
              setFarmData({
                id: firstFarm.id || 0,
                farm_uid: firstFarm.farm_uid || firstFarm.id || 'PROFILE-FARM',
                plantation_type: plantationType,
                planting_method: plantingMethod,
                created_at: plantationDate,
                crop_type_name: firstFarm.crop_type?.crop_type || 
                               firstFarm.crop_type_name || 
                               'Sugarcane',
                area_size: firstFarm.area_size || '1.0'
              });
              
              // Generate fertilizer data
              const fertilizerData = generateSevenDaysData(plantationDate, plantingMethod);
              setData(fertilizerData);
              setIsLoading(false);
              return;
            }
          } catch (profileError) {
            console.error('❌ getFarmerProfile also failed:', profileError);
          }
          
          throw new Error('No farms found for the current user');
        }
        
        // Use the first farm from the farms array
        const firstFarm = farms[0];
        console.log('🔍 First farm:', JSON.stringify(firstFarm, null, 2));
        console.log('🔍 First farm type:', typeof firstFarm);
        console.log('🔍 First farm keys:', firstFarm ? Object.keys(firstFarm) : 'No keys');
        
        // Check if farm has farmer details
        if (firstFarm.farmer) {
          console.log('📊 Farmer details in farm:', firstFarm.farmer);
          console.log('📊 Farmer details keys:', Object.keys(firstFarm.farmer));
        }
        
        // Check if farm has plot details
        if (firstFarm.plot) {
          console.log('📊 Plot details in farm:', firstFarm.plot);
          console.log('📊 Plot details keys:', Object.keys(firstFarm.plot));
        }
        
        // Check if farm has irrigation details
        if (firstFarm.irrigation) {
          console.log('📊 Irrigation details in farm:', firstFarm.irrigation);
          console.log('📊 Irrigation details keys:', Object.keys(firstFarm.irrigation));
        }
        
        // Extract data from the farm - based on the getFarmsWithFarmerDetails API structure
        console.log('🔍 Extracting farm data...');
        console.log('🔍 Available farm fields:', firstFarm ? Object.keys(firstFarm) : 'No farm data');
        
        // Extract plantation date from various possible fields
        const plantationDate = firstFarm.plantation_date || 
                             firstFarm.planting_date || 
                             firstFarm.created_at?.split('T')[0] || 
                             firstFarm.date_created?.split('T')[0] ||
                             new Date().toISOString().split('T')[0];
        
        // Extract planting method from the new API structure (nested in crop_type)
        const plantingMethod = firstFarm.crop_type?.planting_method || 
                             firstFarm.planting_method || 
                             firstFarm.plantation_method || 
                             firstFarm.method || 
                             firstFarm.planting_technique ||
                             '3-bud';
        
        // Extract plantation type from the new API structure (nested in crop_type)
        const plantationType = firstFarm.crop_type?.plantation_type || 
                             firstFarm.plantation_type || 
                             firstFarm.planting_type || 
                             firstFarm.crop_plantation_type ||
                             'N/A';
        
        console.log('✅ Extracted data:');
        console.log('  - Plantation date:', plantationDate);
        console.log('  - Planting method:', plantingMethod);
        console.log('  - Plantation type:', plantationType);
        console.log('  - Raw created_at:', firstFarm.created_at);
        console.log('  - Raw plantation_date:', firstFarm.plantation_date);
        console.log('  - Raw planting_date:', firstFarm.planting_date);
        console.log('  - Raw crop_type object:', firstFarm.crop_type);
        console.log('  - Raw crop_type.planting_method:', firstFarm.crop_type?.planting_method);
        console.log('  - Raw crop_type.plantation_type:', firstFarm.crop_type?.plantation_type);
        console.log('  - Raw crop_type.crop_type:', firstFarm.crop_type?.crop_type);
        console.log('  - Raw farm_owner:', firstFarm.farm_owner);
        console.log('  - Raw farm_owner.username:', firstFarm.farm_owner?.username);
        
        if (!plantationDate || !plantingMethod) {
          throw new Error('Plantation date or planting method not found in farm data');
        }
        
        const finalPlantationDate = plantationDate;
        const finalPlantingMethod = plantingMethod;
        const finalPlantationType = plantationType;

        // Set farm data for display - using complete farmer registration data
        setFarmData({
          id: firstFarm.id || 0,
          farm_uid: firstFarm.farm_uid || firstFarm.id || 'REAL-FARM',
          plantation_type: finalPlantationType,
          planting_method: finalPlantingMethod,
          created_at: finalPlantationDate,
          crop_type_name: firstFarm.crop_type?.crop_type || 
                         firstFarm.crop_type_name || 
                         (typeof firstFarm.crop_type === 'string' ? firstFarm.crop_type : firstFarm.crop_type?.name) || 
                         'Sugarcane',
          area_size: firstFarm.area_size || '1.0'
        });
        
        console.log('✅ Farm data set for display:', {
          id: firstFarm.id || 0,
          farm_uid: firstFarm.farm_uid || firstFarm.id || 'REAL-FARM',
          plantation_type: finalPlantationType,
          planting_method: finalPlantingMethod,
          created_at: finalPlantationDate,
          crop_type_name: firstFarm.crop_type_name || 
                         (typeof firstFarm.crop_type === 'string' ? firstFarm.crop_type : firstFarm.crop_type?.name) || 
                         'Sugarcane',
          area_size: firstFarm.area_size || '1.0'
        });

        // Generate 7 days fertilizer data
        console.log('🚀 About to generate fertilizer data with:');
        console.log('  - Plantation Date:', finalPlantationDate);
        console.log('  - Planting Method:', finalPlantingMethod);
        console.log('  - Plantation Date Type:', typeof finalPlantationDate);
        console.log('  - Plantation Date Length:', finalPlantationDate?.length);
        
        // Test the plantation date parsing
        const testDate = new Date(finalPlantationDate);
        console.log('  - Test Date Object:', testDate);
        console.log('  - Test Date Valid:', !isNaN(testDate.getTime()));
        console.log('  - Test Date String:', testDate.toString());
        
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
          
        </button>
      </div>

      {/* {farmData && (
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
      )} */}

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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Next 7 Days Fertilizer Schedule</h3>
            {/* <p className="text-sm text-gray-600">Showing first and last day (same values for all 7 days)</p> */}
          </div>
          <table className="min-w-full bg-green-400 border border-gray-200">
            <thead className="bg-green-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-weight-bold text-black-500 border-b">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-weight-bold text-black-500 border-b">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-sm font-weight-bold text-black-500 border-b">
                  Nutrients(kg/acre)
                </th>
                <th className="px-6 py-3 text-left text-sm font-weight-bold text-black-500 border-b">
                  Chemical Inputs
                </th>
                <th className="px-6 py-3 text-left text-sm font-weight-bold text-black-500 border-b">
                  Organic Inputs
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* First row - show actual data */}
              {data.length > 0 && (
                <tr className="bg-white">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[0].date}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {/* {data[0].stage} */}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    N : {data[0].N_kg_acre}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[0].fertilizers && (
                      <div className="text-sm font-normal">
                        <div>Urea: {data[0].fertilizers?.Urea_N_kg_per_acre} kg</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[0].organic_inputs && (
                      <div className="text-sm font-normal">
                        {data[0].organic_inputs?.map((input, index) => (
                          <div key={index}>{index === 0 ? input : ''}</div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              
              {/* Middle rows - show dots if there are more than 2 days */}
              {data.length > 2 && (
                <tr className="bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    To
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[0].stage}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    P : {data[0].P_kg_acre}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    <div className="text-sm font-normal">
                      SuperPhosphate: {data[0].fertilizers?.SuperPhosphate_P_kg_per_acre} kg
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[0].organic_inputs && (
                      <div className="text-sm font-normal">
                        {data[0].organic_inputs?.map((input, index) => (
                          <div key={index}>{index === 1 ? input : ''}</div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              
              {/* Last row - show actual data if there are more than 1 day */}
              {data.length > 1 && (
                <tr className="bg-white">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[data.length - 1].date}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {/* {data[data.length - 1].stage} */}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    K : {data[0].K_kg_acre}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[data.length - 1].fertilizers && (
                      <div className="text-sm font-normal">
                        <div>Muriate of Potash: {data[data.length - 1].fertilizers?.Potash_K_kg_per_acre} kg</div>
                      </div>  
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-normal text-gray-900 border-b">
                    {data[0].organic_inputs && (
                      <div className="text-sm font-normal">
                        {data[0].organic_inputs?.map((input, index) => (
                          <div key={index}>{index === 2 ? input : ''}</div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FertilizerTable;