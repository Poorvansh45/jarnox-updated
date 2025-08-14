// Chart utility for EquiTrack
// This is a utility file for chart-related functions
// The actual charts are rendered using Chart.js in the frontend

class Chart {
  constructor() {
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        tooltip: {
          enabled: true,
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false,
          },
        },
        y: {
          display: true,
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
      },
    }
  }

  // Generate chart configuration for stock price data
  generateStockChartConfig(data, options = {}) {
    return {
      type: "line",
      data: {
        labels: data.map((item) => item.date),
        datasets: [
          {
            label: "Stock Price",
            data: data.map((item) => item.close),
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.1,
          },
        ],
      },
      options: {
        ...this.defaultOptions,
        ...options,
      },
    }
  }

  // Generate chart configuration for volume data
  generateVolumeChartConfig(data, options = {}) {
    return {
      type: "bar",
      data: {
        labels: data.map((item) => item.date),
        datasets: [
          {
            label: "Volume",
            data: data.map((item) => item.volume),
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...this.defaultOptions,
        ...options,
      },
    }
  }

  // Generate chart configuration for sector performance
  generateSectorChartConfig(data, options = {}) {
    return {
      type: "doughnut",
      data: {
        labels: data.map((item) => item.sector),
        datasets: [
          {
            data: data.map((item) => Math.abs(item.avg_change)),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
              "#FF9F40",
              "#FF6384",
              "#C9CBCF",
              "#4BC0C0",
              "#FF6384",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          legend: {
            position: "right",
          },
        },
        ...options,
      },
    }
  }

  // Generate candlestick chart configuration
  generateCandlestickConfig(data, options = {}) {
    return {
      type: "candlestick",
      data: {
        datasets: [
          {
            label: "Stock Price",
            data: data.map((item) => ({
              x: item.date,
              o: item.open,
              h: item.high,
              l: item.low,
              c: item.close,
            })),
          },
        ],
      },
      options: {
        ...this.defaultOptions,
        ...options,
      },
    }
  }

  // Utility function to format chart data
  formatChartData(rawData, type = "line") {
    switch (type) {
      case "stock":
        return this.generateStockChartConfig(rawData)
      case "volume":
        return this.generateVolumeChartConfig(rawData)
      case "sector":
        return this.generateSectorChartConfig(rawData)
      case "candlestick":
        return this.generateCandlestickConfig(rawData)
      default:
        return this.generateStockChartConfig(rawData)
    }
  }

  // Color utilities for charts
  getChartColors() {
    return {
      primary: "#007bff",
      success: "#28a745",
      danger: "#dc3545",
      warning: "#ffc107",
      info: "#17a2b8",
      light: "#f8f9fa",
      dark: "#343a40",
    }
  }

  // Generate gradient colors for charts
  generateGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400)
    gradient.addColorStop(0, color1)
    gradient.addColorStop(1, color2)
    return gradient
  }
}

// Export the Chart class
module.exports = { Chart }
