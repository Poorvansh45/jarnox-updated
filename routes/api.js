const express = require("express")
const router = express.Router()
const stockService = require("../services/stockService")

const validateSymbol = (req, res, next) => {
  const { symbol } = req.params
  if (!symbol || symbol.length > 10) {
    return res.status(400).json({
      error: "Invalid symbol parameter",
      message: "Symbol is required and must be less than 10 characters",
    })
  }
  req.params.symbol = symbol.toUpperCase()
  next()
}

const validatePeriod = (req, res, next) => {
  const { period } = req.query
  const validPeriods = ["1W", "1M", "3M", "6M", "1Y"]

  if (period && !validPeriods.includes(period)) {
    return res.status(400).json({
      error: "Invalid period parameter",
      message: `Period must be one of: ${validPeriods.join(", ")}`,
    })
  }
  next()
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Get all companies
router.get(
  "/companies",
  asyncHandler(async (req, res) => {
    const companies = await stockService.getAllCompanies()
    console.log("GET /companies hit");
    res.json({
      success: true,
      data: companies,
      count: companies.length,
    })
  }),
)

// Get stock data for a specific company
router.get(
  "/stocks/:symbol",
  validateSymbol,
  asyncHandler(async (req, res) => {
    const { symbol } = req.params
    const stockData = await stockService.getStockData(symbol)

    res.json({
      success: true,
      data: stockData,
    })
  }),
)

// Get historical data
router.get(
  "/stocks/:symbol/historical",
  validateSymbol,
  validatePeriod,
  asyncHandler(async (req, res) => {
    const { symbol } = req.params
    const { period = "1M" } = req.query

    const historicalData = await stockService.getHistoricalData(symbol, period)

    res.json({
      success: true,
      data: historicalData,
      period: period,
      count: historicalData.length,
    })
  }),
)

// Get market summary
router.get(
  "/market/summary",
  asyncHandler(async (req, res) => {
    const summary = await stockService.getMarketSummary()
    res.json({
      success: true,
      data: summary,
    })
  }),
)

// Get top gainers
router.get(
  "/market/gainers",
  asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query
    const gainers = await stockService.getTopGainers(Number.parseInt(limit))

    res.json({
      success: true,
      data: gainers,
      count: gainers.length,
    })
  }),
)

// Get top losers
router.get(
  "/market/losers",
  asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query
    const losers = await stockService.getTopLosers(Number.parseInt(limit))

    res.json({
      success: true,
      data: losers,
      count: losers.length,
    })
  }),
)

// Search companies
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q: query, limit = 10 } = req.query

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: "Invalid search query",
        message: "Search query must be at least 2 characters long",
      })
    }

    const results = await stockService.searchCompanies(query, Number.parseInt(limit))

    res.json({
      success: true,
      data: results,
      query: query,
      count: results.length,
    })
  }),
)

// Watchlist endpoints
router.get(
  "/watchlist",
  asyncHandler(async (req, res) => {
    const { userId = "default_user" } = req.query
    const watchlist = await stockService.getWatchlist(userId)

    res.json({
      success: true,
      data: watchlist,
      count: watchlist.length,
    })
  }),
)

router.post(
  "/watchlist",
  asyncHandler(async (req, res) => {
    const { symbol, userId = "default_user" } = req.body

    if (!symbol) {
      return res.status(400).json({
        error: "Missing required field",
        message: "Symbol is required",
      })
    }

    const result = await stockService.addToWatchlist(symbol.toUpperCase(), userId)

    res.status(201).json({
      success: true,
      message: result.message,
    })
  }),
)

router.delete(
  "/watchlist/:symbol",
  validateSymbol,
  asyncHandler(async (req, res) => {
    const { symbol } = req.params
    const { userId = "default_user" } = req.query

    const result = await stockService.removeFromWatchlist(symbol, userId)

    res.json({
      success: true,
      message: result.message,
    })
  }),
)

// Get company details
router.get(
  "/companies/:symbol",
  validateSymbol,
  asyncHandler(async (req, res) => {
    const { symbol } = req.params
    const company = await stockService.getCompanyDetails(symbol)

    res.json({
      success: true,
      data: company,
    })
  }),
)

// Get sector performance
router.get(
  "/sectors",
  asyncHandler(async (req, res) => {
    const sectors = await stockService.getSectorPerformance()

    res.json({
      success: true,
      data: sectors,
      count: sectors.length,
    })
  }),
)

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "EquiTrack API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

router.use((err, req, res, next) => {
  console.error("API Error:", err)

  // Handle specific error types
  if (err.message.includes("not found")) {
    return res.status(404).json({
      success: false,
      error: "Resource not found",
      message: err.message,
    })
  }

  if (err.message.includes("Invalid") || err.message.includes("required")) {
    return res.status(400).json({
      success: false,
      error: "Bad request",
      message: err.message,
    })
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  })
})

module.exports = router
