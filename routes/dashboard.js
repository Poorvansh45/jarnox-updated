const express = require("express")
const router = express.Router()

const stockService = require("../services/stockService")

// Dashboard route
router.get("/", async (req, res) => {
  try {
    const marketSummary = await stockService.getMarketSummary()
    const topGainers = await stockService.getTopGainers(3)
    const topLosers = await stockService.getTopLosers(3)

    res.render("pages/dashboard", {
      title: "Dashboard",
      marketSummary,
      topGainers,
      topLosers,
    })
  } catch (error) {
    console.error("Error loading dashboard:", error)
    res.render("pages/dashboard", {
      title: "Dashboard",
      marketSummary: null,
      topGainers: [],
      topLosers: [],
    })
  }
})

// Watchlist route
router.get("/watchlist", async (req, res) => {
  try {
    const watchlist = await stockService.getWatchlist()

    res.render("pages/watchlist", {
      title: "Watchlist",
      watchlist,
    })
  } catch (error) {
    console.error("Error loading watchlist:", error)
    res.render("pages/watchlist", {
      title: "Watchlist",
      watchlist: [],
    })
  }
})

// Analytics route
router.get("/analytics", async (req, res) => {
  try {
    const sectors = await stockService.getSectorPerformance()
    const marketSummary = await stockService.getMarketSummary()

    res.render("pages/analytics", {
      title: "Analytics",
      sectors,
      marketSummary,
    })
  } catch (error) {
    console.error("Error loading analytics:", error)
    res.render("pages/analytics", {
      title: "Analytics",
      sectors: [],
      marketSummary: null,
    })
  }
})

module.exports = router
