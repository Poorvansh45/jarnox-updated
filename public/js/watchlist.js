// Watchlist page specific JavaScript
class WatchlistPage {
  constructor() {
    this.init()
  }

  init() {
    this.bindEvents()
    this.initializeSearch()
    this.loadWatchlist() // Load watchlist data when page initializes
  }

  bindEvents() {
    // Add stock modal
    const addStockModal = document.getElementById("addStockModal")
    if (addStockModal) {
      addStockModal.addEventListener("shown.bs.modal", () => {
        document.getElementById("stockSearch").focus()
      })
    }

    // Stock search
    const stockSearch = document.getElementById("stockSearch")
    if (stockSearch) {
      stockSearch.addEventListener("input", (e) => {
        this.searchStocks(e.target.value)
      })
    }

    // Remove from watchlist buttons
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-from-watchlist")) {
        const symbol = e.target.dataset.symbol
        this.removeFromWatchlist(symbol)
      }
    })
  }

  async searchStocks(query) {
    const resultsContainer = document.getElementById("searchResults")
    if (!resultsContainer) return

    if (query.length < 2) {
      resultsContainer.innerHTML = ""
      return
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        resultsContainer.innerHTML = result.data
          .map(
            (stock) => `
          <div class="search-result-item border rounded p-2 mb-2" style="cursor: pointer;" data-symbol="${stock.symbol}">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>${stock.symbol}</strong>
                <div class="small text-muted">${stock.name}</div>
                <small class="badge bg-secondary">${stock.sector || "N/A"}</small>
              </div>
              <div class="text-end">
                <div>₹${this.formatPrice(stock.price)}</div>
                <small class="${stock.change >= 0 ? "text-success" : "text-danger"}">
                  ${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%
                </small>
              </div>
            </div>
          </div>
        `,
          )
          .join("")

        // Add click handlers
        resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
          item.addEventListener("click", () => {
            const symbol = item.dataset.symbol
            this.addToWatchlist(symbol)
          })
        })
      } else {
        resultsContainer.innerHTML = '<div class="text-muted text-center p-3">No stocks found</div>'
      }
    } catch (error) {
      console.error("Search error:", error)
      resultsContainer.innerHTML = '<div class="text-danger text-center p-3">Search failed</div>'
    }
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
      if (result.success) {
        this.showToast("Added to watchlist successfully", "success")
        // Close modal and refresh watchlist
        const modal = window.bootstrap.Modal.getInstance(document.getElementById("addStockModal"))
        modal.hide()
        setTimeout(() => this.loadWatchlist(), 500)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error)
      this.showToast("Failed to add to watchlist", "error")
    }
  }

  async removeFromWatchlist(symbol) {
    if (!confirm(`Remove ${symbol} from watchlist?`)) return

    try {
      const response = await fetch(`/api/watchlist/${symbol}`, {
        method: "DELETE",
      })

      const result = await response.json()
      if (result.success) {
        this.showToast("Removed from watchlist", "success")
        this.loadWatchlist() // Refresh watchlist instead of reloading page
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error)
      this.showToast("Failed to remove from watchlist", "error")
    }
  }

  async loadWatchlist() {
    try {
      const response = await fetch("/api/watchlist")
      const result = await response.json()

      if (result.success) {
        this.renderWatchlist(result.data)
      } else {
        throw new Error(result.message || "Failed to load watchlist")
      }
    } catch (error) {
      console.error("Error loading watchlist:", error)
      this.showToast("Failed to load watchlist", "error")
    }
  }

  renderWatchlist(watchlistData) {
    const container = document.querySelector(".container-fluid .row .col-12")
    if (!container) return

    if (watchlistData && watchlistData.length > 0) {
      const watchlistHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="mb-0">My Watchlist</h2>
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addStockModal">
            <i class="bi bi-plus-circle"></i> Add Stock
          </button>
        </div>
        <div class="row">
          ${watchlistData.map(stock => `
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="card h-100">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 class="card-title mb-1">${stock.symbol}</h5>
                      <p class="card-text text-muted small">${stock.name}</p>
                    </div>
                    <button class="btn btn-sm btn-outline-danger remove-from-watchlist" 
                            data-symbol="${stock.symbol}">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                  
                  <div class="row">
                    <div class="col-6">
                      <div class="text-center">
                        <h4 class="mb-0">₹${this.formatPrice(stock.price || 0)}</h4>
                        <small class="${(stock.change >= 0) ? 'text-success' : 'text-danger'}">
                          ${(stock.change >= 0) ? '+' : ''}${(stock.change || 0).toFixed(2)}%
                        </small>
                      </div>
                    </div>
                    <div class="col-6">
                      <small class="text-muted">Added</small>
                      <div class="small">
                        ${new Date(stock.added_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-3">
                    <a href="/?symbol=${stock.symbol}" class="btn btn-sm btn-outline-primary w-100">
                      View Details
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `
      container.innerHTML = watchlistHTML
    } else {
      const emptyHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="mb-0">My Watchlist</h2>
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addStockModal">
            <i class="bi bi-plus-circle"></i> Add Stock
          </button>
        </div>
        <div class="text-center py-5">
          <i class="bi bi-bookmark display-1 text-muted"></i>
          <h4 class="mt-3 text-muted">Your watchlist is empty</h4>
          <p class="text-muted">Add stocks to your watchlist to track their performance</p>
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addStockModal">
            Add Your First Stock
          </button>
        </div>
      `
      container.innerHTML = emptyHTML
    }

    // Re-bind events after rendering
    this.bindEvents()
  }

  initializeSearch() {
    // Clear search on modal close
    const addStockModal = document.getElementById("addStockModal")
    if (addStockModal) {
      addStockModal.addEventListener("hidden.bs.modal", () => {
        document.getElementById("stockSearch").value = ""
        document.getElementById("searchResults").innerHTML = ""
      })
    }
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
}

// Initialize watchlist page
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("addStockModal")) {
    new WatchlistPage()
  }
})
