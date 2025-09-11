import { useState, useEffect } from 'react';
import { getFarmerProfile } from '../api';

interface FarmerProfile {
  success: boolean;
  farmer_profile: {
    id: number;
    username: string;
    email: string;
    personal_info: {
      first_name: string;
      last_name: string;
      full_name: string;
      phone_number: string;
      profile_picture: string | null;
    };
    address_info: {
      address: string;
      village: string;
      district: string;
      state: string;
      taluka: string;
      full_address: string;
    };
    role: {
      id: number;
      name: string;
      display_name: string;
    };
  };
  agricultural_summary: {
    total_plots: number;
    total_farms: number;
    total_irrigations: number;
    crop_types: string[];
    plantation_types: string[];
    irrigation_types: string[];
    total_farm_area: number;
  };
  plots: Array<{
    id: number;
    fastapi_plot_id: string;
    gat_number: string;
    plot_number: string;
    address: {
      village: string;
      taluka: string;
      district: string;
      state: string;
      country: string;
      pin_code: string;
      full_address: string;
    };
    coordinates: {
      location: {
        type: string;
        coordinates: [number, number];
        latitude: number;
        longitude: number;
      };
      boundary: {
        type: string;
        coordinates: number[][][];
        has_boundary: boolean;
      };
    };
    farms: Array<{
      id: number;
      farm_uid: string;
      area_size: string;
      area_size_numeric: number;
      soil_type: {
        id: number;
        name: string;
      };
      crop_type: {
        id: number;
        crop_type: string;
        plantation_type: string;
        plantation_type_display: string;
        planting_method: string;
        planting_method_display: string;
      };
    }>;
  }>;
}

export const useFarmerProfile = () => {
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      console.log('🔄 useFarmerProfile: Fetching fresh profile data...');
      const data = await getFarmerProfile();
      console.log('✅ useFarmerProfile: Received profile data:', data);
      setProfile(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('❌ useFarmerProfile: Failed to fetch farmer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch profile if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
      setError('No authentication token found');
    }
  }, []);

  const getFarmerName = () => {
    if (!profile?.farmer_profile?.personal_info) return 'Farmer';
    const { first_name, last_name } = profile.farmer_profile.personal_info;
    return `${first_name} ${last_name}`.trim() || 'Farmer';
  };

  const getFarmerFullName = () => {
    if (!profile?.farmer_profile?.personal_info) return 'Farmer';
    return profile.farmer_profile.personal_info.full_name || getFarmerName();
  };

  const getPlotNames = () => {
    if (!profile?.plots) return [];
    return profile.plots.map(plot => plot.fastapi_plot_id);
  };

  
  const getPlotById = (plotId: string) => {
    if (!profile?.plots) return null;
    return profile.plots.find(plot => plot.fastapi_plot_id === plotId);
  };

  const getFarmerEmail = () => {
    return profile?.farmer_profile?.email || '';
  };

  const getFarmerPhone = () => {
    return profile?.farmer_profile?.personal_info?.phone_number || '';
  };

  const getTotalPlots = () => {
    return profile?.agricultural_summary?.total_plots || 0;
  };

  const getTotalFarms = () => {
    return profile?.agricultural_summary?.total_farms || 0;
  };

  const getTotalFarmArea = () => {
    return profile?.agricultural_summary?.total_farm_area || 0;
  };

  return {
    profile,
    loading,
    error,
    refreshProfile: fetchProfile,
    getFarmerName,
    getFarmerFullName,
    getPlotNames,
    getPlotById,
    getFarmerEmail,
    getFarmerPhone,
    getTotalPlots,
    getTotalFarms,
    getTotalFarmArea,
  };
};
