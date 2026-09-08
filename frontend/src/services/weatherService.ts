import type { WeatherData } from '@/types';

// Map WMO Weather Interpretation Codes (WW)
function mapWeatherCode(code: number): { condition: 'sunny' | 'cloudy' | 'rain' | 'windy' | 'storm'; icon: string } {
  if (code === 0) return { condition: 'sunny', icon: '☀️' };
  if (code === 1 || code === 2) return { condition: 'cloudy', icon: '🌤️' };
  if (code === 3) return { condition: 'cloudy', icon: '☁️' };
  if (code >= 45 && code <= 48) return { condition: 'cloudy', icon: '🌫️' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { condition: 'rain', icon: '🌧️' };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { condition: 'rain', icon: '🌨️' };
  if (code >= 95 && code <= 99) return { condition: 'storm', icon: '⛈️' };
  return { condition: 'sunny', icon: '☀️' };
}

export async function fetchRealWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch live weather from Open-Meteo');
  const json = await res.json();

  const current = json.current;
  const daily = json.daily;

  const { condition } = mapWeatherCode(current.weather_code);

  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  // Slice next 3-4 days forecast (starting from tomorrow)
  const forecast = (daily.time as string[]).slice(1, 4).map((dateStr, idx) => {
    const date = new Date(dateStr);
    const dayName = daysOfWeek[date.getDay()];
    const code = daily.weather_code[idx + 1] ?? 0;
    const { icon } = mapWeatherCode(code);
    const maxTemp = Math.round(daily.temperature_2m_max[idx + 1] ?? 20);
    return {
      day: dayName,
      temp: maxTemp,
      icon,
    };
  });

  return {
    temp: Math.round(current.temperature_2m),
    condition,
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Number(current.wind_speed_10m.toFixed(1)),
    forecast,
  };
}
