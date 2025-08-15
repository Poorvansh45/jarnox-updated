// Analytics page specific JavaScript
class AnalyticsPage {
  constructor() {
    this.charts = {}
    this.init()
  }

  init() {
    this.initializeCharts()
    this.bindEvents()
  }

  bindEvents() {
    // Sector filter
    const sectorFilter = document.getElementById("sectorFilter")
    if (sectorFilter) {
      sectorFilter.addEventListener("change", (e) => {
        this.filterBySector(e.target.value)
      })
    }

    // Time range selector
    const timeRange = document.getElementById("timeRange")
    if (timeRange) {
      timeRange.addEventListener("change", (e) => {
        this.updateChartsTimeRange(e.target.value)
      })
    }

    // Theme toggle listener
    const themeToggle = document.getElementById("themeToggle")
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        // Refresh charts after theme change
        setTimeout(() => {
          this.refreshCharts()
        }, 100)
      })
    }
  }

  async initializeCharts() {
    await this.createVolumeChart()
    await this.createMarketHeatmap()
    await this.createSectorChart()
  }

  async createVolumeChart() {
    const ctx = document.getElementById("volumeChart")
    if (!ctx) return

    try {
      const response = await fetch("/api/market/summary")
      const result = await response.json()

      if (result.success) {
        const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark"
        const textColor = isDark ? "#e5e7eb" : "#374151"
        const gridColor = isDark ? "#374151" : "#e5e7eb"

        this.charts.volume = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Total Volume", "Avg Volume", "High Volume", "Low Volume"],
            datasets: [
              {
                label: "Volume Analysis",
                data: [
                  result.data.total_volume || 0,
                  result.data.total_volume / result.data.total_companies || 0,
                  result.data.total_volume * 1.5 || 0,
                  result.data.total_volume * 0.5 || 0,
                ],
                backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: isDark ? "#1f2937" : "#ffffff",
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: gridColor,
                borderWidth: 1,
              },
            },
            scales: {
              x: {
                grid: {
                  color: gridColor,
                },
                ticks: {
                  color: textColor,
                },
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: gridColor,
                },
                ticks: {
                  color: textColor,
                  callback: (value) => this.formatVolume(value),
                },
              },
            },
          },
        })
      } else {
        ctx.parentElement.innerHTML = '<div class="text-center text-muted py-4">No volume data available</div>'
      }
    } catch (error) {
      console.error("Error creating volume chart:", error)
      ctx.parentElement.innerHTML = '<div class="text-center text-muted py-4">Failed to load volume data</div>'
    }
  }

  async createMarketHeatmap() {
    const container = document.getElementById("marketHeatmap")
    if (!container) return

    try {
      // Get all companies with their current data
      const response = await fetch("/api/companies")
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        // Sort companies by absolute change percentage for better visualization
        const companies = result.data
          .filter(company => company.change !== null && company.change !== undefined)
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
          .slice(0, 12) // Top 12 companies by change magnitude

        if (companies.length > 0) {
          container.innerHTML = companies
            .map((company) => {
              const changeClass = company.change >= 0 ? "bg-success" : "bg-danger"
              const opacity = Math.min(Math.abs(company.change) / 5, 1) // Max opacity at 5% change

              return `
              <div class="heatmap-cell ${changeClass}" 
                   style="opacity: ${0.3 + opacity * 0.7}; flex: 1; min-height: 60px; margin: 2px; padding: 8px; border-radius: 4px; color: white; font-size: 0.8rem;"
                   title="${company.name}: ${company.change >= 0 ? "+" : ""}${company.change}%">
                <div class="fw-bold">${company.symbol}</div>
                <div class="small">${company.change >= 0 ? "+" : ""}${company.change.toFixed(2)}%</div>
              </div>
            `
            })
            .join("")

          // Apply flexbox layout
          container.style.display = "flex"
          container.style.flexWrap = "wrap"
          container.style.height = "300px"
          container.style.alignContent = "stretch"
        } else {
          container.innerHTML = '<div class="text-center text-muted">No market data available</div>'
        }
      } else {
        container.innerHTML = '<div class="text-center text-muted">Failed to load market data</div>'
      }
    } catch (error) {
      console.error("Error creating market heatmap:", error)
      container.innerHTML = '<div class="text-center text-muted">Failed to load heatmap</div>'
    }
  }

  async createSectorChart() {
    const ctx = document.getElementById("sectorChart")
    if (!ctx) return

    try {
      const response = await fetch("/api/sectors")
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        const sectors = result.data

        this.charts.sector = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: sectors.map((s) => s.sector),
            datasets: [
              {
                data: sectors.map((s) => s.company_count),
                backgroundColor: [
                  "#3b82f6",
                  "#10b981",
                  "#f59e0b",
                  "#ef4444",
                  "#8b5cf6",
                  "#06b6d4",
                  "#84cc16",
                  "#f97316",
                  "#ec4899",
                  "#14b8a6",
                  "#fbbf24",
                  "#a855f7",
                ],
                borderWidth: 2,
                borderColor: "#ffffff",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  padding: 20,
                  usePointStyle: true,
                  color: document.documentElement.getAttribute("data-bs-theme") === "dark" ? "#e5e7eb" : "#374151",
                },
              },
              tooltip: {
                backgroundColor: document.documentElement.getAttribute("data-bs-theme") === "dark" ? "#1f2937" : "#ffffff",
                titleColor: document.documentElement.getAttribute("data-bs-theme") === "dark" ? "#e5e7eb" : "#374151",
                bodyColor: document.documentElement.getAttribute("data-bs-theme") === "dark" ? "#e5e7eb" : "#374151",
                callbacks: {
                  label: (context) => {
                    const sector = sectors[context.dataIndex]
                    return `${sector.sector}: ${sector.company_count} companies (${sector.avg_change.toFixed(2)}% avg)`
                  },
                },
              },
            },
          },
        })
      } else {
        // Show message if no sector data
        ctx.parentElement.innerHTML = '<div class="text-center text-muted py-4">No sector data available</div>'
      }
    } catch (error) {
      console.error("Error creating sector chart:", error)
      ctx.parentElement.innerHTML = '<div class="text-center text-muted py-4">Failed to load sector data</div>'
    }
  }

  filterBySector(sector) {
    // Implementation for sector filtering
    console.log("Filtering by sector:", sector)
  }

  updateChartsTimeRange(timeRange) {
    // Implementation for time range updates
    console.log("Updating charts for time range:", timeRange)
  }

  refreshCharts() {
    // Destroy existing charts and recreate them
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.destroy()
      }
    })
    this.charts = {}
    
    // Recreate charts with new theme
    this.initializeCharts()
  }

  formatVolume(volume) {
    if (volume >= 10000000) {
      return (volume / 10000000).toFixed(1) + "Cr"
    } else if (volume >= 100000) {
      return (volume / 100000).toFixed(1) + "L"
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + "K"
    }
    return volume.toString()
  }
}

// Initialize analytics page
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("volumeChart")) {
    new AnalyticsPage()
  }
})
