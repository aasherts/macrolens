import React, { forwardRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart._crosshairX) return;
    const { ctx, chartArea: { top, bottom } } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chart._crosshairX, top);
    ctx.lineTo(chart._crosshairX, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(164,57,28,0.2)';
    ctx.stroke();
    ctx.restore();
  }
};
ChartJS.register(crosshairPlugin);

// Loaded lazily (see App.js) so the chart.js bundle only downloads once
// a chart is actually needed, instead of blocking the initial page load.
const PriceChart = forwardRef(function PriceChart({ data, options }, ref) {
  return <Line ref={ref} data={data} options={options} />;
});

export default PriceChart;
