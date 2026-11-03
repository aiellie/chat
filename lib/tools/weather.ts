import { tool } from "ai";
import { z } from "zod";

function conditionOf(code: number) {
    if (code === 0) return "Clear";
    if (code <= 3) return "Partly cloudy";
    if (code <= 48) return "Fog";
    if (code <= 67) return "Rain";
    if (code <= 77) return "Snow";
    if (code <= 82) return "Showers";
    return "Thunderstorm";
  }
export const getWeather = tool({
    description: "Get the current weather and a short forecast for a place.",
    inputSchema: z.object({
        location: z.string().describe("City name, like NYC"),
      }),
      execute: async ({ location }) => {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(location)}`
        ).then((r) => r.json());
        const place = geo.results?.[0];
        if (!place) throw new Error(`Couldn't find ${location}.`);
      
        const data = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1`
        ).then((r) => r.json());
      
        return {
          location: place.name,
          temperature: Math.round(data.current.temperature_2m),
          condition: conditionOf(data.current.weather_code),          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          wind: Math.round(data.current.wind_speed_10m),
        };
      },
    });