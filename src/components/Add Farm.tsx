// Fixed AddFarm.tsx - Village moved to Plot Profile, Individual Plot Details with Location Pin
import React, { useRef, useState, useEffect } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap, Marker, Popup } from "react-leaflet";
import {
  User,
  Mail,
  Phone,
  Home,
  Building,
  Map,
  FileText,
  Ruler,
  Droplets,
  Plus,
  Trash2,
  MapPin,
} from "lucide-react";
import { EditControl } from "react-leaflet-draw";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import { getCropTypes, registerFarmerAllInOneOnly } from "../api";
import * as turf from "@turf/turf";

// Fix default marker icons for Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Plot {
  id: string;
  geometry: any;
  area: {
    sqm: number;
    ha: number;
    acres: number;
  };
  layer: L.Layer;
  GroupGatNo: string;
  GatNoId: string;
  village: string;
  pin_code: string;
  crop_type: string;
  plantation_Type: string;
  plantation_Method: string;
  plantation_Date: string;
  irrigation_Type: string;
  // Drip irrigation fields
  plants_Per_Acre: string;
  spacing_A: string;
  spacing_B: string;
  flow_Rate: string;
  emitters: string;
  // Flood irrigation fields
  motor_Horsepower: string;
  pipe_Width: string;
  distance_From_Motor: string;
}

interface FarmerData {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  confirm_password: string;
  email: string;
  phone_number: string;
  address: string;
  taluka: string;
  state: string;
  district: string;
  documents: FileList | null;
}

interface IconVisibility {
  [key: string]: boolean;
}

interface LocationPin {
  position: [number, number];
  address?: string;
}

// Location data will be loaded from JSON file
let locationData: any = {};
let states: string[] = [];

// Helper functions to get districts and talukas
const getDistrictsByState = (state: string): string[] => {
  if (!state || !locationData[state]) {
    return [];
  }
  return Object.keys(locationData[state]);
};

const getTalukasByDistrict = (state: string, district: string): string[] => {
  if (!state || !district || !locationData[state]) {
    return [];
  }
  return locationData[state][district] || [];
};

const plantationTypes = ["Adsali", "Suru", "Pre-seasonal", "Ratoon"];
const plantationMethods = ["3 bud", "2 bud", "1 bud", "1 bud (Stip Method)"];

function RecenterMap({ latlng }: { latlng: [number, number] }) {
  const map = useMap();
  map.setView(latlng, 17);
  return null;
}

function parseLatLngFromLink(link: string): [number, number] | null {
  // Google Maps: .../@lat,lng,... or .../place/lat,lng or ...?q=lat,lng
  const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const regex2 = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const regex3 = /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/;

  let match = link.match(regex);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];

  match = link.match(regex2);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];

  match = link.match(regex3);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];

  return null;
}

async function resolveShortLink(shortUrl: string): Promise<string> {
  // Use a public CORS proxy (for demo/testing only)
  const proxyUrl = "https://corsproxy.io/?";
  try {
    const response = await fetch(proxyUrl + encodeURIComponent(shortUrl), {
      method: "GET",
      redirect: "follow",
    });
    // The final URL after redirects
    return response.url;
  } catch (e) {
    throw new Error("Could not resolve short link");
  }
}

// Reverse geocoding function to get address from coordinates
async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

