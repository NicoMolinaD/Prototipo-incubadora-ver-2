import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { SeriesPoint } from "../api/types";

interface TimeSeriesChartProps {
  data: SeriesPoint[];
  dataKey: keyof SeriesPoint;
  name: string;
  unit: string;
  color?: string;
  height?: number;
}

export default function TimeSeriesChart({
  data,
  dataKey,
  name,
  unit,
  color = "#3b82f6",
  height = 300,
}: TimeSeriesChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    
    return data
      .filter((point) => point && point[dataKey] != null && !isNaN(point[dataKey] as number))
      .map((point) => {
        try {
          const date = new Date(point.ts);
          return {
            time: date.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            timestamp: date.getTime(),
            value: point[dataKey] as number,
          };
        } catch (e) {
          return null;
        }
      })
      .filter((item): item is { time: string; timestamp: number; value: number } => item !== null)
      .slice(-100); // Mostrar solo los últimos 100 puntos para mejor rendimiento
  }, [data, dataKey]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-slate-500">
        No hay datos disponibles
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart 
        data={chartData} 
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        key={`chart-${chartData.length}`} // Forzar re-render cuando cambien los datos
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="time"
          stroke="#64748b"
          style={{ fontSize: "12px" }}
          interval="preserveStartEnd"
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="#64748b"
          style={{ fontSize: "12px" }}
          label={{ value: unit, angle: -90, position: "insideLeft", style: { fontSize: "12px" } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "8px",
          }}
          labelStyle={{ color: "#1e293b", fontWeight: "bold" }}
          formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, name]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: color }}
          animationDuration={200}
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

