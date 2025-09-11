import { pestsData } from './pestsData';
import { diseasesData } from './diseasesData';

export interface WeatherData {
  temperature: number;
  humidity: number;
  month: string;
}

export interface RiskAssessmentResult {
  stage: string;
  current_conditions: {
    month: string;
    temperature: string;
    humidity: string;
  };
  pests: {
    High: string[];
    Moderate: string[];
    Low: string[];
  };
  diseases: {
    High: string[];
    Moderate: string[];
    Low: string[];
  };
}

export interface SugarcaneStage {
  name: string;
  minDays: number;
  maxDays: number;
}

export const SUGARCANE_STAGES: SugarcaneStage[] = [
  {
    name: "Germination & Early Growth",
    minDays: 0,
    maxDays: 45
  },
  {
    name: "Tillering & Early Stem Elongation",
    minDays: 46,
    maxDays: 120
  },
  {
    name: "Grand Growth Phase",
    minDays: 121,
    maxDays: 210
  },
  {
    name: "Ripening & Maturity",
    minDays: 211,
    maxDays: 365
  }
];

/**
 * Calculate sugarcane stage based on plantation date
 */
export function calculateSugarcaneStage(plantationDate: string): string {
  const today = new Date();
  const plantation = new Date(plantationDate);
  
  const daysSincePlantation = Math.floor((today.getTime() - plantation.getTime()) / (1000 * 60 * 60 * 24));
  
  for (const stage of SUGARCANE_STAGES) {
    if (daysSincePlantation >= stage.minDays && daysSincePlantation <= stage.maxDays) {
      return stage.name;
    }
  }
  
  // If beyond 365 days, return the last stage
  return "Ripening & Maturity";
}

/**
 * Check if temperature and humidity fall within pest/disease ranges
 */
function checkTemperatureHumidityMatch(
  pestTemp: string,
  pestHumidity: string,
  currentTemp: number,
  currentHumidity: number
): { tempMatch: boolean; humidityMatch: boolean } {
  // Parse temperature range (e.g., "28-32" -> min: 28, max: 32)
  const tempRange = pestTemp.split('-').map(t => parseFloat(t.trim()));
  const tempMin = tempRange[0];
  const tempMax = tempRange[1];
  
  // Parse humidity range (e.g., "70-80" -> min: 70, max: 80)
  const humidityRange = pestHumidity.split('-').map(h => parseFloat(h.trim()));
  const humidityMin = humidityRange[0];
  const humidityMax = humidityRange[1];
  
  const tempMatch = currentTemp >= tempMin && currentTemp <= tempMax;
  const humidityMatch = currentHumidity >= humidityMin && currentHumidity <= humidityMax;
  
  return { tempMatch, humidityMatch };
}

/**
 * Assess pest risk based on stage, month, temperature, and humidity
 */
function assessPestRisk(
  pest: any,
  currentStage: string,
  currentMonth: string,
  currentTemp: number,
  currentHumidity: number
): 'High' | 'Moderate' | 'Low' | null {
  // Check if stage matches (for now, we'll skip stage matching since we don't have stage data in pests)
  // const stageMatch = pest.stage === currentStage || pest.stage === "(any stage)";
  
  // Check if month matches
  const monthMatch = pest.months.includes(currentMonth);
  
  // Check temperature and humidity
  const { tempMatch, humidityMatch } = checkTemperatureHumidityMatch(
    pest.temperature,
    pest.humidity,
    currentTemp,
    currentHumidity
  );
  
  // Risk assessment logic
  if (monthMatch && tempMatch && humidityMatch) {
    return 'High';
  } else if (monthMatch && (tempMatch || humidityMatch)) {
    return 'Moderate';
  } else if (!monthMatch && tempMatch && humidityMatch) {
    return 'Low';
  }
  
  return null;
}

/**
 * Assess disease risk based on stage, month, temperature, and humidity
 */
