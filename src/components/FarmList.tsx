import React, { useState, useEffect } from 'react';
import { Download, Edit, Search, Trash2, Loader2, Eye, X, User, Ruler, Map, Droplets } from 'lucide-react';
import { getRecentFarmers } from '../api';

const ITEMS_PER_PAGE = 5;

interface Farmer {
  id: number;
  farmer_name: string;
  phone_number: string;
  area: number;
  plantation_type: string;
  variety_type: string;
  farmer?: {
    id: number;
    username: string;
    email: string;
    phone_number?: string;
  };
  // Additional fields for detailed view
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string;
  village?: string;
  state?: string;
  district?: string;
  taluka?: string;
  created_at?: string;
  plots?: any[];
  farms?: any[];
  irrigation?: any;
}
interface FarmlistProps {
  users?: Farmer[];
  setUsers?: React.Dispatch<React.SetStateAction<Farmer[]>>;
}

export const FarmList: React.FC<FarmlistProps> = ({ users: propUsers, setUsers: propSetUsers }) => {
  const [users, setUsers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFarmers, setSelectedFarmers] = useState<Set<number>>(new Set());

  // Fetch farms data from API
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getRecentFarmers();
        console.log('API Response:', response.data);
        
        let farmersData = response.data;
        
        // Handle the new response structure: { farmers: [...] }
        if (farmersData && farmersData.farmers && Array.isArray(farmersData.farmers)) {
          farmersData = farmersData.farmers;
        } else if (farmersData && farmersData.results && Array.isArray(farmersData.results)) {
          // If response has pagination structure like { results: [...], count: ... }
          farmersData = farmersData.results;
        } else if (farmersData && farmersData.data && Array.isArray(farmersData.data)) {
          // If response has nested data structure
          farmersData = farmersData.data;
        } else if (!Array.isArray(farmersData)) {
          console.error('Expected array but got:', typeof farmersData, farmersData);
          setError('Invalid data format received from server');
          return;
        }
        
        // Transform the data to match our interface based on new API response structure
        const transformedData: Farmer[] = farmersData.map((farmer: any) => {
          console.log('Processing farmer:', farmer.username, 'Farms:', farmer.farms);
          
          // Get the first farm from the farmer's farms array or from plots
          let firstFarm = null;
          let firstIrrigation = null;
          
          // Try to get farm data from farmer.farms first
          if (farmer.farms && farmer.farms.length > 0) {
            firstFarm = farmer.farms[0];
            firstIrrigation = firstFarm.irrigations && firstFarm.irrigations.length > 0 ? firstFarm.irrigations[0] : null;
          }
          // If not found, try to get from plots[0].farms
          else if (farmer.plots && farmer.plots.length > 0 && farmer.plots[0].farms && farmer.plots[0].farms.length > 0) {
            firstFarm = farmer.plots[0].farms[0];
            firstIrrigation = firstFarm.irrigations && firstFarm.irrigations.length > 0 ? firstFarm.irrigations[0] : null;
          }
          
          console.log('First farm data:', firstFarm);
          console.log('First irrigation data:', firstIrrigation);
          
          const transformed = {
            id: farmer.id,
            farmer_name: farmer.username || `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || 'N/A',
            phone_number: farmer.phone_number || 'N/A',
            area: firstFarm ? parseFloat(firstFarm.area_size) || 0 : 0,
            plantation_type: firstFarm?.plantation_type || 'N/A',
            variety_type: firstFarm?.crop_type || 'N/A',
            farmer: {
              id: farmer.id,
              username: farmer.username,
              email: farmer.email,
              phone_number: farmer.phone_number
            },
            // Additional fields for detailed view
            first_name: farmer.first_name,
            last_name: farmer.last_name,
            email: farmer.email,
            address: farmer.address,
            village: farmer.village,
            state: farmer.state,
            district: farmer.district,
            taluka: farmer.taluka,
            created_at: farmer.date_joined || farmer.created_at,
            plots: farmer.plots,
            farms: farmer.farms,
            // Store irrigation data for easy access
            irrigation: firstIrrigation
          };
          
          console.log('Transformed farmer data:', transformed);
          return transformed;
        });
        
        console.log('Transformed data:', transformedData);
        setUsers(transformedData);
        if (propSetUsers) {
          propSetUsers(transformedData);
        }
      } catch (err: any) {
        console.error('Error fetching farms:', err);
        setError(err.message || 'Failed to fetch farms data');
      } finally {
        setLoading(false);
      }
    };

    fetchFarms();
  }, [propSetUsers]);

  // Use prop users if provided, otherwise use state users
  const displayUsers = propUsers || users;

  const handleEdit = (id: number) => {
    console.log('Edit farm:', id);
  };

  const handleDelete = (id: number) => {
    const updatedUsers = displayUsers.filter((user) => user.id !== id);
    setUsers(updatedUsers);
    if (propSetUsers) {
      propSetUsers(updatedUsers);
    }
  };

  const handleViewDetails = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFarmer(null);
  };

  const handleSelectFarmer = (farmerId: number) => {
    setSelectedFarmers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(farmerId)) {
        newSet.delete(farmerId);
      } else {
        newSet.add(farmerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFarmers.size === paginatedData.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(paginatedData.map(farmer => farmer.id)));
    }
  };

  const handleDownloadFarmer = (farmer: Farmer) => {
    // Create comprehensive CSV data for the farmer with proper columns
    const csvData = [];
    
    // Add header row with all column names
    csvData.push([
      'Farmer ID',
      'Farmer Name',
      'First Name',
      'Last Name',
      'Email',
      'Phone Number',
      'Address',
      'Village',
      'State',
      'District',
      'Taluka',
      'Created Date',
      'Total Area (acres)',
      'Total Area (hectares)',
      'Plantation Type',
      'Variety Type',
      'Irrigation Type',
      'Emitters Count',
      'Flow Rate (LPH)',
      'Plants Per Acre',
      'Plot ID',
      'Plot Number',
      'Gat Number',
      'Plot Area Size (acres)',
      'Plot Village',
      'Plot State',
      'Plot District',
      'Plot Taluka',
      'PIN Code',
      'Country',
      'Plot Created At',
      'Farm ID',
      'Farm UID',
      'Farm Area Size (acres)',
      'Crop Type',
      'Farm Plantation Type',
      'Planting Method',
      'Soil Type',
      'Farm Address',
      'Farm Created At',
      'Irrigation Type (Farm)',
      'Emitters Count (Farm)',
      'Flow Rate LPH (Farm)',
      'Plants Per Acre (Farm)',
      'Distance Motor to Plot (m)',
      'Motor Horsepower',
      'Pipe Width (inches)',
      'Irrigation Status'
    ]);
    
    // Add farmer data row
    const farmerRow = [
      farmer.id,
      farmer.farmer_name,
      farmer.first_name || 'N/A',
      farmer.last_name || 'N/A',
      farmer.email || 'N/A',
      farmer.phone_number,
      farmer.address || 'N/A',
      farmer.village || 'N/A',
      farmer.state || 'N/A',
      farmer.district || 'N/A',
      farmer.taluka || 'N/A',
      farmer.created_at ? new Date(farmer.created_at).toLocaleDateString('en-GB') : 'N/A',
      farmer.area,
      (farmer.area * 0.404686).toFixed(2),
      farmer.plantation_type,
      farmer.variety_type,
      farmer.irrigation?.irrigation_type || 'N/A',
      farmer.irrigation?.emitters_count || 'N/A',
      farmer.irrigation?.flow_rate_lph || 'N/A',
      farmer.irrigation?.plants_per_acre || 'N/A',
      '', // Plot ID - will be filled if plots exist
      '', // Plot Number
      '', // Gat Number
      '', // Plot Area Size
      '', // Plot Village
      '', // Plot State
      '', // Plot District
      '', // Plot Taluka
      '', // PIN Code
      '', // Country
      '', // Plot Created At
      '', // Farm ID
      '', // Farm UID
      '', // Farm Area Size
      '', // Crop Type
      '', // Farm Plantation Type
      '', // Planting Method
      '', // Soil Type
      '', // Farm Address
      '', // Farm Created At
      '', // Irrigation Type (Farm)
      '', // Emitters Count (Farm)
      '', // Flow Rate LPH (Farm)
      '', // Plants Per Acre (Farm)
      '', // Distance Motor to Plot
      '', // Motor Horsepower
      '', // Pipe Width
      ''  // Irrigation Status
    ];
    
    // If no plots, add the basic farmer row
    if (!farmer.plots || farmer.plots.length === 0) {
      csvData.push(farmerRow);
    } else {
      // Add detailed rows for each plot and farm
      farmer.plots.forEach((plot: any) => {
        if (plot.farms && plot.farms.length > 0) {
          plot.farms.forEach((farm: any) => {
            if (farm.irrigations && farm.irrigations.length > 0) {
              farm.irrigations.forEach((irrigation: any) => {
                const detailedRow = [...farmerRow];
                // Fill plot data
                detailedRow[20] = plot.id || 'N/A'; // Plot ID
                detailedRow[21] = plot.plot_number || 'N/A'; // Plot Number
                detailedRow[22] = plot.gat_number || 'N/A'; // Gat Number
                detailedRow[23] = plot.area_size || 'N/A'; // Plot Area Size
                detailedRow[24] = plot.village || 'N/A'; // Plot Village
                detailedRow[25] = plot.state || 'N/A'; // Plot State
                detailedRow[26] = plot.district || 'N/A'; // Plot District
                detailedRow[27] = plot.taluka || 'N/A'; // Plot Taluka
                detailedRow[28] = plot.pin_code || 'N/A'; // PIN Code
                detailedRow[29] = plot.country || 'N/A'; // Country
                detailedRow[30] = plot.created_at ? new Date(plot.created_at).toLocaleDateString('en-GB') : 'N/A'; // Plot Created At
                
                // Fill farm data
                detailedRow[31] = farm.id || 'N/A'; // Farm ID
                detailedRow[32] = farm.farm_uid || 'N/A'; // Farm UID
                detailedRow[33] = farm.area_size || 'N/A'; // Farm Area Size
                detailedRow[34] = farm.crop_type || 'N/A'; // Crop Type
                detailedRow[35] = farm.plantation_type || 'N/A'; // Farm Plantation Type
                detailedRow[36] = farm.planting_method || 'N/A'; // Planting Method
                detailedRow[37] = farm.soil_type || 'N/A'; // Soil Type
                detailedRow[38] = farm.address || 'N/A'; // Farm Address
                detailedRow[39] = farm.created_at ? new Date(farm.created_at).toLocaleDateString('en-GB') : 'N/A'; // Farm Created At
                
                // Fill irrigation data
                detailedRow[40] = irrigation.irrigation_type || 'N/A'; // Irrigation Type (Farm)
                detailedRow[41] = irrigation.emitters_count || 'N/A'; // Emitters Count (Farm)
                detailedRow[42] = irrigation.flow_rate_lph || 'N/A'; // Flow Rate LPH (Farm)
                detailedRow[43] = irrigation.plants_per_acre || 'N/A'; // Plants Per Acre (Farm)
                detailedRow[44] = irrigation.distance_motor_to_plot_m || 'N/A'; // Distance Motor to Plot
                detailedRow[45] = irrigation.motor_horsepower || 'N/A'; // Motor Horsepower
                detailedRow[46] = irrigation.pipe_width_inches || 'N/A'; // Pipe Width
                detailedRow[47] = irrigation.status ? 'Active' : 'Inactive'; // Irrigation Status
                
                csvData.push(detailedRow);
              });
            } else {
              // No irrigation data, just farm data
              const farmRow = [...farmerRow];
              // Fill plot data
              farmRow[20] = plot.id || 'N/A';
              farmRow[21] = plot.plot_number || 'N/A';
              farmRow[22] = plot.gat_number || 'N/A';
              farmRow[23] = plot.area_size || 'N/A';
              farmRow[24] = plot.village || 'N/A';
              farmRow[25] = plot.state || 'N/A';
              farmRow[26] = plot.district || 'N/A';
              farmRow[27] = plot.taluka || 'N/A';
              farmRow[28] = plot.pin_code || 'N/A';
              farmRow[29] = plot.country || 'N/A';
              farmRow[30] = plot.created_at ? new Date(plot.created_at).toLocaleDateString('en-GB') : 'N/A';
              
              // Fill farm data
              farmRow[31] = farm.id || 'N/A';
              farmRow[32] = farm.farm_uid || 'N/A';
              farmRow[33] = farm.area_size || 'N/A';
              farmRow[34] = farm.crop_type || 'N/A';
              farmRow[35] = farm.plantation_type || 'N/A';
              farmRow[36] = farm.planting_method || 'N/A';
              farmRow[37] = farm.soil_type || 'N/A';
              farmRow[38] = farm.address || 'N/A';
              farmRow[39] = farm.created_at ? new Date(farm.created_at).toLocaleDateString('en-GB') : 'N/A';
              
              csvData.push(farmRow);
            }
          });
        } else {
          // No farms, just plot data
          const plotRow = [...farmerRow];
          plotRow[20] = plot.id || 'N/A';
          plotRow[21] = plot.plot_number || 'N/A';
          plotRow[22] = plot.gat_number || 'N/A';
          plotRow[23] = plot.area_size || 'N/A';
          plotRow[24] = plot.village || 'N/A';
          plotRow[25] = plot.state || 'N/A';
          plotRow[26] = plot.district || 'N/A';
          plotRow[27] = plot.taluka || 'N/A';
          plotRow[28] = plot.pin_code || 'N/A';
          plotRow[29] = plot.country || 'N/A';
          plotRow[30] = plot.created_at ? new Date(plot.created_at).toLocaleDateString('en-GB') : 'N/A';
          
          csvData.push(plotRow);
        }
      });
    }
    
    // Convert to CSV string
    const csvContent = csvData
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${farmer.farmer_name.replace(/\s+/g, '_')}_Farm_Details.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDownload = () => {
    if (selectedFarmers.size === 0) {
      alert('Please select at least one farmer to download.');
      return;
    }

    // Get selected farmers data
    const selectedFarmersData = displayUsers.filter(farmer => selectedFarmers.has(farmer.id));
    
    // Create comprehensive CSV data for all selected farmers with proper columns
    const csvData = [];
    
    // Add header row with all column names
    csvData.push([
      'Farmer ID',
      'Farmer Name',
      'First Name',
      'Last Name',
      'Email',
      'Phone Number',
      'Address',
      'Village',
      'State',
      'District',
      'Taluka',
      'Created Date',
      'Total Area (acres)',
      'Total Area (hectares)',
      'Plantation Type',
      'Variety Type',
      'Irrigation Type',
      'Emitters Count',
      'Flow Rate (LPH)',
      'Plants Per Acre',
      'Plot ID',
      'Plot Number',
      'Gat Number',
      'Plot Area Size (acres)',
      'Plot Village',
      'Plot State',
      'Plot District',
      'Plot Taluka',
      'PIN Code',
      'Country',
      'Plot Created At',
      'Farm ID',
      'Farm UID',
      'Farm Area Size (acres)',
      'Crop Type',
      'Farm Plantation Type',
      'Planting Method',
      'Soil Type',
      'Farm Address',
      'Farm Created At',
      'Irrigation Type (Farm)',
      'Emitters Count (Farm)',
      'Flow Rate LPH (Farm)',
      'Plants Per Acre (Farm)',
      'Distance Motor to Plot (m)',
      'Motor Horsepower',
      'Pipe Width (inches)',
      'Irrigation Status'
    ]);
    
    // Process each selected farmer
    selectedFarmersData.forEach((farmer) => {
      // Create base farmer row
      const farmerRow = [
        farmer.id,
        farmer.farmer_name,
        farmer.first_name || 'N/A',
        farmer.last_name || 'N/A',
        farmer.email || 'N/A',
        farmer.phone_number,
        farmer.address || 'N/A',
        farmer.village || 'N/A',
        farmer.state || 'N/A',
        farmer.district || 'N/A',
        farmer.taluka || 'N/A',
        farmer.created_at ? new Date(farmer.created_at).toLocaleDateString('en-GB') : 'N/A',
        farmer.area,
        (farmer.area * 0.404686).toFixed(2),
        farmer.plantation_type,
        farmer.variety_type,
        farmer.irrigation?.irrigation_type || 'N/A',
        farmer.irrigation?.emitters_count || 'N/A',
        farmer.irrigation?.flow_rate_lph || 'N/A',
        farmer.irrigation?.plants_per_acre || 'N/A',
        '', // Plot ID - will be filled if plots exist
        '', // Plot Number
        '', // Gat Number
        '', // Plot Area Size
        '', // Plot Village
        '', // Plot State
        '', // Plot District
        '', // Plot Taluka
        '', // PIN Code
        '', // Country
        '', // Plot Created At
        '', // Farm ID
        '', // Farm UID
        '', // Farm Area Size
        '', // Crop Type
        '', // Farm Plantation Type
        '', // Planting Method
        '', // Soil Type
        '', // Farm Address
        '', // Farm Created At
        '', // Irrigation Type (Farm)
        '', // Emitters Count (Farm)
        '', // Flow Rate LPH (Farm)
        '', // Plants Per Acre (Farm)
        '', // Distance Motor to Plot
        '', // Motor Horsepower
        '', // Pipe Width
        ''  // Irrigation Status
      ];
      
      // If no plots, add the basic farmer row
      if (!farmer.plots || farmer.plots.length === 0) {
        csvData.push(farmerRow);
      } else {
        // Add detailed rows for each plot and farm
        farmer.plots.forEach((plot: any) => {
          if (plot.farms && plot.farms.length > 0) {
            plot.farms.forEach((farm: any) => {
              if (farm.irrigations && farm.irrigations.length > 0) {
                farm.irrigations.forEach((irrigation: any) => {
                  const detailedRow = [...farmerRow];
                  // Fill plot data
                  detailedRow[20] = plot.id || 'N/A'; // Plot ID
                  detailedRow[21] = plot.plot_number || 'N/A'; // Plot Number
                  detailedRow[22] = plot.gat_number || 'N/A'; // Gat Number
                  detailedRow[23] = plot.area_size || 'N/A'; // Plot Area Size
                  detailedRow[24] = plot.village || 'N/A'; // Plot Village
                  detailedRow[25] = plot.state || 'N/A'; // Plot State
                  detailedRow[26] = plot.district || 'N/A'; // Plot District
                  detailedRow[27] = plot.taluka || 'N/A'; // Plot Taluka
                  detailedRow[28] = plot.pin_code || 'N/A'; // PIN Code
                  detailedRow[29] = plot.country || 'N/A'; // Country
                  detailedRow[30] = plot.created_at ? new Date(plot.created_at).toLocaleDateString('en-GB') : 'N/A'; // Plot Created At
                  
                  // Fill farm data
                  detailedRow[31] = farm.id || 'N/A'; // Farm ID
                  detailedRow[32] = farm.farm_uid || 'N/A'; // Farm UID
                  detailedRow[33] = farm.area_size || 'N/A'; // Farm Area Size
                  detailedRow[34] = farm.crop_type || 'N/A'; // Crop Type
                  detailedRow[35] = farm.plantation_type || 'N/A'; // Farm Plantation Type
                  detailedRow[36] = farm.planting_method || 'N/A'; // Planting Method
                  detailedRow[37] = farm.soil_type || 'N/A'; // Soil Type
                  detailedRow[38] = farm.address || 'N/A'; // Farm Address
                  detailedRow[39] = farm.created_at ? new Date(farm.created_at).toLocaleDateString('en-GB') : 'N/A'; // Farm Created At
                  
                  // Fill irrigation data
                  detailedRow[40] = irrigation.irrigation_type || 'N/A'; // Irrigation Type (Farm)
                  detailedRow[41] = irrigation.emitters_count || 'N/A'; // Emitters Count (Farm)
                  detailedRow[42] = irrigation.flow_rate_lph || 'N/A'; // Flow Rate LPH (Farm)
                  detailedRow[43] = irrigation.plants_per_acre || 'N/A'; // Plants Per Acre (Farm)
                  detailedRow[44] = irrigation.distance_motor_to_plot_m || 'N/A'; // Distance Motor to Plot
                  detailedRow[45] = irrigation.motor_horsepower || 'N/A'; // Motor Horsepower
                  detailedRow[46] = irrigation.pipe_width_inches || 'N/A'; // Pipe Width
                  detailedRow[47] = irrigation.status ? 'Active' : 'Inactive'; // Irrigation Status
                  
                  csvData.push(detailedRow);
                });
              } else {
                // No irrigation data, just farm data
                const farmRow = [...farmerRow];
                // Fill plot data
                farmRow[20] = plot.id || 'N/A';
                farmRow[21] = plot.plot_number || 'N/A';
                farmRow[22] = plot.gat_number || 'N/A';
                farmRow[23] = plot.area_size || 'N/A';
                farmRow[24] = plot.village || 'N/A';
                farmRow[25] = plot.state || 'N/A';
                farmRow[26] = plot.district || 'N/A';
                farmRow[27] = plot.taluka || 'N/A';
                farmRow[28] = plot.pin_code || 'N/A';
                farmRow[29] = plot.country || 'N/A';
                farmRow[30] = plot.created_at ? new Date(plot.created_at).toLocaleDateString('en-GB') : 'N/A';
                
                // Fill farm data
                farmRow[31] = farm.id || 'N/A';
                farmRow[32] = farm.farm_uid || 'N/A';
                farmRow[33] = farm.area_size || 'N/A';
                farmRow[34] = farm.crop_type || 'N/A';
                farmRow[35] = farm.plantation_type || 'N/A';
                farmRow[36] = farm.planting_method || 'N/A';
                farmRow[37] = farm.soil_type || 'N/A';
                farmRow[38] = farm.address || 'N/A';
                farmRow[39] = farm.created_at ? new Date(farm.created_at).toLocaleDateString('en-GB') : 'N/A';
                
                csvData.push(farmRow);
              }
            });
          } else {
            // No farms, just plot data
            const plotRow = [...farmerRow];
            plotRow[20] = plot.id || 'N/A';
            plotRow[21] = plot.plot_number || 'N/A';
            plotRow[22] = plot.gat_number || 'N/A';
            plotRow[23] = plot.area_size || 'N/A';
            plotRow[24] = plot.village || 'N/A';
            plotRow[25] = plot.state || 'N/A';
            plotRow[26] = plot.district || 'N/A';
            plotRow[27] = plot.taluka || 'N/A';
            plotRow[28] = plot.pin_code || 'N/A';
            plotRow[29] = plot.country || 'N/A';
            plotRow[30] = plot.created_at ? new Date(plot.created_at).toLocaleDateString('en-GB') : 'N/A';
            
            csvData.push(plotRow);
          }
        });
      }
    });
    
    // Convert to CSV string
    const csvContent = csvData
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Selected_Farmers_Details_${selectedFarmers.size}_farmers.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clear selection after download
    setSelectedFarmers(new Set());
  };


  const filtered = displayUsers.filter(
    (user) =>
      user.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone_number.toString().includes(searchTerm) ||
      user.area.toString().includes(searchTerm) ||
      user.plantation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.variety_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-2 sm:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded shadow-md p-2 sm:p-4 max-w-7xl mx-auto mt-2 sm:mt-6">
        {/* Header Section - Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-700">Farmlist</h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {selectedFarmers.size > 0 && (
              <button 
                onClick={handleBulkDownload} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm sm:text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Download Selected ({selectedFarmers.size})</span>
                <span className="sm:hidden">Download ({selectedFarmers.size})</span>
              </button>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search farmers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedFarmers.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-2">Farmer Name</th>
                <th className="px-4 py-2">Phone Number</th>
                <th className="px-4 py-2">Area (acres)</th>
                <th className="px-4 py-2">Plantation Type</th>
                <th className="px-4 py-2">Variety Type</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Loading farms data...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-red-600">
                    Error: {error}
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">No farms found</td>
                </tr>
              ) : (
                paginatedData.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedFarmers.has(user.id)}
                        onChange={() => handleSelectFarmer(user.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">{user.farmer_name}</td>
                    <td className="px-4 py-2">{user.phone_number}</td>
                    <td className="px-4 py-2">{user.area} acres</td>
                    <td className="px-4 py-2">{user.plantation_type}</td>
                    <td className="px-4 py-2">{user.variety_type}</td>
                    <td className="px-4 py-2 space-x-3">
                      <button 
                        onClick={() => handleViewDetails(user)} 
                        className="text-green-600 hover:text-green-800"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDownloadFarmer(user)} 
                        className="text-purple-600 hover:text-purple-800"
                        title="Download Details"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(user.id)} className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading farms data...
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Error: {error}
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-4">No farms found</div>
          ) : (
            <div className="space-y-4">
              {/* Select All for Mobile */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFarmers.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Select All</span>
                </label>
                {selectedFarmers.size > 0 && (
                  <span className="text-sm text-blue-600 font-medium">
                    {selectedFarmers.size} selected
                  </span>
                )}
              </div>

              {/* Farmer Cards */}
              {paginatedData.map((user) => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFarmers.has(user.id)}
                        onChange={() => handleSelectFarmer(user.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">{user.farmer_name}</h3>
                        <p className="text-sm text-gray-600">{user.phone_number}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewDetails(user)} 
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDownloadFarmer(user)} 
                        className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Download Details"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Area:</span>
                      <p className="font-medium">{user.area} acres</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Plantation:</span>
                      <p className="font-medium">{user.plantation_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Variety:</span>
                      <p className="font-medium">{user.variety_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Actions:</span>
                      <div className="flex space-x-2 mt-1">
                        <button 
                          onClick={() => handleEdit(user.id)} 
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)} 
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Responsive Pagination */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600">
          <p className="text-center sm:text-left">
            Showing {paginatedData.length} of {filtered.length} entries
          </p>
          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Farm Details Modal - Responsive */}
      {isModalOpen && selectedFarmer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white p-3 sm:p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-semibold truncate pr-2">
                {selectedFarmer.farmer_name}'s Farm Details
              </h2>
              <button 
                onClick={closeModal}
                className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {/* Farmer Information */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-3 sm:mb-4">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">Farmer Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <p className="text-sm sm:text-base"><span className="font-medium">Name:</span> {selectedFarmer.farmer_name}</p>
                    <p className="text-sm sm:text-base"><span className="font-medium">Phone:</span> {selectedFarmer.phone_number}</p>
                    <p className="text-sm sm:text-base"><span className="font-medium">Taluka:</span> {selectedFarmer.taluka || 'N/A'}</p>
                    <p className="text-sm sm:text-base"><span className="font-medium">State:</span> {selectedFarmer.state || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm sm:text-base"><span className="font-medium">Email:</span> {selectedFarmer.email || 'N/A'}</p>
                    <p className="text-sm sm:text-base"><span className="font-medium">Address:</span> {selectedFarmer.address || 'N/A'}</p>
                    <p className="text-sm sm:text-base"><span className="font-medium">District:</span> {selectedFarmer.district || 'N/A'}</p>
                    <p className="text-sm sm:text-base"><span className="font-medium">Created:</span> {selectedFarmer.created_at ? new Date(selectedFarmer.created_at).toLocaleDateString('en-GB') : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Total Farm Area */}
              <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-2">
                  <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">Total Farm Area</h3>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {selectedFarmer.area} acres ({(selectedFarmer.area * 0.404686).toFixed(2)} hectares)
                </p>
              </div>

              {/* Plot Details */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-3 sm:mb-4">
                  <Map className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    Plot Details ({selectedFarmer.plots?.length || 0} plots)
                  </h3>
                </div>
                
                {selectedFarmer.plots && selectedFarmer.plots.length > 0 ? (
                  selectedFarmer.plots.map((plot: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border">
                      <h4 className="text-base sm:text-lg font-semibold text-green-600 mb-3">
                        Plot {index + 1} - {plot.area_size} acres
                      </h4>
                      
                      {plot.farms && plot.farms.length > 0 ? (
                        plot.farms.map((farm: any, farmIndex: number) => {
                          // Get irrigation data from the first irrigation record
                          const irrigation = farm.irrigations && farm.irrigations.length > 0 ? farm.irrigations[0] : null;
                          
                          return (
                            <div key={farmIndex}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                  <p className="text-sm sm:text-base"><span className="font-medium">Village:</span> {plot.village || 'N/A'}</p>
                                  <p className="text-sm sm:text-base"><span className="font-medium">Variety:</span> {farm.crop_type || 'N/A'}</p>
                                  <p className="text-sm sm:text-base"><span className="font-medium">Plantation Date:</span> {farm.plantation_date || 'N/A'}</p>
                                  <p className="text-sm sm:text-base"><span className="font-medium">Spacing A:</span> {farm.spacing_a || 'N/A'}</p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm sm:text-base"><span className="font-medium">PIN Code:</span> {plot.pin_code || 'N/A'}</p>
                                  <p className="text-sm sm:text-base"><span className="font-medium">Plantation Type:</span> {farm.plantation_type || 'N/A'}</p>
                                  <p className="text-sm sm:text-base"><span className="font-medium">Irrigation:</span> {irrigation?.irrigation_type || 'N/A'}</p>
                                  <p className="text-sm sm:text-base"><span className="font-medium">Spacing B:</span> {farm.spacing_b || 'N/A'}</p>
                                </div>
                                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                                  <p className="text-sm sm:text-base"><span className="font-medium">Gat No:</span> {plot.gat_number || 'N/A'}</p>
                                  <p className="text-sm sm:text-base"><span className="font-medium">Plantation Method:</span> {farm.planting_method || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Irrigation Details based on type */}
                              {irrigation?.irrigation_type && (
                                <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                                  <div className="flex items-center mb-3 sm:mb-4">
                                    <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                                      {irrigation.irrigation_type === "Drip Irrigation" || irrigation.irrigation_type === "drip"
                                        ? "Drip Irrigation Details"
                                        : "Flood Irrigation Details"}
                                    </h4>
                                  </div>
                                  {irrigation.irrigation_type === "Drip Irrigation" || irrigation.irrigation_type === "drip" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                      <div className="space-y-2">
                                        <p className="text-sm sm:text-base"><span className="font-medium">Plants/Acre:</span> {irrigation?.plants_per_acre || 'N/A'}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-sm sm:text-base"><span className="font-medium">Flow Rate:</span> {irrigation?.flow_rate_lph || 'N/A'} LPH</p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-sm sm:text-base"><span className="font-medium">Emitters:</span> {irrigation?.emitters_count || 'N/A'}</p>
                                      </div>
                                    </div>
                                  ) : irrigation.irrigation_type === "Flood Irrigation" || irrigation.irrigation_type === "flood" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                      <div className="space-y-2">
                                        <p className="text-sm sm:text-base"><span className="font-medium">Motor Horsepower:</span> {irrigation?.motor_horsepower || 'N/A'}</p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-sm sm:text-base"><span className="font-medium">Pipe Width:</span> {irrigation?.pipe_width_inches || 'N/A'} inches</p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-sm sm:text-base"><span className="font-medium">Distance from Motor:</span> {irrigation?.distance_motor_to_plot_m || 'N/A'} m</p>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                          })
                      ) : (
                        <p className="text-gray-500 text-sm sm:text-base">No farm details available for this plot.</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm sm:text-base">No plot details available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