function AddFarm() {
  const [formData, setFormData] = useState<FarmerData>({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirm_password: "",
    email: "",
    phone_number: "",
    address: "",
    taluka: "",
    state: "",
    district: "",
    documents: null,
  });

  const [showIcons, setShowIcons] = useState<IconVisibility>({
    first_name: true,
    last_name: true,
    username: true,
    password: true,
    confirm_password: true,
    email: true,
    phone_number: true,
    address: true,
    taluka: true,
    state: true,
    district: true,
  });

  // Multiple plots state
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [center, setCenter] = useState<[number, number]>([18.5204, 73.8567]);
  const [locationPin, setLocationPin] = useState<LocationPin | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [areaError, setAreaError] = useState<string | null>(null);
  const [locationLink, setLocationLink] = useState("");
  const [locationLinkError, setLocationLinkError] = useState("");
  const [cropTypes, setCropTypes] = useState<
    Array<{
      id: number;
      crop_type: string;
      plantation_type: string;
      planting_method: string;
    }>
  >([]);

  // State for filtered districts and talukas
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);
  const [filteredTalukas, setFilteredTalukas] = useState<string[]>([]);

  // Phone number validation state
  const [phoneError, setPhoneError] = useState('');
  const [showPhoneTooltip, setShowPhoneTooltip] = useState(false);

  // Email validation state
  const [emailError, setEmailError] = useState('');
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);

  // Phone number validation pattern
  const phonePattern = /^[0-9]{10}$/;

  // Email validation pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Test phone number validation examples (for demonstration)
  const testPhoneValidation = () => {
    const phoneNumbers = [
      "1234567890",     // ✅ valid
      "0123456789",     // ✅ valid
      "123-456-7890",   // ❌ invalid (dash not allowed)
      "123 456 7890",   // ❌ invalid (space not allowed)
      "123.456.7890",   // ❌ invalid (dot not allowed)
      "+11234567890",   // ❌ invalid (country code not allowed)
      "12345678"        // ❌ invalid (not 10 digits)
    ];

    console.log("Phone Number Validation Test:");
    phoneNumbers.forEach(number => {
      if (phonePattern.test(number)) {
        console.log(`✅ Valid: ${number}`);
      } else {
        console.log(`❌ Invalid: ${number}`);
      }
    });
  };

  // Test email validation examples (for demonstration)
  const testEmailValidation = () => {
    const emails = [
      "user@example.com",        // ✅ valid
      "user.name@domain.co.in",  // ✅ valid
      "user-name@domain.com",    // ✅ valid
      "user@domain",             // ❌ invalid (no TLD)
      "user@domain.",            // ❌ invalid (dot at end)
      "user@.com",               // ❌ invalid (no domain before dot)
      "user@@domain.com",        // ❌ invalid (double @)
      "user domain@com"          // ❌ invalid (space not allowed)
    ];

    console.log("Email Validation Test:");
    emails.forEach(email => {
      if (emailPattern.test(email)) {
        console.log(`✅ Valid: ${email}`);
      } else {
        console.log(`❌ Invalid: ${email}`);
      }
    });
  };

  // Uncomment the lines below to test validation in console
  // testPhoneValidation();
  // testEmailValidation();

  const mapRef = useRef(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  // Load location data from JSON file
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        const response = await fetch('/location-data-part1.json');
        const data = await response.json();
        locationData = data;
        states = Object.keys(data);
        console.log("✅ Location data loaded:", states.length, "states");
      } catch (error) {
        console.error("❌ Failed to load location data:", error);
      }
    };

    loadLocationData();
  }, []);

  // Fetch crop types on component mount
  useEffect(() => {
    const fetchCropTypes = async () => {
      try {
        const response = await getCropTypes();
        setCropTypes(response.data.results || response.data);
        console.log(
          "✅ Crop types loaded:",
          response.data.results || response.data
        );
      } catch (error) {
        console.error("❌ Failed to load crop types:", error);
      }
    };

    fetchCropTypes();
  }, []);

  // Update filtered districts and talukas when state or district changes
  useEffect(() => {
    if (formData.state) {
      const districts = getDistrictsByState(formData.state);
      setFilteredDistricts(districts);
      
      // Reset district and taluka when state changes
      if (formData.district && !districts.includes(formData.district)) {
        setFormData(prev => ({ ...prev, district: "", taluka: "" }));
        setFilteredTalukas([]);
      } else if (formData.district) {
        const talukas = getTalukasByDistrict(formData.state, formData.district);
        setFilteredTalukas(talukas);
      }
    } else {
      setFilteredDistricts([]);
      setFilteredTalukas([]);
    }
  }, [formData.state]);

  useEffect(() => {
    if (formData.state && formData.district) {
      const talukas = getTalukasByDistrict(formData.state, formData.district);
      setFilteredTalukas(talukas);
      
      // Reset taluka if it's not in the new list
      if (formData.taluka && !talukas.includes(formData.taluka)) {
        setFormData(prev => ({ ...prev, taluka: "" }));
      }
    } else {
      setFilteredTalukas([]);
    }
  }, [formData.district]);

  // Calculate total area from all plots
  const getTotalArea = () => {
    return plots.reduce(
      (total, plot) => ({
        sqm: total.sqm + plot.area.sqm,
        ha: total.ha + plot.area.ha,
        acres: total.acres + plot.area.acres,
      }),
      { sqm: 0, ha: 0, acres: 0 }
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "state" && { district: "", taluka: "" }),
      ...(name === "district" && { taluka: "" }),
    }));

    setShowIcons((prev) => ({
      ...prev,
      [name]: value === "",
    }));
  };

  // Phone number validation function
  const validatePhoneNumber = (phone: string): boolean => {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it matches the pattern exactly
    if (!phonePattern.test(cleanPhone)) {
      if (cleanPhone.length === 0) {
        setPhoneError('');
      } else if (cleanPhone.length < 10) {
        setPhoneError('Enter 10 digit number');
      } else if (cleanPhone.length > 10) {
        setPhoneError('Phone number must be exactly 10 digits');
      } else {
        setPhoneError('Only numbers are allowed');
      }
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  // Handle phone number input with validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow digits
    const cleanValue = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedValue = cleanValue.slice(0, 10);
    
    // Update form data
    setFormData((prev) => ({
      ...prev,
      phone_number: limitedValue,
    }));

    setShowIcons((prev) => ({
      ...prev,
      phone_number: limitedValue === "",
    }));
    
    // Validate in real-time
    if (limitedValue.length > 0) {
      validatePhoneNumber(limitedValue);
      setShowPhoneTooltip(true);
    } else {
      setPhoneError('');
      setShowPhoneTooltip(false);
    }
  };

  // Email validation function
  const validateEmail = (email: string): boolean => {
    if (email.length === 0) {
      setEmailError('');
      return true; // Empty email is allowed (not required field)
    }
    
    if (!emailPattern.test(email)) {
      if (!email.includes('@')) {
        setEmailError('Email must contain @ symbol');
      } else if (email.indexOf('@') !== email.lastIndexOf('@')) {
        setEmailError('Email can only contain one @ symbol');
      } else if (email.includes(' ')) {
        setEmailError('Email cannot contain spaces');
      } else if (!email.includes('.')) {
        setEmailError('Email must contain a domain extension');
      } else if (email.endsWith('.')) {
        setEmailError('Email cannot end with a dot');
      } else if (email.startsWith('@') || email.endsWith('@')) {
        setEmailError('Email cannot start or end with @ symbol');
      } else {
        setEmailError('Please enter a valid email address');
      }
      return false;
    }
    
    setEmailError('');
    return true;
  };

  // Handle email input with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Update form data
    setFormData((prev) => ({
      ...prev,
      email: value,
    }));

    setShowIcons((prev) => ({
      ...prev,
      email: value === "",
    }));
    
    // Validate in real-time
    if (value.length > 0) {
      validateEmail(value);
      setShowEmailTooltip(true);
    } else {
      setEmailError('');
      setShowEmailTooltip(false);
    }
  };

  const handleSearch = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      setCenter([latNum, lngNum]);
      
      // Get address for the location pin
      const address = await getAddressFromCoords(latNum, lngNum);
      
      // Set location pin
      setLocationPin({
        position: [latNum, lngNum],
        address: address,
      });
    } else {
      alert("Please enter valid latitude and longitude.");
    }
  };


  
  const handleLocationLink = async () => {
    let link = locationLink.trim();
    let finalUrl = link;

    if (link.startsWith("https://maps.app.goo.gl/")) {
      // Resolve short link
      try {
        finalUrl = await resolveShortLink(link);
      } catch (e) {
        setLocationLinkError("Could not resolve short link.");
        return;
      }
    }

    const coords = parseLatLngFromLink(finalUrl);
    if (coords) {
      setLat(coords[0].toString());
      setLng(coords[1].toString());
      setCenter([coords[0], coords[1]]);
      
      // Get address for the location pin
      const address = await getAddressFromCoords(coords[0], coords[1]);
      
      // Set location pin
      setLocationPin({
        position: [coords[0], coords[1]],
        address: address,
      });
      
      setLocationLinkError("");
    } else {
      setLocationLinkError(
        "Could not extract coordinates from the link. Please check the link format."
      );
    }
  };

  const handleShareCurrentLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Generate a Google Maps share link
          const shareLink = `https://maps.google.com/?q=${latitude},${longitude}`;
          setLocationLink(shareLink);
          
          // Auto-parse and update the map
          setLat(latitude.toString());
          setLng(longitude.toString());
          setCenter([latitude, longitude]);
          
          // Get address for the location pin
          const address = await getAddressFromCoords(latitude, longitude);
          
          // Set location pin
          setLocationPin({
            position: [latitude, longitude],
            address: address,
          });
          
          setLocationLinkError("");
        },
        () => {
          setLocationLinkError("Unable to get your current location.");
        }
      );
    } else {
      setLocationLinkError("Geolocation is not supported by this browser.");
    }
  };

  const handleAddPlot = () => {
    setIsDrawingMode(true);
    setAreaError(null);
  };

  const handleDrawCreated = (e: any) => {
    const layer = e.layer;
    const geoJson = layer.toGeoJSON();

    if (geoJson.geometry.type === "Polygon") {
      const points = geoJson.geometry.coordinates[0].length - 1; // last point repeats first
      if (points < 3) {
        alert("A polygon must have at least 3 points.");
        return;
      }

      // Calculate area using turf.js
      const areaSqm = turf.area(geoJson); // in square meters
      const areaHa = areaSqm / 10000;
      const areaAcres = areaSqm / 4046.85642;

      const newPlotArea = {
        sqm: areaSqm,
        ha: areaHa,
        acres: areaAcres,
      };



      setAreaError(null);

      // Create new plot with all plot profile fields
      const newPlot: Plot = {
        id: `plot-${Date.now()}`,
        geometry: geoJson.geometry,
        area: newPlotArea,
        layer: layer,
        GroupGatNo: "",
        GatNoId: "",
        village: "",
        pin_code: "",
        crop_type: "2", // Fixed crop type ID for sugarcane
        plantation_Type: "",
        plantation_Method: "",
        plantation_Date: "",
        irrigation_Type: "",
        plants_Per_Acre: "",
        spacing_A: "",
        spacing_B: "",
        flow_Rate: "",
        emitters: "",
        motor_Horsepower: "",
        pipe_Width: "",
        distance_From_Motor: "",
      };

      // Add plot to the list
      setPlots((prev) => [...prev, newPlot]);
      setIsDrawingMode(false);

      // Add a label to the plot
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      const plotNumber = plots.length + 1;

      // Create a marker with plot info
      const plotMarker = L.marker(center, {
        icon: L.divIcon({
          className: "plot-label",
          html: `<div style="background: white; border: 2px solid #059669; border-radius: 4px; padding: 4px 8px; font-weight: bold; font-size: 12px; color: #059669;">Plot ${plotNumber}<br/>${areaAcres.toFixed(
            2
          )} acres</div>`,
          iconSize: [80, 40],
          iconAnchor: [40, 20],
        }),
      });

      if (featureGroupRef.current) {
        featureGroupRef.current.addLayer(plotMarker);
      }
    }
  };

  // Function to update plot details
  const handlePlotDetailChange = (
    plotId: string,
    field: string,
    value: string
  ) => {
    setPlots((prev) =>
      prev.map((plot) =>
        plot.id === plotId ? { ...plot, [field]: value } : plot
      )
    );
  };

  const handleDeletePlot = (plotId: string) => {
    setPlots((prev) => {
      const plotToDelete = prev.find((p) => p.id === plotId);
      if (plotToDelete && featureGroupRef.current) {
        featureGroupRef.current.removeLayer(plotToDelete.layer);

        // Also remove associated markers
        featureGroupRef.current.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            featureGroupRef.current?.removeLayer(layer);
          }
        });

        // Re-add remaining plot markers with updated numbers
        const remainingPlots = prev.filter((p) => p.id !== plotId);
        remainingPlots.forEach((plot, index) => {
          const bounds = (plot.layer as any).getBounds();
          const center = bounds.getCenter();
          const plotNumber = index + 1;

          const plotMarker = L.marker(center, {
            icon: L.divIcon({
              className: "plot-label",
              html: `<div style="background: white; border: 2px solid #059669; border-radius: 4px; padding: 4px 8px; font-weight: bold; font-size: 12px; color: #059669;">Plot ${plotNumber}<br/>${plot.area.acres.toFixed(
                2
              )} acres</div>`,
              iconSize: [80, 40],
              iconAnchor: [40, 20],
            }),
          });

          if (featureGroupRef.current) {
            featureGroupRef.current.addLayer(plotMarker);
          }
        });
      }

      return prev.filter((p) => p.id !== plotId);
    });
  };

  const handleCaptureMap = async () => {
    const container = document.querySelector(
      ".leaflet-container"
    ) as HTMLElement;
    if (container) {
      const canvas = await html2canvas(container);
      const link = document.createElement("a");
      link.download = "farm-map.png";
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Handle file input changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      documents: e.target.files,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (formData.password !== formData.confirm_password) {
      setSubmitStatus("error");
      setSubmitMessage("Passwords do not match.");
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(formData.phone_number)) {
      setSubmitStatus("error");
      setSubmitMessage("Please enter a valid 10-digit phone number.");
      setShowPhoneTooltip(true);
      return;
    }

    // Validate email (if provided)
    if (formData.email && !validateEmail(formData.email)) {
      setSubmitStatus("error");
      setSubmitMessage("Please enter a valid email address.");
      setShowEmailTooltip(true);
      return;
    }

    // Validate required fields
    const requiredFields = [
      "first_name",
      "last_name",
      "username",
      "password",
      "email",
      "phone_number",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof FarmerData]
    );

    if (missingFields.length > 0) {
      setSubmitStatus("error");
      setSubmitMessage(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      return;
    }

    if (plots.length === 0) {
      setSubmitStatus("error");
      setSubmitMessage("Please add at least one plot to your farm.");
      return;
    }

    if (areaError) {
      setSubmitStatus("error");
      setSubmitMessage(areaError);
      return;
    }


    
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      console.log("🚀 Starting farmer registration process");
      console.log(
        `📊 Registering farmer with ${plots.length} plot${
          plots.length !== 1 ? "s" : ""
        }`
      );

      // Use all-in-one registration API for all users
      const registrationResult = await registerFarmerAllInOneOnly(
        formData,
        plots
      );

      console.log(
        "✅ Registration completed successfully:",
        registrationResult
      );

      // SUCCESS: Registration completed
      const totalArea = getTotalArea();
      setSubmitStatus("success");

      // Success message for all-in-one API
      setSubmitMessage(`🎉 Farmer Registration Completed Successfully!
🎯 Next Steps:
The farmer can now login with Emailcredentials to access the dashboard and monitor their crops!`);

      // Reset form after successful submission
      setFormData({
        first_name: "",
        last_name: "",
        username: "",
        password: "",
        confirm_password: "",
        email: "",
        phone_number: "",
        address: "",
        taluka: "",
        state: "",
        district: "",
        documents: null,
      });

      // Clear plots and map
      setPlots([]);
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
      setLat("");
      setLng("");
      setLocationPin(null); // Clear location pin
      setLocationPin(null); // Clear location pin
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
      setSubmitStatus("error");
      setSubmitMessage(
        `An unexpected error occurred: ${
          error.message || "Please try again."
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to render form fields
  const renderFormField = (key: string, value: string) => {
    const getFieldIcon = (fieldName: string) => {
      if (fieldName.includes("email")) return <Mail size={20} />;
      if (fieldName.includes("phone")) return <Phone size={20} />;
      if (fieldName.includes("address")) return <Home size={20} />;
      if (fieldName.includes("village")) return <Building size={20} />;
      if (fieldName.includes("pin")) return <Map size={20} />;
      if (fieldName.includes("gat")) return <FileText size={20} />;
      if (fieldName.includes("area")) return <Ruler size={20} />;
      if (fieldName.includes("irrigation")) return <Droplets size={20} />;
      return <User size={20} />;
    };

    const getFieldOptions = (fieldName: string) => {
      switch (fieldName) {
        case "state":
          return states;
        case "district":
          return filteredDistricts;
        case "taluka":
          return filteredTalukas;
        case "plantation_Type":
          // Use plantation_type from crop types API
          return cropTypes.length > 0
            ? [...new Set(cropTypes.map((crop) => crop.plantation_type))]
            : plantationTypes;
        case "plantation_Method":
          // Use planting_method from crop types API
          return cropTypes.length > 0
            ? [...new Set(cropTypes.map((crop) => crop.planting_method))]
            : plantationMethods;
        case "irrigation_Type":
          return ["drip", "flood"];
        default:
          return null;
      }
    };

    const options = getFieldOptions(key);
    const isSelectField = options !== null;

    return (
      <div key={key} className="relative">
        <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
          {key.replace("_", " ").replace("number", "Number")} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          {isSelectField ? (
            <select
              name={key}
              value={value}
              onChange={handleInputChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
            >
              <option value="">Select {key.replace("_", " ")}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={
                key === "email"
                  ? "email"
                  : key === "plantation_Date"
                  ? "date"
                  : key === "password" || key === "confirm_password"
                  ? "password"
                  : key === "phone_number"
                  ? "tel"
                  : "text"
              }
              name={key}
              placeholder={`Enter ${key.replace("_", " ")}`}
              value={value}
              onChange={
                key === "phone_number" ? handlePhoneChange : 
                key === "email" ? handleEmailChange : 
                handleInputChange
              }
              onFocus={
                key === "phone_number" ? () => setShowPhoneTooltip(true) : 
                key === "email" ? () => setShowEmailTooltip(true) : 
                undefined
              }
              onBlur={
                key === "phone_number" ? () => setTimeout(() => setShowPhoneTooltip(false), 300) : 
                key === "email" ? () => setTimeout(() => setShowEmailTooltip(false), 300) : 
                undefined
              }
              maxLength={key === "phone_number" ? 10 : undefined}
              className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm transition-colors ${
                (key === "phone_number" && phoneError) || (key === "email" && emailError)
                  ? 'border-red-500 bg-red-50' 
                  : (key === "phone_number" && value.length === 10 && !phoneError) || 
                    (key === "email" && value.length > 0 && !emailError && emailPattern.test(value))
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300'
              }`}
            />
          )}
          {showIcons[key] && (
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {getFieldIcon(key)}
            </span>
          )}

          {/* Phone number validation indicators */}
          {key === "phone_number" && (
            <>
              {/* Success indicator */}
              {value.length === 10 && !phoneError && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 text-lg">
                  ✓
                </div>
              )}
              
              {/* Error indicator */}
              {phoneError && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 text-lg">
                  ✗
                </div>
              )}

              {/* Phone Validation Tooltip */}
              {showPhoneTooltip && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg shadow-lg z-20 min-w-[280px]">
                  <div className="flex items-start">
                    <div className={`w-3 h-3 rounded-full mr-3 mt-1 ${
                      phoneError ? 'bg-red-500' : 
                      value.length === 10 ? 'bg-green-500' : 
                      'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-2">
                        {phoneError ? phoneError : 
                         value.length === 10 ? 'Valid phone number!' : 
                         'Phone Number Validation'}
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            value.length === 10 ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          Must be exactly 10 digits ({value.length}/10)
                        </div>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            /^\d+$/.test(value) ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          Only numbers allowed (no spaces, letters, or symbols)
                        </div>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            value.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          Current input: "{value || 'Empty'}"
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inline validation message */}
              {value.length > 0 && (
                <div className={`mt-2 text-sm ${
                  phoneError ? 'text-red-600' : 
                  value.length === 10 ? 'text-green-600' : 
                  'text-yellow-600'
                }`}>
                  {phoneError ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {phoneError}
                    </span>
                  ) : value.length === 10 ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Phone number is valid!
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      Enter {10 - value.length} more digits
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Email validation indicators */}
          {key === "email" && (
            <>
              {/* Success indicator */}
              {value.length > 0 && !emailError && emailPattern.test(value) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 text-lg">
                  ✓
                </div>
              )}
              
              {/* Error indicator */}
              {emailError && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 text-lg">
                  ✗
                </div>
              )}

              {/* Email Validation Tooltip */}
              {showEmailTooltip && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg shadow-lg z-20 min-w-[300px]">
                  <div className="flex items-start">
                    <div className={`w-3 h-3 rounded-full mr-3 mt-1 ${
                      emailError ? 'bg-red-500' : 
                      value.length > 0 && !emailError && emailPattern.test(value) ? 'bg-green-500' : 
                      'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-2">
                        {emailError ? emailError : 
                         value.length > 0 && !emailError && emailPattern.test(value) ? 'Valid email address!' : 
                         'Email Validation'}
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            value.includes('@') ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          Must contain @ symbol
                        </div>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            value.includes('.') ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          Must contain domain extension (.com, .org, etc.)
                        </div>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            !value.includes(' ') ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          No spaces allowed
                        </div>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            value.indexOf('@') === value.lastIndexOf('@') ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          Only one @ symbol allowed
                        </div>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            value.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          Current input: "{value || 'Empty'}"
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inline validation message */}
              {value.length > 0 && (
                <div className={`mt-2 text-sm ${
                  emailError ? 'text-red-600' : 
                  !emailError && emailPattern.test(value) ? 'text-green-600' : 
                  'text-yellow-600'
                }`}>
                  {emailError ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {emailError}
                    </span>
                  ) : !emailError && emailPattern.test(value) ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Email address is valid!
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      Enter a valid email address
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Helper function to render spacing field with A * B format
  const renderSpacingField = (plotId: string, spacingA: string, spacingB: string) => {
    const handleSpacingChange = (field: 'A' | 'B', value: string) => {
      if (field === 'A') {
        handlePlotDetailChange(plotId, 'spacing_A', value);
      } else {
        handlePlotDetailChange(plotId, 'spacing_B', value);
      }
    };

    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
          Spacing (A * B) <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="4"
              value={spacingA}
              onChange={(e) => handleSpacingChange('A', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm text-center"
            />
          </div>
          <div className="flex items-center justify-center w-8 h-8">
            <span className="text-gray-500 font-bold text-lg">*</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="5"
              value={spacingB}
              onChange={(e) => handleSpacingChange('B', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm text-center"
            />
          </div>
        </div>
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Ruler size={16} />
        </div>
      </div>
    );
  };

  // Helper function to render plot profile fields
  const renderPlotField = (plotId: string, key: string, value: string) => {
    const getFieldIcon = (fieldName: string) => {
      if (fieldName.includes("village")) return <Building size={16} />;
      if (fieldName.includes("pin")) return <Map size={16} />;
      if (fieldName.includes("gat")) return <FileText size={16} />;
      if (fieldName.includes("irrigation")) return <Droplets size={16} />;
      if (
        fieldName.includes("area") ||
        fieldName.includes("spacing") ||
        fieldName.includes("motor") ||
        fieldName.includes("pipe") ||
        fieldName.includes("distance")
      )
        return <Ruler size={16} />;
      return <User size={16} />;
    };

    const getFieldOptions = (fieldName: string) => {
      switch (fieldName) {
        case "plantation_Type":
          // Use plantation_type from crop types API
          return cropTypes.length > 0
            ? [...new Set(cropTypes.map((crop) => crop.plantation_type))]
            : plantationTypes;
        case "plantation_Method":
          // Use planting_method from crop types API
          return cropTypes.length > 0
            ? [...new Set(cropTypes.map((crop) => crop.planting_method))]
            : plantationMethods;
        case "irrigation_Type":
          return ["drip", "flood"];
        default:
          return null;
      }
    };

    const options = getFieldOptions(key);
    const isSelectField = options !== null;
    const isCropTypeField = key === "crop_type";

    return (
      <div key={key} className="relative">
        <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
          {key.replace("_", " ").replace("number", "Number")} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          {isCropTypeField ? (
            <div className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 sm:text-sm">
              Sugarcane
            </div>
          ) : isSelectField ? (
            <select
              value={value}
              onChange={(e) =>
                handlePlotDetailChange(plotId, key, e.target.value)
              }
              className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
            >
              <option value="">Select {key.replace("_", " ")}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={key === "plantation_Date" ? "date" : "text"}
              placeholder={`Enter ${key.replace("_", " ")}`}
              value={value}
              onChange={(e) =>
                handlePlotDetailChange(plotId, key, e.target.value)
              }
              className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          )}
          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            {getFieldIcon(key)}
          </span>
        </div>
      </div>
    );
  };

  const totalArea = getTotalArea();

  // Define the fields for each section - village moved from userProfileFields to plot fields
  const userProfileFields = [
    "first_name",
    "last_name",
    "username",
    "password",
    "confirm_password",
    "email",
    "phone_number",
    "address",
    "state",
    "district",
    "taluka",
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-2 sm:py-8 px-2 sm:px-4 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden">
          <div className="text-center bg-green-600 text-white py-4 sm:py-6 px-4 sm:px-8">
            <User className="mx-auto h-10 w-10 sm:h-14 sm:w-14 mb-2 sm:mb-3" />
            <h1 className="text-xl sm:text-3xl font-bold">Farmer Registration</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-green-100">
              Please fill in your details below
            </p>
          </div>

          {/* Status Messages */}
          {submitStatus === "success" && (
            <div className="m-2 sm:m-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm sm:text-base text-green-800">{submitMessage}</p>
            </div>
          )}

          {submitStatus === "error" && (
            <div className="m-2 sm:m-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm sm:text-base text-red-800">{submitMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-2 sm:p-8 space-y-4 sm:space-y-8">
            {/* Section 1: User Profile */}
            <div className="bg-gray-50 p-3 sm:p-6 rounded-lg">
              <div className="flex items-center mb-4 sm:mb-6">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  User Profile
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
                {userProfileFields.map((field) =>
                  renderFormField(
                    field,
                    formData[field as keyof FarmerData] as string
                  )
                )}
              </div>
              {/* File Upload */}
              <div className="mt-4 sm:mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documents
                </label>
                <input
                  type="file"
                  multiple
                  name="documents"
                  onChange={handleFileChange}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>
            </div>

            {/* Map Location and Plots Section */}
            <div className="bg-gray-50 p-3 sm:p-6 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                <div className="flex items-center">
                  <Map className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 mr-2" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Farm Location & Plots
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleAddPlot}
                  disabled={isDrawingMode}
                  className={`inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md ${
                    isDrawingMode
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  <Plus size={14} className="mr-1 sm:mr-2" />
                  Add Plot
                </button>
              </div>

              {/* Location Pin Display */}
              {locationPin && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center text-blue-800">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="font-semibold text-sm sm:text-base">Location Pin:</span>
                  </div>
                  <p className="text-blue-700 mt-1 text-sm sm:text-base">
                    📍 {locationPin.address}
                  </p>
                  <p className="text-blue-600 text-xs sm:text-sm">
                    Coordinates: {locationPin.position[0].toFixed(6)}, {locationPin.position[1].toFixed(6)}
                  </p>
                </div>
              )}

              {/* Plot Summary with Individual Plot Details */}
              {plots.length > 0 && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-semibold text-green-900 mb-3 text-sm sm:text-base">
                    Plot Details:
                  </h4>
                  <div className="space-y-4 sm:space-y-6">
                    {plots.map((plot, index) => (
                      <div
                        key={plot.id}
                        className="bg-white p-3 sm:p-6 rounded border"
                      >
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <div>
                            <span className="font-bold text-base sm:text-lg text-green-800">
                              Plot {index + 1}
                            </span>
                            <div className="text-xs sm:text-sm text-gray-600">
                              {plot.area.acres.toFixed(2)} acres (
                              {plot.area.ha.toFixed(2)} hectares)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePlot(plot.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>

                        {/* Basic Plot Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                          {renderPlotField(
                            plot.id,
                            "GroupGatNo",
                            plot.GroupGatNo
                          )}
                          {renderPlotField(plot.id, "GatNoId", plot.GatNoId)}
                          {renderPlotField(plot.id, "village", plot.village)}
                          {renderPlotField(plot.id, "pin_code", plot.pin_code)}
                          {renderPlotField(
                            plot.id,
                            "crop_type",
                            plot.crop_type
                          )}
                          {renderPlotField(
                            plot.id,
                            "plantation_Type",
                            plot.plantation_Type
                          )}
                          {renderPlotField(
                            plot.id,
                            "plantation_Method",
                            plot.plantation_Method
                          )}
                          {renderPlotField(
                            plot.id,
                            "plantation_Date",
                            plot.plantation_Date
                          )}
                          {renderPlotField(
                            plot.id,
                            "irrigation_Type",
                            plot.irrigation_Type
                          )}
                          {/* Spacing A and B fields - moved outside drip section */}
                          {renderSpacingField(plot.id, plot.spacing_A, plot.spacing_B)}
                        </div>

                        {/* Irrigation Details for Individual Plot */}
                        {plot.irrigation_Type && (
                          <div className="border-t pt-3 sm:pt-4">
                            <div className="flex items-center mb-3 sm:mb-4">
                              <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                              <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                                {plot.irrigation_Type === "drip"
                                  ? "Drip Irrigation Details"
                                  : "Flood Irrigation Details"}
                              </h4>
                            </div>
                            {plot.irrigation_Type === "drip" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {renderPlotField(
                                  plot.id,
                                  "plants_Per_Acre",
                                  plot.plants_Per_Acre
                                )}
                                {renderPlotField(
                                  plot.id,
                                  "flow_Rate",
                                  plot.flow_Rate
                                )}
                                {renderPlotField(
                                  plot.id,
                                  "emitters",
                                  plot.emitters
                                )}
                              </div>
                            ) : plot.irrigation_Type === "flood" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {renderPlotField(
                                  plot.id,
                                  "motor_Horsepower",
                                  plot.motor_Horsepower
                                )}
                                {renderPlotField(
                                  plot.id,
                                  "pipe_Width",
                                  plot.pipe_Width
                                )}
                                {renderPlotField(
                                  plot.id,
                                  "distance_From_Motor",
                                  plot.distance_From_Motor
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-green-300">
                    <div className="text-lg font-bold text-green-900">
                      Total Area: {totalArea.acres.toFixed(2)} acres (
                      {totalArea.ha.toFixed(2)} hectares)
                    </div>
                    <div className="text-sm text-green-700">
                      {plots.length} plot{plots.length !== 1 ? "s" : ""} •{" "}
                      {totalArea.sqm.toFixed(0)} sq meters
                    </div>
                  </div>
                </div>
              )}

              {isDrawingMode && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded">
                  <span className="text-xs sm:text-sm text-blue-700">
                    <b>Drawing Mode Active:</b> Use the polygon tool (pentagon
                    icon) to draw plot #{plots.length + 1}. Click each corner of
                    your plot, then click the first point to finish.
                  </span>
                </div>
              )}

              {/* Location Link Input */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
                <input
                  type="text"
                  placeholder="Paste Google Maps or share location link"
                  value={locationLink}
                  onChange={(e) => setLocationLink(e.target.value)}
                  className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                />
                <div className="flex gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleLocationLink}
                    className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-indigo-700 whitespace-nowrap text-xs sm:text-sm flex-1 sm:flex-none"
                  >
                    Use Link
                  </button>
                  <button
                    type="button"
                    onClick={handleShareCurrentLocation}
                    className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap text-xs sm:text-sm flex-1 sm:flex-none"
                  >
                    Share My Location
                  </button>
                </div>
              </div>
                {locationLinkError && (
                  <div className="text-red-600 text-sm">
                    {locationLinkError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
                  <div className="flex gap-2 sm:gap-4 flex-1">
                    <input
                      type="text"
                      placeholder="Latitude"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                    />
                    <input
                      type="text"
                      placeholder="Longitude"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            async (position) => {
                              const { latitude, longitude } = position.coords;
                              setLat(latitude.toString());
                              setLng(longitude.toString());
                              setCenter([latitude, longitude]);

                              // Get address for the location pin
                              const address = await getAddressFromCoords(latitude, longitude);
                              
                              // Set location pin
                              setLocationPin({
                                position: [latitude, longitude],
                                address: address,
                              });
                            },
                            () => {
                              alert(
                                "Unable to get your location. Please enter coordinates manually."
                              );
                            }
                          );
                        } else {
                          alert("Geolocation is not supported by this browser.");
                        }
                      }}
                      className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      Use My Location
                    </button>
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="border border-gray-300 rounded-lg overflow-hidden mt-4 relative">
                <MapContainer
                  center={center}
                  zoom={16}
                  style={{ height: "250px", width: "100%" }}
                  className="sm:h-[400px] mobile-draw-controls"
                  ref={mapRef}
                >
                  <TileLayer
                    url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    attribution="© Google"
                    maxZoom={25}
                    maxNativeZoom={21}
                    minZoom={1}
                    tileSize={256}
                    zoomOffset={0}
                  />
                  <RecenterMap latlng={center} />

                  {/* Location Pin Marker */}
                  {locationPin && (
                    <Marker position={locationPin.position}>
                      <Popup>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <MapPin className="h-5 w-5 text-red-500 mr-1" />
                            <span className="font-semibold">Search Location</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {locationPin.address}
                          </p>
                          <p className="text-xs text-gray-500">
                            {locationPin.position[0].toFixed(6)}, {locationPin.position[1].toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  <FeatureGroup ref={featureGroupRef}>
                    {isDrawingMode && (
                      <EditControl
                        position="topright"
                        onCreated={handleDrawCreated}
                        draw={{
                          polygon: true,
                          rectangle: false,
                          polyline: false,
                          circle: false,
                          marker: false,
                          circlemarker: false,
                        }}
                        edit={{
                          edit: false,
                          remove: true,
                        }}
                      />
                    )}
                  </FeatureGroup>
                </MapContainer>
              </div>

              {areaError && (
                <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-red-600 font-semibold">
                  {areaError}
                </div>
              )}
            </div>

            {/* Submit Section */}
            <div className="flex justify-center sm:justify-between items-center pt-4 sm:pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting || plots.length === 0}
                className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg text-white font-semibold text-sm sm:text-base ${
                  isSubmitting || plots.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isSubmitting
                  ? "Saving..."
                  : `Submit Farm (${plots.length} plot${
                      plots.length !== 1 ? "s" : ""
                    })`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddFarm;