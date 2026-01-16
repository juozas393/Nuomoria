import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// ReferenceArea ir ReferenceLine plugin
const referencePlugin = {
  id: 'referenceArea',
  afterDraw: (chart: any) => {
    const { ctx, chartArea, scales } = chart;
    const y1Scale = scales.y1;
    
    if (!y1Scale) return;
    
    // ReferenceArea: 85-95% zona
    const y85 = y1Scale.getPixelForValue(85);
    const y95 = y1Scale.getPixelForValue(95);
    
    ctx.save();
    ctx.fillStyle = 'rgba(154, 164, 174, 0.1)';
    ctx.fillRect(chartArea.left, y85, chartArea.right - chartArea.left, y95 - y85);
    ctx.restore();
    
    // ReferenceLine: 95% linija
    const y95Line = y1Scale.getPixelForValue(95);
    ctx.save();
    ctx.strokeStyle = '#A0A4A8';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y95Line);
    ctx.lineTo(chartArea.right, y95Line);
    ctx.stroke();
    
    // Tikslas 95% label
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Tikslas 95%', chartArea.right - 8, y95Line - 8);
    ctx.restore();
  }
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  referencePlugin
);

type Pt = { label: string; value: number; vacantAvg: number; totalUnits?: number }; // value in %, vacantAvg = avg vacant units, totalUnits = total units in portfolio
interface Props {
  data: Pt[];                 // e.g., [{label:"Sau", value:91.4, vacantAvg:1.2}, ...]
  target?: number;            // e.g., 95
  minY?: number;              // e.g., 85
  height?: number;            // px, default 600
  onPointClick?: (label: string, index: number) => void;
  showAnnotations?: boolean;  // show warning pills for values < 90%
}

export default function OccupancyTrend({
  data,
  target = 95,
  minY = 85,
  height = 600,
  onPointClick,
  showAnnotations = true,
}: Props) {
  // Jei nėra duomenų, rodome example duomenis
  const exampleData = [
    { label: "Sau", value: 92.3, vacantAvg: 8 },     // 92.3% užimtumo = 8 laisvi vnt.
    { label: "Vas", value: 88.7, vacantAvg: 12 },     // 88.7% užimtumo = 12 laisvi vnt.
    { label: "Kov", value: 95.1, vacantAvg: 5 },      // 95.1% užimtumo = 5 laisvi vnt.
    { label: "Bal", value: 89.4, vacantAvg: 11 },      // 89.4% užimtumo = 11 laisvi vnt.
    { label: "Geg", value: 93.6, vacantAvg: 7 },       // 93.6% užimtumo = 7 laisvi vnt.
    { label: "Bir", value: 87.2, vacantAvg: 13 },     // 87.2% užimtumo = 13 laisvi vnt.
    { label: "Lie", value: 94.8, vacantAvg: 6 },      // 94.8% užimtumo = 6 laisvi vnt.
    { label: "Rgp", value: 91.5, vacantAvg: 9 },      // 91.5% užimtumo = 9 laisvi vnt.
    { label: "Rgs", value: 88.9, vacantAvg: 11 },     // 88.9% užimtumo = 11 laisvi vnt.
    { label: "Spa", value: 96.2, vacantAvg: 4 },      // 96.2% užimtumo = 4 laisvi vnt.
    { label: "Lap", value: 90.3, vacantAvg: 10 },     // 90.3% užimtumo = 10 laisvi vnt.
    { label: "Grd", value: 93.1, vacantAvg: 7 }       // 93.1% užimtumo = 7 laisvi vnt.
  ];

  // Visada naudojame example duomenis demo tikslais
  const displayData = exampleData;

  const chartData = {
    labels: displayData.map(d => d.label),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Vid. laisvi vnt.',
        data: displayData.map(d => d.vacantAvg),
        backgroundColor: 'rgba(47, 132, 129, 0.6)', // Stipresnis spalvintas plotas
        borderColor: '#2F8481', // Projekto primary spalva
        borderWidth: 2,
        borderRadius: 8, // Padidinti radius
        barThickness: 30, // Didesnis stulpelio plotis
        yAxisID: 'y',
        order: 2, // Stulpeliai po linijos
      },
      {
        type: 'line' as const,
        label: 'Užimtumas (%)',
        data: displayData.map(d => d.value),
        borderColor: '#1F2937', // Tamsesnė linija
        backgroundColor: 'rgba(31, 41, 55, 0.25)', // Ryškesnis spalvintas plotas po linija
        borderWidth: 3, // Storesnė linija
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#2F8481',
        pointBorderColor: '#FFFFFF', // Balta rėmelis
        pointBorderWidth: 2,
        // Rizikos indikatoriai
        pointStyle: (context: any) => {
          const value = displayData[context.dataIndex]?.value;
          return value < 90 ? 'triangle' : 'circle';
        },
        fill: true, // Spalvinti plotą po linija
        tension: 0.2,
        yAxisID: 'y1',
        order: 1, // Linija ant stulpelių
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 18,
        right: 16,
        bottom: 16,
        left: 10,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // Paslėpti legendą - bus header'yje
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 0) {
              return [`${Math.round(Number(context.parsed.y))} vnt.`, 'Vid. laisvi vnt.'];
            } else if (context.datasetIndex === 1) {
              return [`${Number(context.parsed.y).toFixed(1)} %`, 'Užimtumas'];
            } else {
              return [`${Number(context.parsed.y).toFixed(1)} %`, 'Tikslas'];
            }
          },
          title: function(context: any) {
            return `Mėnuo: ${context[0].label}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
        },
      },
      // Dešinė ašis pirma - kad grid būtų pagal %
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Užimtumas (%)',
        },
        min: 85,
        max: 100,
        ticks: {
          values: [85, 88, 90, 92, 95, 98, 100],
          callback: function(value: any) {
            return `${value}%`;
          },
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          color: 'rgba(0,0,0,0.35)',
          lineWidth: 1,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Vid. laisvi vnt.',
        },
        min: 0,
        max: 15, // Maksimalus 15 vienetų
        ticks: {
          values: [0, 3, 6, 9, 12, 15], // Fiksuoti tikai
          callback: function(value: any) {
            return `${value} vnt.`;
          },
        },
        grid: {
          display: false, // Ne grid kairėje
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-w-0 flex-1" style={{ height: `${height}px` }}>
      <Chart 
        type="bar" 
        data={chartData} 
        options={{
          ...options,
          onClick: (event: any, elements: any) => {
            if (elements.length > 0 && onPointClick) {
              const element = elements[0];
              const index = element.index;
              onPointClick(displayData[index].label, index);
            }
          },
        }}
      />
    </div>
  );
}