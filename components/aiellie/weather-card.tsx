"use client";

import type { ToolUIPart } from "ai";

export function WeatherCard({ part }: { part: ToolUIPart }) {
    if (part.state === "input-streaming" || part.state === "input-available") {
        return (
            <div className="w-full max-w-sm rounded-xl border bg-card p-4" aria-busy="true">
              <p className="text-sm text-muted-foreground">Checking the weather…</p>
              <div className="mt-2 h-9 w-28 animate-pulse rounded-md bg-muted" />
              <div className="mt-3 h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
          );
              }
      if (part.state === "output-error") {
        return <div className="text-sm text-destructive">Couldn't get the weather. {part.errorText}</div>;
      }
      const weather = part.output as {
        location: string; temperature: number; condition: string;
        high: number; low: number; wind: number;
      };
      
      return (
        <div className="w-full max-w-sm rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">{weather.location}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums">{weather.temperature}°C</span>
            <span className="text-sm">{weather.condition}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground tabular-nums">
            High {weather.high}° · Low {weather.low}° · Wind {weather.wind} km/h
          </p>
        </div>
      );}