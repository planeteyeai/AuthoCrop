import axios from 'axios';
import { getAuthToken, setAuthToken as setAuthTokenUtil } from './utils/auth';

// Set base URL for backend
const API_BASE_URL = 'http://192.168.41.73:8000/api'; // changed to root API URL

// KML/GeoJSON API URL
const KML_API_URL = 'http://192.168.41.73:7030';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Send OTP to email
export const sendOtp = (email: string) => {
  return api.post('/otp/', { email });
};

// Verify OTP with email
export const verifyOtp = (email: string, otp: string) => {
  return api.post('/verify-otp/', { email, otp });
};

export const login = (username: string, password: string) => {
  return api.post('/login', { username, password });
};

export const addUser = (data: {
  username?: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  password?: string;
  role: string;
}) => {
  return api.post('/users/', data);
};

export const addVendor = (data: {
  vendor_name: string;
  email: string;
  mobile: string;
  gstin: string;
  state: string;
  city: string;
  address: string;
}) => {
  return api.post('/vendors/', data);
};

export const getVendors = () => {
  return api.get('/vendors/');
};

export const addOrder = (data: {
  vendor_name: string;
  invoice_date: string;
  invoice_number: string;
  state: string;
  items: {
    item_name: string;
    year_of_make: string;
    estimate_cost: string;
    remark: string;
  }[];
}) => {
  return api.post('/addorder', data);
};

export const addStock = (data: {
  item_name: string;
  item_type: string;
  make: string;
  year_of_make: string;
  estimate_cost: string;
  status: string;
  remark: string;
}) => {
  return api.post('/addstock', data);
};

export const addBooking = (data: {
  item_name: string;
  user_role: string;
  start_date: string;
  end_date: string;
  status: string;
}) => {
  return api.post('/addbooking', data);
};

// ==================== FARM MANAGEMENT API ====================

// Farm Management
export const getFarms = () => {
  return api.get('/farms/');
};

// Get farms with farmer details
export const getFarmsWithFarmerDetails = () => {
  return api.get('/farms/?include_farmer=true');
};

export const getFarmById = (id: string) => {
  return api.get(`/farms/${id}/`);
};

// Get farms by farmer ID
export const getFarmsByFarmerId = (farmerId: string) => {
  return api.get(`/farms/?farmer_id=${farmerId}`);
};

