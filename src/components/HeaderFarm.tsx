import React from 'react';
import { useFarmerProfile } from '../hooks/useFarmerProfile';

interface HeaderFarmProps {}

export const Header: React.FC<HeaderFarmProps> = () => {
  const { profile, loading: profileLoading } = useFarmerProfile();
  
  // Debug logging for profile data
  React.useEffect(() => {
    if (profile) {
      console.log('🏠 HeaderFarm - Profile data:', profile);
      console.log('🏠 HeaderFarm - Plots count:', profile.plots?.length);
      console.log('🏠 HeaderFarm - Plots data:', profile.plots);
      console.log('🏠 HeaderFarm - Agricultural summary:', profile.agricultural_summary);
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