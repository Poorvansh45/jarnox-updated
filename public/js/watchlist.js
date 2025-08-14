// Watchlist page specific JavaScript
class WatchlistPage {
  constructor() {
    this.init()
  }

  init() {
    this.bindEvents()
    this.initializeSearch()
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
        // Close modal and refresh page
        const modal = window.bootstrap.Modal.getInstance(document.getElementById("addStockModal"))
        modal.hide()
        setTimeout(() => window.location.reload(), 500)
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
        window.location.reload()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error)
      this.showToast("Failed to remove from watchlist", "error")
    }
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