export const createFarm = async (data: {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  confirm_password: string;
  email: string;
  phone_number: string;
  address: string;
  village: string;
  taluka: string;
  state: string;
  pin_code: string;
  district: string;
  gat_No: string;
  area: string;
 crop_type: string;
  plantation_Type: string;
  plantation_Date: string;
  irrigation_Type: string;
  plants_Per_Acre: string;
  spacing_A: string;
  spacing_B: string;
  flow_Rate: string;
  emitters: string;
  motor_Horsepower: string;
  pipe_Width: string;
  distance_From_Motor: string;
  geometry: string;
  location: { lat: string; lng: string };
  documents: FileList | null;
}) => {
  // Create FormData for file upload
  const formData = new FormData();
  
  // Add all text fields
  Object.keys(data).forEach(key => {
    if (key !== 'documents') {
      formData.append(key, data[key as keyof typeof data] as string);
    }
  });
  
  // Add files if they exist
  if (data.documents) {
    for (let i = 0; i < data.documents.length; i++) {
      formData.append('documents', data.documents[i]);
    }
  }
  
  // Use multipart/form-data for file upload
  return api.post('/farms/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const updateFarm = (id: string, data: any) => {
  return api.put(`/farms/${id}/`, data);
};

// Update farm registration
export const updateFarmRegistration = (id: string, data: {
  farmer_id?: string;
  plots?: Array<any>;
  totalArea?: {
    sqm: number;
    ha: number;
    acres: number;
  };
  location?: {
    lat: string;
    lng: string;
  };
  documents?: FileList | null;
}) => {
  return api.put(`/farms/${id}/`, data);
};

export const deleteFarm = (id: string) => {
  return api.delete(`/farms/${id}/`);
};

export const getFarmsGeoJSON = () => {
  return api.get('/farms/geojson/');
};

// Farm Plots Management
export const getFarmPlots = () => {
  return api.get('/farm-plots/');
};

export const createFarmPlot = (data: {
  farm_id: string;
  boundary: string; // GeoJSON geometry
  area: number;
  plot_name: string;
}) => {
  return api.post('/farm-plots/', data);
};

export const getFarmPlotsGeoJSON = () => {
  return api.get('/farm-plots/geojson/');
};

// Soil and Crop Types
export const getSoilTypes = () => {
  return api.get('/soil-types/');
};

export const getCropTypes = () => {
  return api.get('/crop-types/');
};

// Get crop types with Bearer token
export const getCropTypesWithAuth = (token: string) => {
  return axios.get(`${API_BASE_URL}/crop-types/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
};




export const registerUser = (data: {
  username: string;
  password: string;
  password2: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone_number: string;
  address: string;
}) => {
  return api.post('/users/', data);
};

export const getTokenWithOtp = (email: string, otp: string) => {
  return api.post('/token/', { email, otp });
};

export const getCurrentUser = () => {
  return api.get('/users/me/');
};

export const getUsers = () => {
  return api.get('/users/');
};

// Farmer Registration API (role_id = 1 for Farmer) - No authentication required
export const registerFarmer = (data: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_id: number; // Always 1 for Farmer
  phone_number: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
}) => {
  // Create axios instance without auth token for registration
  return axios.post(`${API_BASE_URL}/users/`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Send OTP to email for registration
export const sendOTPForRegistration = async (email: string): Promise<void> => {
  try {
    console.log('Sending OTP to:', email);
    const otpResponse = await axios.post(`${API_BASE_URL}/otp/`, {
      email: email
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ OTP sent successfully to:', email);
  } catch (error: any) {
    console.error('Failed to send OTP:', error);
    throw new Error(`Failed to send OTP: ${error.response?.data?.detail || error.message}`);
  }
};

// Verify OTP and get Bearer token
export const verifyOTPAndGetToken = async (email: string, otp: string): Promise<string> => {
  try {
    console.log('Verifying OTP for:', email);
    const verifyResponse = await axios.post(`${API_BASE_URL}/verify-otp/`, {
      email: email,
      otp: otp
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (verifyResponse.data && (verifyResponse.data.access || verifyResponse.data.token)) {
      const token = verifyResponse.data.access || verifyResponse.data.token;
      console.log('✅ OTP verification successful, token received');
      return token;
    } else {
      throw new Error('Invalid OTP response format');
    }
  } catch (error: any) {
    console.error('OTP verification failed:', error);
    throw new Error(`OTP verification failed: ${error.response?.data?.detail || error.message}`);
  }
};

// Set authentication token for API calls
export const setAuthToken = (token: string) => {
  // Set the token in the axios instance
  api.defaults.headers.Authorization = `Bearer ${token}`;
  // Also store it in localStorage using the utility
  setAuthTokenUtil(token);
};

// Plot Creation API - Requires Bearer token
export const createPlot = (data: {
  gat_number: string;
  plot_number: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  country: string;
  pin_code: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // longitude, latitude
  };
  boundary: {
    type: "Polygon";
    coordinates: [[[number, number]]]; // GeoJSON Polygon
  };
}, token?: string) => {
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return axios.post(`${API_BASE_URL}/plots/`, data, { headers });
};

// Farm Creation API - Requires Bearer token
export const createFarmWithPlot = (data: {
  plot_id: number;
  address: string;
  area_size: number;
  soil_type_id: string;
  crop_type_id: string;
  farm_document: File | null;
}, token?: string) => {
  const formData = new FormData();
  formData.append('plot_id', data.plot_id.toString());
  formData.append('address', data.address);
  formData.append('area_size', data.area_size.toString());
  formData.append('soil_type_id', data.soil_type_id);
  formData.append('crop_type_id', data.crop_type_id);
  
  if (data.farm_document) {
    formData.append('farm_document', data.farm_document);
  }
  
  const headers: any = {
    'Content-Type': 'multipart/form-data',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return axios.post(`${API_BASE_URL}/farms/`, formData, { headers });
};

// Farm Registration API - Main endpoint
export const createFarmRegistration = (data: {
  farmer_id: string;
  plots: Array<{
    id: string;
    geometry: any;
    area: {
      sqm: number;
      ha: number;
      acres: number;
    };
    GroupGatNo: string;
    GatNoId: string;
    village: string;
    pin_code: string;
   crop_type: string;
    plantation_Type: string;
    plantation_Method: string;
    plantation_Date: string;
    irrigation_Type: string;
    plants_Per_Acre: string;
    spacing_A: string;
    spacing_B: string;
    flow_Rate: string;
    emitters: string;
    motor_Horsepower: string;
    pipe_Width: string;
    distance_From_Motor: string;
  }>;
  totalArea: {
    sqm: number;
    ha: number;
    acres: number;
  };
  location: {
    lat: string;
    lng: string;
  };
  irrigation: {
    irrigation_type_name: string;
    status: boolean;
    location: {
      type: "Point";
      coordinates: [number, number];
    };
    // Optional fields based on irrigation type
    plants_per_acre?: number;
    flow_rate_lph?: number;
    emitters_count?: number;
    motor_horsepower?: number;
    pipe_width_inches?: number;
    distance_motor_to_plot_m?: number;
  };
  documents?: FileList | null;
}) => {
  return api.post('/farms/', data);
};

// Utility function to calculate area from GeoJSON polygon coordinates (in hectares)
export const calculatePolygonArea = (coordinates: [number, number][]): number => {
  if (coordinates.length < 3) return 0;
  
  // Use a simple planar approximation for small agricultural plots
  // This is more suitable for small areas and avoids the large number issue
  let area = 0;
  
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[j];
    
    // Use the shoelace formula with a simple planar approximation
    // For small agricultural plots, this is sufficiently accurate
    area += (lng2 - lng1) * (lat2 + lat1) / 2;
  }
  
  // Convert to square meters using a simplified conversion
  // For small areas, we can use a local approximation
  const lat = coordinates[0][1]; // Use first coordinate's latitude
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegreeLat = 111320; // meters per degree latitude
  const metersPerDegreeLng = 111320 * Math.cos(latRad); // meters per degree longitude
  
  const areaSqm = Math.abs(area) * metersPerDegreeLat * metersPerDegreeLng;
  
  // Convert from square meters to hectares
  const areaHectares = areaSqm / 10000;
  
          // Round to exactly 2 decimal places as required by the API
        return Math.round(areaHectares * 100) / 100;
};


// Farmer profile API function - uses existing endpoints
export const getFarmerProfile = async () => {
  try {
    console.log('🔍 Fetching farmer profile using new API structure');
    
    // First, get the current user data
    const userResponse = await api.get('/users/me/');
    const userData = userResponse.data;
    console.log('✅ User data:', userData);
    
    // Then, get farms for this user using the new API structure
    let farmsData = [];
    let plotsData = [];
    let agriculturalSummary = {
      total_plots: 0,
      total_farms: 0,
      total_irrigations: 0,
      crop_types: [],
      plantation_types: [],
      irrigation_types: [],
      total_farm_area: 0
    };
    
    try {
      // Try to get farms by farmer ID using the new API
      console.log('🔍 Fetching farms for farmer ID:', userData.id);
      console.log('🔍 User data:', userData);
      
      const farmsResponse = await api.get('/farms/?include_farmer=true');
      console.log('📊 Raw farms response:', farmsResponse.data);
      
      const allFarms = farmsResponse.data.results || farmsResponse.data || [];
      console.log('✅ All farms data:', allFarms);
      console.log('📈 Total farms found:', allFarms.length);
      
      // Filter farms for the current user
      farmsData = allFarms.filter((farm: any) => {
        // Check different possible field names for farmer ID
        const farmFarmerId = farm.farmer_id || farm.farmer?.id || farm.user_id || farm.user?.id;
        const matches = farmFarmerId == userData.id;
        console.log(`🔍 Farm ${farm.id}: farmer_id=${farm.farmer_id}, farmer?.id=${farm.farmer?.id}, looking for: ${userData.id}, matches: ${matches}`);
        return matches;
      });
      
      console.log('✅ Filtered farms for current user:', farmsData);
      console.log('📈 User farms found:', farmsData.length);
      
      // Calculate agricultural summary
      agriculturalSummary.total_farms = farmsData.length;
      agriculturalSummary.total_plots = farmsData.length; // Each farm has one plot
      
      // Extract unique crop types, plantation types, and irrigation types
      const cropTypes = new Set();
      const plantationTypes = new Set();
      const irrigationTypes = new Set();
      let totalArea = 0;
      
      farmsData.forEach((farm: any) => {
        if (farm.crop_type_name) cropTypes.add(farm.crop_type_name);
        if (farm.plantation_type) plantationTypes.add(farm.plantation_type);
        if (farm.irrigation_type_name) irrigationTypes.add(farm.irrigation_type_name);
        if (farm.area_size_numeric) totalArea += farm.area_size_numeric;
      });
      
      agriculturalSummary.crop_types = Array.from(cropTypes) as string[];
      agriculturalSummary.plantation_types = Array.from(plantationTypes) as string[];
      agriculturalSummary.irrigation_types = Array.from(irrigationTypes) as string[];
      agriculturalSummary.total_farm_area = totalArea;
      
      // Transform farms data to plots format
      plotsData = farmsData.map((farm: any, index: number) => ({
        id: farm.id || index + 1,
        fastapi_plot_id: farm.farm_uid || `plot_${index + 1}`,
        gat_number: farm.gat_number || `GAT_${index + 1}`,
        plot_number: farm.plot_number || `PLOT_${index + 1}`,
        address: {
          village: farm.village || userData.village || '',
          taluka: farm.taluka || userData.taluka || '',
          district: farm.district || userData.district || '',
          state: farm.state || userData.state || '',
          country: farm.country || 'India',
          pin_code: farm.pin_code || userData.pin_code || '',
          full_address: `${farm.village || userData.village || ''}, ${farm.taluka || userData.taluka || ''}, ${farm.district || userData.district || ''}, ${farm.state || userData.state || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
        },
        coordinates: {
          location: {
            type: "Point",
            coordinates: farm.location?.coordinates || [0, 0],
            latitude: farm.location?.coordinates?.[1] || 0,
            longitude: farm.location?.coordinates?.[0] || 0
          },
          boundary: {
            type: "Polygon",
            coordinates: farm.boundary?.coordinates || [],
            has_boundary: !!(farm.boundary?.coordinates && farm.boundary.coordinates.length > 0)
          }
        },
        farms: [{
          id: farm.id,
          farm_uid: farm.farm_uid,
          area_size: farm.area_size,
          area_size_numeric: farm.area_size_numeric,
          soil_type: {
            id: farm.soil_type?.id || 1,
            name: farm.soil_type?.name || 'Loamy'
          },
          crop_type: {
            id: farm.crop_type?.id || 1,
            crop_type: farm.crop_type_name || 'Sugarcane',
            plantation_type: farm.plantation_type || 'adsali',
            plantation_type_display: farm.plantation_type || 'Adsali',
            planting_method: farm.planting_method || '3_bud',
            planting_method_display: farm.planting_method || '3 Bud'
          }
        }]
      }));
      
    } catch (farmsError: any) {
      console.warn('⚠️ Could not fetch farms data:', farmsError.message);
      // Continue with empty farms data
    }
    
    // Transform the data to match the expected farmer profile structure
    const transformedData = {
      success: true,
      farmer_profile: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        personal_info: {
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          phone_number: userData.phone_number || '',
          profile_picture: null
        },
        address_info: {
          address: userData.address || '',
          village: userData.village || '',
          district: userData.district || '',
          state: userData.state || '',
          taluka: userData.taluka || '',
          full_address: `${userData.address || ''}, ${userData.village || ''}, ${userData.taluka || ''}, ${userData.district || ''}, ${userData.state || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
        },
        role: {
          id: userData.role_id || userData.role || 1,
          name: userData.role || 'farmer',
          display_name: userData.role || 'Farmer'
        }
      },
      agricultural_summary: agriculturalSummary,
      plots: plotsData
    };
    
    console.log('✅ Complete farmer profile data:', transformedData);
    return transformedData;
    
  } catch (error: any) {
    console.error('❌ Failed to fetch farmer profile:', error);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method
    });
    
    if (error.response?.status === 401) {
      
      throw new Error('Authentication failed. Please login again.');
    } else if (error.response?.status === 403) {
      throw new Error('Access denied. You may not have permission to access farmer profile.');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    } else {
      throw new Error(`Failed to fetch farmer profile: ${error.response?.data?.detail || error.message}`);
    }
  }
};

// All-in-one farmer registration API for field officers
export const registerFarmerAllInOne = async (data: {
  farmer: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    address: string;
    village: string;
    district: string;
    state: string;
    taluka: string;
  };
  plot: {
    gat_number: string;
    plot_number: string;
    village: string;
    taluka: string;
    district: string;
    state: string;
    country: string;
    pin_code: string;
    location: {
      type: "Point";
      coordinates: [number, number]; // [longitude, latitude]
    };
    boundary: {
      type: "Polygon";
      coordinates: [[[number, number]]]; // GeoJSON Polygon coordinates
    };
  };
  farm: {
    address: string;
    area_size: string;
    soil_type_name: string;
    crop_type_name: string;
    plantation_type: string;
    planting_method: string;
  };
  irrigation: {
    irrigation_type_name: string;
    status: boolean;
    location: {
      type: "Point";
      coordinates: [number, number];
    };
    // Optional fields based on irrigation type
    plants_per_acre?: number;
    flow_rate_lph?: number;
    emitters_count?: number;
    motor_horsepower?: number;
    pipe_width_inches?: number;
    distance_motor_to_plot_m?: number;
  };
}) => {
  return api.post("/farms/register-farmer/", data);
};

// Simplified farmer registration - uses ONLY all-in-one API for ALL users
export const registerFarmerAllInOneOnly = async (
  formData: any,
  plots: any[]
) => {
  console.log("🚀 Using all-in-one registration API for all users");

  try {
    // Convert form data and plots to all-in-one format
    const allInOneData = convertToAllInOneFormat(formData, plots);

    console.log("🚀 Calling registerFarmerAllInOne with data:", allInOneData);
    const result = await registerFarmerAllInOne(allInOneData);
    console.log("✅ All-in-one API success:", result);
    return result;
  } catch (error: any) {
    console.error("❌ All-in-one API failed:", error);
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// Helper function to convert form data to all-in-one API format
const convertToAllInOneFormat = (formData: any, plots: any[]) => {
  console.log("🔄 Converting form data to all-in-one format");
  console.log("📋 Form Data:", formData);
  console.log("📍 Plots:", plots);

  // For now, convert first plot only. You can modify this for multiple plots
  const firstPlot = plots[0];

  if (!firstPlot) {
    throw new Error("At least one plot is required for registration");
  }

  console.log("🎯 First Plot Data:", firstPlot);

  // Calculate center coordinates for location
  const coordinates = firstPlot.geometry.coordinates[0];
  console.log("📐 Raw Coordinates:", coordinates);

  const centerLng =
    coordinates.reduce((sum: number, coord: number[]) => sum + coord[0], 0) /
    coordinates.length;
  const centerLat =
    coordinates.reduce((sum: number, coord: number[]) => sum + coord[1], 0) /
    coordinates.length;

  console.log("🎯 Center Coordinates:", { centerLng, centerLat });

  const payload = {
    farmer: {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number,
      address: formData.address,
      village: firstPlot.village || formData.district,
      district: formData.district,
      state: formData.state,
      taluka: formData.taluka,
    },
    plot: {
      gat_number: firstPlot.GroupGatNo || `GAT_${Date.now()}`,
      plot_number: firstPlot.GatNoId || `PLOT_${Date.now()}`,
      village: firstPlot.village || formData.district,
      taluka: formData.taluka,
      district: formData.district,
      state: formData.state,
      country: "India",
      pin_code: firstPlot.pin_code || "422605",
      location: {
        type: "Point" as const,
        coordinates: [centerLng, centerLat] as [number, number],
      },
      boundary: {
        type: "Polygon" as const,
        coordinates: [
          coordinates.map((coord: number[]) => [coord[0], coord[1]]),
        ] as [[[number, number]]],
      },
    },
    farm: {
      address: `${firstPlot.village || formData.district}, ${
        formData.taluka
      }, ${formData.district}`,
      area_size: firstPlot.area.ha.toString(),
      plantation_date: firstPlot.plantation_Date || "2024-01-15",
      spacing_a: firstPlot.spacing_A || "3.0",
      spacing_b: firstPlot.spacing_B || "1.5",
      soil_type_name: "Loamy", // Default - you can make this dynamic
      crop_type_name: "Sugarcane", // Fixed as per your requirement
      plantation_type: firstPlot.plantation_Type || "adsali",
      planting_method: firstPlot.plantation_Method || "3_bud",
    },
    irrigation: {
      irrigation_type_name: firstPlot.irrigation_Type || "drip",
      status: true,
      location: {
        type: "Point" as const,
        coordinates: [centerLng, centerLat] as [number, number],
      },
      // Conditional irrigation details based on type
      ...(firstPlot.irrigation_Type === "drip" ? {
        plants_per_acre: parseFloat(firstPlot.plants_Per_Acre) || 2000,
        flow_rate_lph: parseFloat(firstPlot.flow_Rate) || 2.5,
        emitters_count: parseInt(firstPlot.emitters) || 150,
      } : firstPlot.irrigation_Type === "flood" ? {
        motor_horsepower: parseFloat(firstPlot.motor_Horsepower) || 7.5,
        pipe_width_inches: parseFloat(firstPlot.pipe_Width) || 6.0,
        distance_motor_to_plot_m: parseFloat(firstPlot.distance_From_Motor) || 75.0,
      } : {}),
    },
  };

  console.log("📦 Generated Payload:", JSON.stringify(payload, null, 2));

  // Validate the payload before returning
  validateAllInOnePayload(payload);

  return payload;
};


// Debug function to validate data format before sending
export const validateAllInOnePayload = (payload: any) => {
  const errors: string[] = [];

  // Validate farmer object
  if (!payload.farmer) {
    errors.push("Missing 'farmer' object");
  } else {
    const requiredFarmerFields = [
      "username",
      "email",
      "password",
      "first_name",
      "last_name",
      "phone_number",
    ];
    requiredFarmerFields.forEach((field) => {
      if (!payload.farmer[field]) {
        errors.push(`Missing farmer.${field}`);
      }
    });
  }

  // Validate plot object
  if (!payload.plot) {
    errors.push("Missing 'plot' object");
  } else {
    const requiredPlotFields = [
      "gat_number",
      "plot_number",
      "village",
      "location",
      "boundary",
    ];
    requiredPlotFields.forEach((field) => {
      if (!payload.plot[field]) {
        errors.push(`Missing plot.${field}`);
      }
    });

    // Validate location format
    if (payload.plot.location) {
      if (payload.plot.location.type !== "Point") {
        errors.push("plot.location.type must be 'Point'");
      }
      if (
        !Array.isArray(payload.plot.location.coordinates) ||
        payload.plot.location.coordinates.length !== 2
      ) {
        errors.push("plot.location.coordinates must be [longitude, latitude]");
      }
    }

    // Validate boundary format
    if (payload.plot.boundary) {
      if (payload.plot.boundary.type !== "Polygon") {
        errors.push("plot.boundary.type must be 'Polygon'");
      }
      if (!Array.isArray(payload.plot.boundary.coordinates)) {
        errors.push("plot.boundary.coordinates must be an array");
      }
    }
  }

  // Validate farm object
  if (!payload.farm) {
    errors.push("Missing 'farm' object");
  } else {
    const requiredFarmFields = ["address", "area_size"];
    requiredFarmFields.forEach((field) => {
      if (!payload.farm[field]) {
        errors.push(`Missing farm.${field}`);
      }
    });
  }

  // Validate irrigation object
  if (!payload.irrigation) {
    errors.push("Missing 'irrigation' object");
  }

  if (errors.length > 0) {
    console.error("❌ Payload Validation Errors:");
    errors.forEach((error) => console.error(`  - ${error}`));
    return false;
  }

  console.log("✅ Payload validation passed");
  return true;
};

// KML/GeoJSON API functions
export const getKMLData = async () => {
  try {
    const response = await axios.get(KML_API_URL);
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch KML data:', error);
    throw new Error(`Failed to fetch KML data: ${error.response?.data?.detail || error.message}`);
  }
};

// Get KML data with authentication (if needed)
export const getKMLDataWithAuth = async (token?: string) => {
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await axios.get(KML_API_URL, { headers });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch KML data:', error);
    throw new Error(`Failed to fetch KML data: ${error.response?.data?.detail || error.message}`);
  }
};

export default api; 