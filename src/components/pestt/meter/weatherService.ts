
// services/weatherService.ts
import { WeatherData } from '../meter/pest';

const API_KEY = '63e31ed27cf649b78c554210250404';
const BASE_URL = 'http://192.168.41.120:8007/current-weather?lat=19.9993&lon=73.7900';

export const getWeatherData = async (location: string = 'Nasik'): Promise<WeatherData> => {
  try {
    const response = await fetch(`${BASE_URL}?key=${API_KEY}&q=${location}&aqi=yes`);
    if (!response.ok) throw new Error('Failed to fetch weather data');

    const data = await response.json();

    const weather: WeatherData = {
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      wind_kph: data.current.wind_kph,
      wind_dir: data.current.wind_dir,
      pressure_mb: data.current.pressure_mb,
      uv: data.current.uv,
      visibility_km: data.current.vis_km,
      location: `${data.location.name}, ${data.location.region}`
    };

    return weather;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return {
      temperature: 0,
      humidity: 0,
      wind_kph: 0,
      wind_dir: 'N/A',
      pressure_mb: 0,
      uv: 0,
      visibility_km: 0,
      location: 'Unknown'
    };
  }
};
