"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

// Dynamically import echarts-for-react with SSR disabled (ECharts needs window)
const ReactEChartsCore = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
    </div>
  ),
});

// Consistent dark theme applied to all charts
const DARK_THEME: EChartsOption = {
  backgroundColor: "transparent",
  textStyle: {
    color: "#a1a1aa", // zinc-400
  },
  legend: {
    textStyle: {
      color: "#a1a1aa",
    },
  },
  tooltip: {
    backgroundColor: "rgba(30, 30, 40, 0.95)", // surface-3 approx
    borderColor: "#262630", // surface-4
    textStyle: {
      color: "#ffffff",
    },
    borderWidth: 1,
  },
  xAxis: {
    axisLine: { lineStyle: { color: "#262630" } },
    splitLine: { lineStyle: { color: "#262630" } },
    axisLabel: { color: "#a1a1aa" },
  },
  yAxis: {
    axisLine: { lineStyle: { color: "#262630" } },
    splitLine: { lineStyle: { color: "#262630" } },
    axisLabel: { color: "#a1a1aa" },
  },
};

function mergeTheme(option: EChartsOption): EChartsOption {
  return {
    ...DARK_THEME,
    ...option,
    textStyle: { ...DARK_THEME.textStyle, ...(option.textStyle as Record<string, unknown>) },
    tooltip: {
      ...(DARK_THEME.tooltip as Record<string, unknown>),
      ...(option.tooltip as Record<string, unknown>),
    },
  };
}

interface ChartProps {
  option: EChartsOption;
  height?: string;
  loading?: boolean;
}

export default function Chart({ option, height = "300px", loading = false }: ChartProps) {
  const merged = mergeTheme(option);

  if (loading) {
    return (
      <div style={{ height }} className="w-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ReactEChartsCore
      option={merged}
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
