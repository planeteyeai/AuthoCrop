import React from 'react';
import { useFarmerProfile } from '../hooks/useFarmerProfile';

interface HeaderFarmProps {}

export const Header: React.FC<HeaderFarmProps> = () => {
  const { profile, loading: profileLoading } = useFarmerProfile();
  
  // Note: Profile is automatically fetched by useFarmerProfile hook using the new my-profile endpoint

  // Debug logging for profile data
  React.useEffect(() => {
    if (profile) {
      console.log('🏠 HeaderFarm - ===== FARMER PROFILE API DETAILS =====');
      console.log('🏠 HeaderFarm - Complete Profile Data:', profile);
      console.log('🏠 HeaderFarm - Success Status:', profile.success);
      
      // Farmer Profile Details
      console.log('🏠 HeaderFarm - ===== FARMER PROFILE =====');
      console.log('🏠 HeaderFarm - Farmer ID:', profile.farmer_profile?.id);
      console.log('🏠 HeaderFarm - Username:', profile.farmer_profile?.username);
      console.log('🏠 HeaderFarm - Email:', profile.farmer_profile?.email);
      
      // Personal Info
      console.log('🏠 HeaderFarm - ===== PERSONAL INFO =====');
      console.log('🏠 HeaderFarm - First Name:', profile.farmer_profile?.personal_info?.first_name);
      console.log('🏠 HeaderFarm - Last Name:', profile.farmer_profile?.personal_info?.last_name);
      console.log('🏠 HeaderFarm - Full Name:', profile.farmer_profile?.personal_info?.full_name);
      console.log('🏠 HeaderFarm - Phone Number:', profile.farmer_profile?.personal_info?.phone_number);
      console.log('🏠 HeaderFarm - Profile Picture:', profile.farmer_profile?.personal_info?.profile_picture);
      
      // Address Info
      console.log('🏠 HeaderFarm - ===== ADDRESS INFO =====');
      console.log('🏠 HeaderFarm - Address:', profile.farmer_profile?.address_info?.address);
      console.log('🏠 HeaderFarm - Village:', profile.farmer_profile?.address_info?.village);
      console.log('🏠 HeaderFarm - District:', profile.farmer_profile?.address_info?.district);
      console.log('🏠 HeaderFarm - State:', profile.farmer_profile?.address_info?.state);
      console.log('🏠 HeaderFarm - Taluka:', profile.farmer_profile?.address_info?.taluka);
      console.log('🏠 HeaderFarm - Full Address:', profile.farmer_profile?.address_info?.full_address);
      
      // Account Info
      console.log('🏠 HeaderFarm - ===== ACCOUNT INFO =====');
      console.log('🏠 HeaderFarm - Date Joined:', profile.farmer_profile?.account_info?.date_joined);
      console.log('🏠 HeaderFarm - Last Login:', profile.farmer_profile?.account_info?.last_login);
      console.log('🏠 HeaderFarm - Is Active:', profile.farmer_profile?.account_info?.is_active);
      console.log('🏠 HeaderFarm - Created At:', profile.farmer_profile?.account_info?.created_at);
      console.log('🏠 HeaderFarm - Updated At:', profile.farmer_profile?.account_info?.updated_at);
      
      // Role Info
      console.log('🏠 HeaderFarm - ===== ROLE INFO =====');
      console.log('🏠 HeaderFarm - Role ID:', profile.farmer_profile?.role?.id);
      console.log('🏠 HeaderFarm - Role Name:', profile.farmer_profile?.role?.name);
      console.log('🏠 HeaderFarm - Role Display Name:', profile.farmer_profile?.role?.display_name);
      
      // Agricultural Summary
      console.log('🏠 HeaderFarm - ===== AGRICULTURAL SUMMARY =====');
      console.log('🏠 HeaderFarm - Total Plots:', profile.agricultural_summary?.total_plots);
      console.log('🏠 HeaderFarm - Total Farms:', profile.agricultural_summary?.total_farms);
      console.log('🏠 HeaderFarm - Total Irrigations:', profile.agricultural_summary?.total_irrigations);
      console.log('🏠 HeaderFarm - Crop Types:', profile.agricultural_summary?.crop_types);
      console.log('🏠 HeaderFarm - Plantation Types:', profile.agricultural_summary?.plantation_types);
      console.log('🏠 HeaderFarm - Irrigation Types:', profile.agricultural_summary?.irrigation_types);
      console.log('🏠 HeaderFarm - Total Farm Area:', profile.agricultural_summary?.total_farm_area);
      
      // Plots Details
      console.log('🏠 HeaderFarm - ===== PLOTS DETAILS =====');
      console.log('🏠 HeaderFarm - Plots Count:', profile.plots?.length);
      console.log('🏠 HeaderFarm - Plots Data:', profile.plots);
      
      if (profile.plots && profile.plots.length > 0) {
        profile.plots.forEach((plot, index) => {
          console.log(`🏠 HeaderFarm - ===== PLOT ${index + 1} =====`);
          console.log(`🏠 HeaderFarm - Plot ID:`, plot.id);
          console.log(`🏠 HeaderFarm - FastAPI Plot ID:`, plot.fastapi_plot_id);
          console.log(`🏠 HeaderFarm - GAT Number:`, plot.gat_number);
          console.log(`🏠 HeaderFarm - Plot Number:`, plot.plot_number);
          console.log(`🏠 HeaderFarm - Plot Address:`, plot.address);
          console.log(`🏠 HeaderFarm - Plot Coordinates:`, plot.coordinates);
          console.log(`🏠 HeaderFarm - Plot Timestamps:`, plot.timestamps);
          console.log(`🏠 HeaderFarm - Plot Ownership:`, plot.ownership);
          console.log(`🏠 HeaderFarm - Plot Farms Count:`, plot.farms_count);
          console.log(`🏠 HeaderFarm - Plot Farms:`, plot.farms);
          
          if (plot.farms && plot.farms.length > 0) {
            plot.farms.forEach((farm, farmIndex) => {
              console.log(`🏠 HeaderFarm - ===== FARM ${farmIndex + 1} IN PLOT ${index + 1} =====`);
              console.log(`🏠 HeaderFarm - Farm ID:`, farm.id);
              console.log(`🏠 HeaderFarm - Farm UID:`, farm.farm_uid);
              console.log(`🏠 HeaderFarm - Farm Owner:`, farm.farm_owner);
              console.log(`🏠 HeaderFarm - Farm Address:`, farm.address);
              console.log(`🏠 HeaderFarm - Farm Area Size:`, farm.area_size);
              console.log(`🏠 HeaderFarm - Farm Area Size Numeric:`, farm.area_size_numeric);
              console.log(`🏠 HeaderFarm - Plantation Date:`, farm.plantation_date);
              console.log(`🏠 HeaderFarm - Spacing A:`, farm.spacing_a);
              console.log(`🏠 HeaderFarm - Spacing B:`, farm.spacing_b);
              console.log(`🏠 HeaderFarm - Plants in Field:`, farm.plants_in_field);
              console.log(`🏠 HeaderFarm - Soil Type:`, farm.soil_type);
              console.log(`🏠 HeaderFarm - Crop Type:`, farm.crop_type);
              console.log(`🏠 HeaderFarm - Farm Document:`, farm.farm_document);
              console.log(`🏠 HeaderFarm - Farm Created At:`, farm.created_at);
              console.log(`🏠 HeaderFarm - Farm Updated At:`, farm.updated_at);
              console.log(`🏠 HeaderFarm - Farm Created By:`, farm.created_by);
              console.log(`🏠 HeaderFarm - Irrigations Count:`, farm.irrigations_count);
              console.log(`🏠 HeaderFarm - Irrigations:`, farm.irrigations);
            });
          }
        });
      }
      
      // FastAPI Integration
      console.log('🏠 HeaderFarm - ===== FASTAPI INTEGRATION =====');
      console.log('🏠 HeaderFarm - Plot IDs Format:', profile.fastapi_integration?.plot_ids_format);
      console.log('🏠 HeaderFarm - Compatible Services:', profile.fastapi_integration?.compatible_services);
      console.log('🏠 HeaderFarm - Note:', profile.fastapi_integration?.note);
      
      console.log('🏠 HeaderFarm - ===== END OF FARMER PROFILE API DETAILS =====');
    }
  }, [profile]);
  
  // Format current date to display like "27 May 2025"
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="bg-green-800 py-2 shadow-md">
      <div className="flex justify-between items-center px-4">
        {/* Left: Farmer Name Only */}
        <div className="flex items-center">
          {profileLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : profile ? (
            <div className="flex items-center">
              <span className="font-bold text-white mr-3">Name:</span>
              <span className="font-bold text-white mr-3">{profile.farmer_profile?.personal_info?.full_name || 'Unknown'}</span>
            </div>
          ) : (
            <div className="text-red-500">Failed to load profile</div>
          )}
        </div>

        {/* Center: Report Date */}
        <div className="text-white text-center font-medium text-sm">
          Report Date: {formattedDate}
        </div>
        

        {/* Right: Plot Information */}
        <div className="flex items-center">
          {profileLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : profile ? (
            <div className="flex items-center">
              <span className="font-bold text-white mr-3">Total Plots:</span>
              <span className="font-bold text-white mr-3">
                {profile.agricultural_summary?.total_plots || 0}
              </span>   
            </div>
          ) : (
            <div className="flex items-center">
              <div className="text-red-500 mr-3">Failed to load plots</div>
              
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;



 {/* Left: Farmer Name 
        <div className="flex items-center">
          <h2 className="font-semibold mr-2">Ajay Dhale</h2>
          <span className="bg-green-600 px-2 py-0.5 rounded">(2.48 acres)</span>
        </div> */}
 {/* Right: Total Fields 
        <div className="text-right">
          Total Fields: 2
        </div> */}