function assessDiseaseRisk(
  disease: any,
  currentStage: string,
  currentMonth: string,
  currentTemp: number,
  currentHumidity: number
): 'High' | 'Moderate' | 'Low' | null {
  // Check if month matches
  const monthMatch = disease.months.includes(currentMonth);
  
  // Check temperature and humidity from conditions
  let tempMatch = false;
  let humidityMatch = false;
  
  if (disease.conditions && disease.conditions.length > 0) {
    for (const condition of disease.conditions) {
      const tempRange = condition.temperatureRange.replace('°C', '').split('–').map((t: string) => parseFloat(t.trim()));
      const humidityRange = condition.humidityRange.replace('%', '').split('–').map((h: string) => parseFloat(h.trim()));
      
      const tempMin = tempRange[0];
      const tempMax = tempRange[1];
      const humidityMin = humidityRange[0];
      const humidityMax = humidityRange[1];
      
      if (currentTemp >= tempMin && currentTemp <= tempMax) {
        tempMatch = true;
      }
      if (currentHumidity >= humidityMin && currentHumidity <= humidityMax) {
        humidityMatch = true;
      }
    }
  }
  
  // Risk assessment logic
  if (monthMatch && tempMatch && humidityMatch) {
    return 'High';
  } else if (monthMatch && (tempMatch || humidityMatch)) {
    return 'Moderate';
  } else if (!monthMatch && tempMatch && humidityMatch) {
    return 'Low';
  }
  
  return null;
}

/**
 * Main function to generate pest and disease risk assessment
 */
export async function generateRiskAssessment(
  plantationDate: string,
  weatherData: WeatherData
): Promise<RiskAssessmentResult> {
  try {
  // Calculate current sugarcane stage
  const currentStage = calculateSugarcaneStage(plantationDate);
    
    // Extract current conditions
    const currentMonth = weatherData.month;
    const currentTemp = weatherData.temperature;
    const currentHumidity = weatherData.humidity;
    
    // Initialize result
    const result: RiskAssessmentResult = {
      stage: currentStage,
      current_conditions: {
        month: currentMonth,
        temperature: `${currentTemp}°C`,
        humidity: `${currentHumidity}%`
      },
      pests: {
        High: [],
        Moderate: [],
        Low: []
      },
      diseases: {
        High: [],
        Moderate: [],
        Low: []
      }
    };
    
    // Assess pest risks
    for (const pest of pestsData) {
      const riskLevel = assessPestRisk(
        pest,
        currentStage,
        currentMonth,
        currentTemp,
        currentHumidity
      );
      
      if (riskLevel) {
        result.pests[riskLevel].push(pest.name);
      }
    }
    
    // Assess disease risks
    for (const disease of diseasesData) {
      const riskLevel = assessDiseaseRisk(
        disease,
        currentStage,
        currentMonth,
        currentTemp,
        currentHumidity
      );
      
      if (riskLevel) {
        result.diseases[riskLevel].push(disease.name);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error generating risk assessment:', error);
    throw new Error('Failed to generate risk assessment');
  }
}

/**
 * Fetch plantation date from farmer profile API
 */
export async function fetchPlantationDate(): Promise<string> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // First try to get user data
    let response = await fetch('http://192.168.41.73:8000/api/users/me/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const userData = await response.json();
    console.log('User data for plantation date:', userData);
    
    // Try to get farms for this user
    try {
      const farmsResponse = await fetch(`http://192.168.41.73:8000/api/farms/?farmer_id=${userData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (farmsResponse.ok) {
        const farmsData = await farmsResponse.json();
        const farms = farmsData.results || farmsData || [];
        console.log('Farms data for plantation date:', farms);
        
        // Look for plantation date in farms data
        if (farms.length > 0) {
          const firstFarm = farms[0];
          if (firstFarm.plantation_date) {
            return firstFarm.plantation_date;
          }
        }
      }
    } catch (farmsError) {
      console.warn('Could not fetch farms data for plantation date:', farmsError);
    }
    
    // Fallback to current date if no plantation date found
    return new Date().toISOString().split('T')[0];
    
  } catch (error) {
    console.error('Error fetching plantation date:', error);
    // Return today's date as fallback
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Fetch current weather data
 */
export async function fetchCurrentWeather(): Promise<WeatherData> {
  try {
    const response = await fetch('http://192.168.41.120:9005/current-weather?lat=19.9993&lon=73.7900');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract current month from the response
    const currentDate = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonth = monthNames[currentDate.getMonth()];
    
    return {
      temperature: data.temperature || 25,
      humidity: data.humidity || 70,
      month: currentMonth
    };
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // Return fallback data
    const currentDate = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonth = monthNames[currentDate.getMonth()];
    
    return {
      temperature: 25,
      humidity: 70,
      month: currentMonth
    };
  }
}
