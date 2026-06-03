import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function PerformanceCharts({ results }) {
  const { correctCount, incorrectCount, unansweredCount, questions, answers } = results;

  // 1. Pie Chart: Breakdown of responses
  const pieData = {
    labels: ['Correct', 'Incorrect', 'Unanswered'],
    datasets: [
      {
        data: [correctCount, incorrectCount, unansweredCount],
        backgroundColor: [
          '#10b981', // Emerald
          '#ef4444', // Rose
          '#f59e0b'  // Amber
        ],
        borderColor: 'rgba(18, 19, 28, 0.8)',
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: {
            family: 'Inter',
            size: 12
          },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw;
            const total = correctCount + incorrectCount + unansweredCount;
            const pct = Math.round((val / total) * 100);
            return ` ${context.label}: ${val} (${pct}%)`;
          }
        }
      }
    }
  };

  // 2. Bar Chart: Performance by Category
  // Group questions by category and calculate percentage correct
  const categoryStats = {};
  questions.forEach(q => {
    if (!categoryStats[q.category]) {
      categoryStats[q.category] = { total: 0, correct: 0 };
    }
    categoryStats[q.category].total++;
    
    const chosen = answers[q.id];
    if (chosen !== undefined && chosen === q.answerIndex) {
      categoryStats[q.category].correct++;
    }
  });

  const categories = Object.keys(categoryStats);
  const accuracyData = categories.map(cat => {
    const stats = categoryStats[cat];
    return Math.round((stats.correct / stats.total) * 100);
  });

  const barData = {
    labels: categories,
    datasets: [
      {
        label: 'Accuracy (%)',
        data: accuracyData,
        backgroundColor: 'rgba(139, 92, 246, 0.65)', // Purple trans
        borderColor: '#8b5cf6', // Purple solid
        borderWidth: 1.5,
        borderRadius: 4,
        hoverBackgroundColor: '#8b5cf6'
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: 'Inter',
            size: 11
          }
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: 'Inter',
            size: 11
          },
          callback: (value) => `${value}%`
        }
      }
    },
    plugins: {
      legend: {
        display: false // only 1 dataset, no need
      },
      tooltip: {
        callbacks: {
          label: (context) => ` Accuracy: ${context.raw}%`
        }
      }
    }
  };

  return (
    <div className="charts-section-grid">
      <div className="chart-wrapper">
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
          Response Distribution
        </h4>
        <div style={{ position: 'relative', width: '100%', height: '220px' }}>
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>
      <div className="chart-wrapper">
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
          Accuracy by Category
        </h4>
        <div style={{ position: 'relative', width: '100%', height: '220px' }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </div>
  );
}
