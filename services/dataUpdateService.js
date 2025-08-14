const database = require("./database")
const axios = require("axios")

class DataUpdateService {
  constructor() {
    this.isUpdating = false
    this.lastUpdateTime = null
    this.updateInterval = 5 * 60 * 1000 // 5 minutes
  }

  async updateStockPrices() {
    if (this.isUpdating) {
      console.log("Update already in progress, skipping...")
      return
    }

    try {
      this.isUpdating = true
      console.log("Starting stock price update...")

      // Get all companies
      const companies = await database.query("SELECT id, symbol FROM companies")

      for (const company of companies) {
        await this.updateSingleStock(company.id, company.symbol)
        // Small delay to avoid overwhelming the database
        await this.sleep(100)
      }

      this.lastUpdateTime = new Date()
      console.log(`Stock prices updated successfully at ${this.lastUpdateTime}`)
    } catch (error) {
      console.error("Error updating stock prices:", error)
    } finally {
      this.isUpdating = false
    }
  }

  async updateSingleStock(companyId, symbol) {
    try {
      // Get the latest stock price from database
      const latestPriceQuery = `
        SELECT close_price, volume 
        FROM stock_prices 
        WHERE company_id = ? 
        ORDER BY date DESC 
        LIMIT 1
      `
      const latestResult = await database.query(latestPriceQuery, [companyId])

      if (latestResult.length === 0) {
        console.log(`No historical data found for ${symbol}`)
        return
      }

      const lastPrice = latestResult[0].close_price
      const lastVolume = latestResult[0].volume

      // Simulate price movement (in real app, this would come from external API)
      const priceChange = this.simulatePriceMovement(lastPrice)
      const newPrice = Math.max(0.01, lastPrice + priceChange)
      const changeAmount = newPrice - lastPrice
      const changePercentage = (changeAmount / lastPrice) * 100

      // Simulate volume change
      const volumeMultiplier = 0.8 + Math.random() * 0.4 // 0.8 to 1.2
      const newVolume = Math.floor(lastVolume * volumeMultiplier)

      // Update current stock data
      const updateQuery = `
        INSERT OR REPLACE INTO current_stock_data 
        (company_id, current_price, change_amount, change_percentage, volume, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `

      await database.run(updateQuery, [
        companyId,
        Number.parseFloat(newPrice.toFixed(2)),
        Number.parseFloat(changeAmount.toFixed(2)),
        Number.parseFloat(changePercentage.toFixed(2)),
        newVolume,
        new Date().toISOString(),
      ])

      // Optionally add new historical data point (for intraday updates)
      if (this.shouldAddHistoricalPoint()) {
        await this.addHistoricalDataPoint(companyId, newPrice, newVolume)
      }
    } catch (error) {
      console.error(`Error updating stock ${symbol}:`, error)
    }
  }

  simulatePriceMovement(currentPrice) {
    // Simulate realistic stock price movement
    const volatility = 0.02 // 2% volatility
    const randomFactor = (Math.random() - 0.5) * 2 // -1 to 1
    const marketTrend = Math.sin(Date.now() / (1000 * 60 * 60 * 24)) * 0.001 // Daily trend

    return currentPrice * (volatility * randomFactor + marketTrend)
  }

  shouldAddHistoricalPoint() {
    // Add historical point every hour during market hours
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()

    // Market hours: 9:15 AM to 3:30 PM (Indian market)
    const isMarketHours = (hour >= 9 && hour < 15) || (hour === 15 && minute <= 30)
    const isOnTheHour = minute < 5 // Within 5 minutes of the hour

    return isMarketHours && isOnTheHour
  }

  async addHistoricalDataPoint(companyId, price, volume) {
    try {
      const today = new Date().toISOString().split("T")[0]

      // Check if we already have data for today
      const existingQuery = `
        SELECT id FROM stock_prices 
        WHERE company_id = ? AND date = ?
      `
      const existing = await database.query(existingQuery, [companyId, today])

      if (existing.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE stock_prices 
          SET close_price = ?, high_price = MAX(high_price, ?), 
              low_price = MIN(low_price, ?), volume = ?
          WHERE company_id = ? AND date = ?
        `
        await database.run(updateQuery, [price, price, price, volume, companyId, today])
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO stock_prices 
          (company_id, date, open_price, high_price, low_price, close_price, volume)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        await database.run(insertQuery, [companyId, today, price, price, price, price, volume])
      }
    } catch (error) {
      console.error("Error adding historical data point:", error)
    }
  }

  async fetchExternalStockData(symbol) {
    try {
      // This is a placeholder for external API integration
      // In a real application, you would integrate with APIs like:
      // - Alpha Vantage
      // - Yahoo Finance
      // - NSE/BSE APIs
      // - Financial data providers

      console.log(`Fetching external data for ${symbol}...`)

      // Simulated API response
      return {
        symbol: symbol,
        price: 0,
        change: 0,
        volume: 0,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error(`Error fetching external data for ${symbol}:`, error)
      return null
    }
  }

  async startPeriodicUpdates() {
    console.log("Starting periodic stock price updates...")

    // Initial update
    await this.updateStockPrices()

    // Set up periodic updates
    this.updateTimer = setInterval(async () => {
      await this.updateStockPrices()
    }, this.updateInterval)
  }

  stopPeriodicUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
      console.log("Stopped periodic stock price updates")
    }
  }

  getUpdateStatus() {
    return {
      isUpdating: this.isUpdating,
      lastUpdateTime: this.lastUpdateTime,
      updateInterval: this.updateInterval,
      nextUpdateIn: this.lastUpdateTime
        ? Math.max(0, this.updateInterval - (Date.now() - this.lastUpdateTime.getTime()))
        : 0,
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

module.exports = new DataUpdateService()
