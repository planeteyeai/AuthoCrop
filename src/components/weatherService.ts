import { WeatherData } from '../types';

const API_URL = 'https://dev-weather.cropeye.ai/forecast?lat=19.355587&lon=75.219727';

/**
 * Parse number from string with units (e.g., "29.0 DegreeCel" -> 29.0)
 */
const parseNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value.replace(/[^\d.+-]/g, '')) || 0;
  return 0;
};

/**
 * Fetch current weather data from WeatherAPI
 */
export const fetchWeather = async (): Promise<WeatherData> => {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`Weather API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('WeatherService: API response:', data);
    
    // Get today's data (first item in the array)
    const todayData = data.data && data.data.length > 0 ? data.data[0] : null;
    
    if (!todayData) {
      throw new Error('No weather data available');
    }
    
    return {
      temperature: parseNumber(todayData.temperature_max),
      humidity: parseNumber(todayData.humidity_max),
      location: 'Shevgaon, Maharashtra', // Based on the API response location
      lastUpdated: new Date().toLocaleString()
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};

/**
 * Fetch 7-day forecast data
 */
export const fetchForecast = async () => {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`Weather API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('WeatherService: Forecast API response:', data);
    
    // Return tomorrow + next 6 days (skip today)
    const forecastData = data.data ? data.data.slice(1, 8) : [];
    
    return forecastData.map((day: any) => ({
      date: day.date,
      temperature_max: parseNumber(day.temperature_max),
      temperature_min: parseNumber(day.temperature_min),
      precipitation: parseNumber(day.precipitation),
      wind_speed_max: parseNumber(day.wind_speed_max),
      humidity_max: parseNumber(day.humidity_max)
    }));
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    throw error;
  }
};
