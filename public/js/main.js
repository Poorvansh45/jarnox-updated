// EquiTrack Main JavaScript

class EquiTrack {
  constructor() {
    this.selectedCompany = null
    this.chart = null
    this.currentPeriod = "1M"
    this.chartType = "line"
    this.init()
  }

  init() {
    this.bindEvents()
    this.loadCompanies()
    this.initializeTheme()
    this.startDataRefresh()
  }

  bindEvents() {
    // Company selection
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("company-item") || e.target.closest(".company-item")) {
        const item = e.target.classList.contains("company-item") ? e.target : e.target.closest(".company-item")
        this.selectCompany(item)
      }
    })

    // Search functionality
    const searchInput = document.getElementById("companySearch")
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterCompanies(e.target.value)
      })
    }

    // Global search
    const globalSearch = document.getElementById("globalSearch")
    if (globalSearch) {
      globalSearch.addEventListener("input", (e) => {
        this.handleGlobalSearch(e.target.value)
      })
    }

    // Period selection buttons
    document.addEventListener("change", (e) => {
      if (e.target.name === "period") {
        this.currentPeriod = e.target.value
        if (this.selectedCompany) {
          this.loadStockData(this.selectedCompany)
        }
      }
    })

    // Chart type selection
    const chartTypeSelect = document.getElementById("chartType")
    if (chartTypeSelect) {
      chartTypeSelect.addEventListener("change", (e) => {
        this.chartType = e.target.value
        if (this.selectedCompany) {
          this.loadStockData(this.selectedCompany)
        }
      })
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshCompanies")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.refreshData()
      })
    }

    // Theme toggle
    const themeToggle = document.getElementById("themeToggle")
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        this.toggleTheme()
      })
    }

    // Watchlist functionality
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-to-watchlist")) {
        const symbol = e.target.dataset.symbol
        this.addToWatchlist(symbol)
      }
      if (e.target.classList.contains("remove-from-watchlist")) {
        const symbol = e.target.dataset.symbol
        this.removeFromWatchlist(symbol)
      }
    })
  }

  async loadCompanies() {
    try {
      console.log("Loading companies...")
      this.showLoading("companiesList", true)
      const response = await fetch("/api/companies")
      console.log("API response:", response)
      const result = await response.json()
      console.log("API result:", result)

      if (result.success) {
        this.renderCompanies(result.data)
      } else {
        throw new Error(result.message || "Failed to load companies")
      }
    } catch (error) {
      console.error("Error loading companies:", error)
      this.showError("Failed to load companies")
    } finally {
      this.showLoading("companiesList", false)
    }
  }

  renderCompanies(companies) {
    const container = document.getElementById("companiesList")
    if (!container) return

    container.innerHTML = companies
      .map(
        (company) => `
      <div class="company-item" data-symbol="${company.symbol}">
        <div class="d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <h6 class="mb-1 fw-semibold">${company.symbol}</h6>
            <small class="text-muted">${company.name}</small>
          </div>
          <div class="text-end">
            <div class="fw-bold">₹${this.formatPrice(company.price)}</div>
            <small class="${company.change >= 0 ? "price-positive" : "price-negative"}">
              ${company.change >= 0 ? "+" : ""}${this.formatPercentage(company.change)}%
            </small>
          </div>
        </div>
      </div>
    `,
      )
      .join("")

    // Add fade-in animation
    container.classList.add("fade-in")
  }

  selectCompany(element) {
    // Remove active class from all items
    document.querySelectorAll(".company-item").forEach((item) => {
      item.classList.remove("active")
    })

    // Add active class to selected item
    element.classList.add("active")

    const symbol = element.dataset.symbol
    this.selectedCompany = symbol
    this.loadStockData(symbol)

    // Update URL without page reload
    const url = new URL(window.location)
    url.searchParams.set("symbol", symbol)
    window.history.pushState({}, "", url)
  }

  async loadStockData(symbol) {
    try {
      this.showLoading("chart", true)

      // Load both current data and historical data
      const [stockResponse, historicalResponse] = await Promise.all([
        fetch(`/api/stocks/${symbol}`),
        fetch(`/api/stocks/${symbol}/historical?period=${this.currentPeriod}`),
      ])

      const stockResult = await stockResponse.json()
      const historicalResult = await historicalResponse.json()

      if (stockResult.success && historicalResult.success) {
        this.updateStockInfo(stockResult.data)
        this.renderChart(historicalResult.data, stockResult.data)
      } else {
        throw new Error("Failed to load stock data")
      }
    } catch (error) {
      console.error("Error loading stock data:", error)
      this.showError("Failed to load stock data")
    } finally {
      this.showLoading("chart", false)
    }
  }

  updateStockInfo(data) {
    const container = document.getElementById("stockInfo")
    if (!container) return

    const changeClass = data.change >= 0 ? "text-success" : "text-danger"
    const changeIcon = data.change >= 0 ? "bi-arrow-up" : "bi-arrow-down"

    container.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-4">
              <div class="stock-info-card card text-white mb-3 mb-md-0">
                <div class="card-body text-center">
                  <h5 class="card-title mb-1">${data.name}</h5>
                  <h6 class="text-light opacity-75 mb-2">${data.symbol}</h6>
                  <h2 class="mb-1">₹${this.formatPrice(data.currentPrice)}</h2>
                  <div class="d-flex justify-content-center align-items-center">
                    <i class="bi ${changeIcon} me-1"></i>
                    <span>${data.change >= 0 ? "+" : ""}${this.formatPercentage(data.change)}%</span>
                    <span class="ms-2">(₹${this.formatPrice(Math.abs(data.changeAmount))})</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-8">
              <div class="row g-3">
                <div class="col-6 col-lg-3">
                  <div class="text-center p-2 border rounded">
                    <small class="text-muted d-block">52W High</small>
                    <strong>₹${this.formatPrice(data.high52w)}</strong>
                  </div>
                </div>
                <div class="col-6 col-lg-3">
                  <div class="text-center p-2 border rounded">
                    <small class="text-muted d-block">52W Low</small>
                    <strong>₹${this.formatPrice(data.low52w)}</strong>
                  </div>
                </div>
                <div class="col-6 col-lg-3">
                  <div class="text-center p-2 border rounded">
                    <small class="text-muted d-block">Volume</small>
                    <strong>${this.formatVolume(data.volume)}</strong>
                  </div>
                </div>
                <div class="col-6 col-lg-3">
                  <div class="text-center p-2 border rounded">
                    <small class="text-muted d-block">Market Cap</small>
                    <strong>${data.marketCapFormatted || "N/A"}</strong>
                  </div>
                </div>
              </div>
              <div class="mt-3 d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary add-to-watchlist" data-symbol="${data.symbol}">
                  <i class="bi bi-bookmark"></i> Add to Watchlist
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="window.open('/analytics?symbol=${data.symbol}', '_blank')">
                  <i class="bi bi-graph-up"></i> Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    container.classList.add("fade-in")
  }

  renderChart(historicalData, stockData) {
    const ctx = document.getElementById("stockChart")
    if (!ctx) return

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy()
    }

    if (!historicalData || historicalData.length === 0) {
      ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height)
      return
    }

    // Prepare data based on chart type
    this.chartData = this.prepareChartData(historicalData, stockData)
    const chartConfig = this.getChartConfig(this.chartData, stockData)

    // Small delay to ensure container is properly rendered
    setTimeout(() => {
      this.chart = new Chart(ctx, chartConfig)
      // Add chart interaction handlers
      this.addChartInteractions()
    }, 100)
  }

  prepareChartData(historicalData, stockData) {
    const labels = historicalData.map((item) => {
      const date = new Date(item.date)
      return this.currentPeriod === "1D" ? date.toLocaleTimeString() : date.toLocaleDateString()
    })

    const prices = historicalData.map((item) => Number.parseFloat(item.close))
    const volumes = historicalData.map((item) => Number.parseInt(item.volume))

    // Calculate moving averages
    const sma20 = this.calculateSMA(prices, 20)
    const sma50 = this.calculateSMA(prices, 50)

    return {
      labels,
      prices,
      volumes,
      sma20,
      sma50,
      high: historicalData.map((item) => Number.parseFloat(item.high)),
      low: historicalData.map((item) => Number.parseFloat(item.low)),
      open: historicalData.map((item) => Number.parseFloat(item.open)),
    }
  }

  getChartConfig(chartData, stockData) {
    const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark"
    const textColor = isDark ? "#e5e7eb" : "#374151"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const baseConfig = {
      type: this.chartType,
      data: {
        labels: chartData.labels,
        datasets: this.getDatasets(chartData, stockData),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: textColor,
              usePointStyle: true,
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: isDark ? "#1f2937" : "#ffffff",
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: gridColor,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || ""
                const value = context.parsed.y
                if (label.includes("Volume")) {
                  return `${label}: ${this.formatVolume(value)}`
                }
                return `${label}: ₹${this.formatPrice(value)}`
              },
            },
          },
        },
        scales: this.getScalesConfig(textColor, gridColor),
      },
    }

    // Add candlestick specific configuration
    if (this.chartType === "candlestick") {
      // Fallback to line chart since candlestick is not available in standard Chart.js
      baseConfig.type = "line"
      console.warn("Candlestick charts not available, falling back to line chart")
    }

    return baseConfig
  }

  getDatasets(chartData, stockData) {
    const datasets = []

    // Main price line
    datasets.push({
      label: "Price",
      data: chartData.prices,
      borderColor: stockData.change >= 0 ? "#10b981" : "#ef4444",
      backgroundColor: stockData.change >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
      borderWidth: 2,
      fill: this.chartType === "area",
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 4,
    })

    // Moving averages (only for longer periods)
    if (this.currentPeriod !== "1D" && this.currentPeriod !== "1W") {
      if (chartData.sma20.length > 0) {
        datasets.push({
          label: "SMA 20",
          data: chartData.sma20,
          borderColor: "#f59e0b",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.1,
        })
      }

      if (chartData.sma50.length > 0) {
        datasets.push({
          label: "SMA 50",
          data: chartData.sma50,
          borderColor: "#8b5cf6",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.1,
        })
      }
    }

    // Volume dataset (on secondary axis)
    if (this.chartType !== "candlestick") {
      datasets.push({
        label: "Volume",
        data: chartData.volumes,
        type: "bar",
        backgroundColor: "rgba(99, 102, 241, 0.3)",
        borderColor: "rgba(99, 102, 241, 0.8)",
        borderWidth: 1,
        yAxisID: "volume",
        order: 2,
      })
    }

    return datasets
  }

  getCandlestickDataset(chartData, stockData) {
    const candlestickData = chartData.labels.map((label, index) => ({
      x: label,
      o: chartData.open[index],
      h: chartData.high[index],
      l: chartData.low[index],
      c: chartData.prices[index],
    }))

    return [
      {
        label: stockData.symbol,
        data: candlestickData,
        borderColor: "#374151",
        backgroundColor: {
          up: "#10b981",
          down: "#ef4444",
        },
      },
    ]
  }

  getScalesConfig(textColor, gridColor) {
    const scales = {
      x: {
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: textColor,
          maxTicksLimit: 10,
        },
      },
      y: {
        position: "left",
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: textColor,
          callback: (value) => "₹" + this.formatPrice(value),
        },
      },
    }

    // Add volume scale if not candlestick
    if (this.chartType !== "candlestick") {
      scales.volume = {
        type: "linear",
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: textColor,
          callback: (value) => this.formatVolume(value),
        },
        max: Math.max(...(this.chartData?.volumes || [0])) * 4,
      }
    }

    return scales
  }

  calculateSMA(prices, period) {
    const sma = []
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
    return Array(period - 1)
      .fill(null)
      .concat(sma)
  }

  addChartInteractions() {
    const canvas = document.getElementById("stockChart")
    if (!canvas || !this.chart) return

    // Add crosshair cursor
    canvas.style.cursor = "crosshair"

    // Add click handler for data point selection
    canvas.addEventListener("click", (event) => {
      const points = this.chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true)
      if (points.length) {
        const firstPoint = points[0]
        const label = this.chart.data.labels[firstPoint.index]
        const value = this.chart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index]
        console.log(`Selected: ${label}, Value: ${value}`)
      }
    })
  }

  async handleGlobalSearch(query) {
    const resultsContainer = document.getElementById("globalSearchResults")
    if (!resultsContainer) return

    if (query.length < 2) {
      resultsContainer.style.display = "none"
      return
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        resultsContainer.innerHTML = result.data
          .map(
            (stock) => `
          <div class="search-result-item" data-symbol="${stock.symbol}">
            <div class="d-flex justify-content-between">
              <div>
                <strong>${stock.symbol}</strong>
                <div class="small text-muted">${stock.name}</div>
              </div>
              <div class="text-end">
                <div>₹${this.formatPrice(stock.price)}</div>
                <small class="${stock.change >= 0 ? "text-success" : "text-danger"}">
                  ${stock.change >= 0 ? "+" : ""}${this.formatPercentage(stock.change)}%
                </small>
              </div>
            </div>
          </div>
        `,
          )
          .join("")

        resultsContainer.style.display = "block"

        // Add click handlers for search results
        resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
          item.addEventListener("click", () => {
            const symbol = item.dataset.symbol
            this.selectCompanyBySymbol(symbol)
            resultsContainer.style.display = "none"
            document.getElementById("globalSearch").value = ""
          })
        })
      } else {
        resultsContainer.innerHTML = '<div class="p-2 text-muted">No results found</div>'
        resultsContainer.style.display = "block"
      }
    } catch (error) {
      console.error("Search error:", error)
      resultsContainer.style.display = "none"
    }
  }

  selectCompanyBySymbol(symbol) {
    const companyItem = document.querySelector(`[data-symbol="${symbol}"]`)
    if (companyItem) {
      this.selectCompany(companyItem)
      companyItem.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  filterCompanies(searchTerm) {
    const companies = document.querySelectorAll(".company-item")
    companies.forEach((company) => {
      const symbol = company.querySelector("h6").textContent.toLowerCase()
      const name = company.querySelector("small").textContent.toLowerCase()

      if (symbol.includes(searchTerm.toLowerCase()) || name.includes(searchTerm.toLowerCase())) {
        company.style.display = "block"
      } else {
        company.style.display = "none"
      }
    })
  }

  async addToWatchlist(symbol) {
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol }),
      })

      const result = await response.json()
      
      // Check if it's already in watchlist - treat as success
      if (result.message && result.message.includes("already in watchlist")) {
        this.showToast("Company is already in your watchlist", "info")
        return
      }
      
      if (result.success) {
        this.showToast("Added to watchlist", "success")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error)
      this.showToast("Failed to add to watchlist", "error")
    }
  }

  async removeFromWatchlist(symbol) {
    // Prevent double confirmation by checking if already processing
    if (this.isRemoving) return
    
    if (!confirm(`Remove ${symbol} from watchlist?`)) return

    this.isRemoving = true

    try {
      const response = await fetch(`/api/watchlist/${symbol}`, {
        method: "DELETE",
      })

      const result = await response.json()
      if (result.success) {
        this.showToast("Removed from watchlist", "success")
        // Refresh the page if we're on the watchlist page
        if (window.location.pathname === "/watchlist") {
          window.location.reload()
        }
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error)
      this.showToast("Failed to remove from watchlist", "error")
    } finally {
      this.isRemoving = false
    }
  }

  async refreshData() {
    try {
      await this.loadCompanies()
      if (this.selectedCompany) {
        await this.loadStockData(this.selectedCompany)
      }
      this.showToast("Data refreshed", "success")
    } catch (error) {
      console.error("Error refreshing data:", error)
      this.showToast("Failed to refresh data", "error")
    }
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-bs-theme", savedTheme)
    this.updateThemeIcon(savedTheme)
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme")
    const newTheme = currentTheme === "dark" ? "light" : "dark"

    document.documentElement.setAttribute("data-bs-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    this.updateThemeIcon(newTheme)

    // Redraw chart with new theme
    if (this.chart && this.selectedCompany) {
      this.loadStockData(this.selectedCompany)
    }
  }

  updateThemeIcon(theme) {
    const themeIcon = document.querySelector("#themeToggle i")
    if (themeIcon) {
      themeIcon.className = theme === "dark" ? "bi bi-moon" : "bi bi-sun"
    }
  }

  startDataRefresh() {
    // Refresh data every 5 minutes
    setInterval(
      () => {
        if (this.selectedCompany) {
          this.loadStockData(this.selectedCompany)
        }
      },
      5 * 60 * 1000,
    )
  }

  showLoading(target, show) {
    const spinner = document.querySelector(`#${target} .loading-spinner`) || document.querySelector(".loading-spinner")
    const container = document.getElementById(target)

    if (show) {
      if (container) container.classList.add("loading")
      if (spinner) spinner.style.display = "block"
    } else {
      if (container) container.classList.remove("loading")
      if (spinner) spinner.style.display = "none"
    }
  }

  showError(message) {
    this.showToast(message, "error")
  }

  showToast(message, type = "info") {
    // Create toast element
    const toast = document.createElement("div")
    toast.className = `toast align-items-center text-white bg-${type === "error" ? "danger" : type === "success" ? "success" : "primary"} border-0`
    toast.setAttribute("role", "alert")
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `

    // Add to toast container or create one
    let toastContainer = document.getElementById("toastContainer")
    if (!toastContainer) {
      toastContainer = document.createElement("div")
      toastContainer.id = "toastContainer"
      toastContainer.className = "toast-container position-fixed top-0 end-0 p-3"
      toastContainer.style.zIndex = "1055"
      document.body.appendChild(toastContainer)
    }

    toastContainer.appendChild(toast)

    // Show toast
    const bsToast = new window.bootstrap.Toast(toast)
    bsToast.show()

    // Remove from DOM after hiding
    toast.addEventListener("hidden.bs.toast", () => {
      toast.remove()
    })
  }

  formatPrice(price) {
    if (!price || price === 0) return "0.00"
    return Number.parseFloat(price).toFixed(2)
  }

  formatPercentage(percentage) {
    if (!percentage || percentage === 0) return "0.00"
    return Number.parseFloat(percentage).toFixed(2)
  }

  formatVolume(volume) {
    if (!volume || volume === 0) return "0"
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

// Initialize EquiTrack when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing EquiTrack...")
  try {
    window.equiTrack = new EquiTrack()
    console.log("EquiTrack initialized successfully")
  } catch (error) {
    console.error("Error initializing EquiTrack:", error)
  }

  // Handle URL parameters
  const urlParams = new URLSearchParams(window.location.search)
  const symbol = urlParams.get("symbol")
  if (symbol) {
    setTimeout(() => {
      window.equiTrack.selectCompanyBySymbol(symbol)
    }, 1000)
  }

  // Hide global search results when clicking outside
  document.addEventListener("click", (e) => {
    const searchResults = document.getElementById("globalSearchResults")
    const globalSearch = document.getElementById("globalSearch")
    if (searchResults && !globalSearch.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none"
    }
  })
})
