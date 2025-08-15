const database = require("./database")
const dataUpdateService = require("./dataUpdateService")

class StockService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  // Add caching mechanism for better performance
  getCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  getCache(key) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  async getAllCompanies() {
    try {
      // const cacheKey = this.getCacheKey("getAllCompanies", [])
      // const cached = this.getCache(cacheKey)
      // if (cached) return cached

      const query = `
        SELECT 
          c.id,
          c.symbol,
          c.name,
          c.sector,
          COALESCE(csd.current_price, 0) as price,
          COALESCE(csd.change_percentage, 0) as change,
          COALESCE(csd.volume, 0) as volume,
          csd.last_updated
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        ORDER BY c.name
      `
      const result = await database.query(query)
      // this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("Error fetching companies:", error)
      throw new Error("Failed to fetch companies data")
    }
  }

  async getStockData(symbol) {
    try {
      const cacheKey = this.getCacheKey("getStockData", [symbol])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          c.id,
          c.symbol,
          c.name,
          c.sector,
          c.market_cap,
          COALESCE(csd.current_price, 0) as currentPrice,
          COALESCE(csd.change_amount, 0) as changeAmount,
          COALESCE(csd.change_percentage, 0) as change,
          COALESCE(csd.high_52w, 0) as high52w,
          COALESCE(csd.low_52w, 0) as low52w,
          COALESCE(csd.volume, 0) as volume,
          csd.last_updated
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE UPPER(c.symbol) = UPPER(?)
      `
      const result = await database.query(query, [symbol])

      if (result.length === 0) {
        throw new Error(`Company with symbol ${symbol} not found`)
      }

      const stockData = result[0]

      // Get historical data for the chart
      const historicalQuery = `
        SELECT 
          date, 
          open_price as open, 
          high_price as high, 
          low_price as low, 
          close_price as close, 
          volume
        FROM stock_prices 
        WHERE company_id = ?
        ORDER BY date DESC
        LIMIT 30
      `
      const historical = await database.query(historicalQuery, [stockData.id])

      const enrichedData = {
        ...stockData,
        historical: historical.reverse(), // Reverse to show chronological order
        // Add calculated metrics
        marketCapFormatted: this.formatMarketCap(stockData.market_cap),
        volumeFormatted: this.formatVolume(stockData.volume),
        priceChange24h: stockData.changeAmount,
        percentChange24h: stockData.change,
        lastUpdated: stockData.last_updated || new Date().toISOString(),
      }

      this.setCache(cacheKey, enrichedData)
      return enrichedData
    } catch (error) {
      console.error("Error fetching stock data:", error)
      throw error
    }
  }

  async getHistoricalData(symbol, period = "1M") {
    try {
      const cacheKey = this.getCacheKey("getHistoricalData", [symbol, period])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      // First get company ID
      const companyQuery = "SELECT id FROM companies WHERE UPPER(symbol) = UPPER(?)"
      const companyResult = await database.query(companyQuery, [symbol])

      if (companyResult.length === 0) {
        throw new Error(`Company with symbol ${symbol} not found`)
      }

      const companyId = companyResult[0].id

      // Enhanced period handling with more options
      let dateFilter = ""
      let limit = ""

      switch (period) {
        case "1D":
          dateFilter = "AND date >= date('now', '-1 days')"
          limit = "LIMIT 24" // Hourly data if available
          break
        case "1W":
          dateFilter = "AND date >= date('now', '-7 days')"
          limit = "LIMIT 7"
          break
        case "1M":
          dateFilter = "AND date >= date('now', '-30 days')"
          limit = "LIMIT 30"
          break
        case "3M":
          dateFilter = "AND date >= date('now', '-90 days')"
          limit = "LIMIT 90"
          break
        case "6M":
          dateFilter = "AND date >= date('now', '-180 days')"
          limit = "LIMIT 180"
          break
        case "1Y":
          dateFilter = "AND date >= date('now', '-365 days')"
          limit = "LIMIT 365"
          break
        case "5Y":
          dateFilter = "AND date >= date('now', '-1825 days')"
          limit = "LIMIT 1825"
          break
        default:
          dateFilter = "AND date >= date('now', '-30 days')"
          limit = "LIMIT 30"
      }

      const query = `
        SELECT 
          date, 
          open_price as open, 
          high_price as high, 
          low_price as low, 
          close_price as close, 
          volume,
          (close_price - LAG(close_price) OVER (ORDER BY date)) as daily_change,
          ((close_price - LAG(close_price) OVER (ORDER BY date)) / LAG(close_price) OVER (ORDER BY date)) * 100 as daily_change_percent
        FROM stock_prices 
        WHERE company_id = ? ${dateFilter}
        ORDER BY date ASC
        ${limit}
      `

      const result = await database.query(query, [companyId])
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("Error fetching historical data:", error)
      throw error
    }
  }

  async getMarketSummary() {
    try {
      const cacheKey = this.getCacheKey("getMarketSummary", [])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          COUNT(*) as total_companies,
          ROUND(AVG(COALESCE(csd.change_percentage, 0)), 2) as avg_change,
          SUM(CASE WHEN COALESCE(csd.change_percentage, 0) > 0 THEN 1 ELSE 0 END) as gainers,
          SUM(CASE WHEN COALESCE(csd.change_percentage, 0) < 0 THEN 1 ELSE 0 END) as losers,
          SUM(CASE WHEN COALESCE(csd.change_percentage, 0) = 0 THEN 1 ELSE 0 END) as unchanged,
          MAX(COALESCE(csd.change_percentage, 0)) as max_gain,
          MIN(COALESCE(csd.change_percentage, 0)) as max_loss,
          SUM(COALESCE(csd.volume, 0)) as total_volume,
          AVG(COALESCE(csd.current_price, 0)) as avg_price
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
      `
      const result = await database.query(query)
      const summary = {
        ...result[0],
        total_volume_formatted: this.formatVolume(result[0].total_volume),
        market_trend: result[0].gainers > result[0].losers ? "bullish" : "bearish",
        last_updated: new Date().toISOString(),
      }

      this.setCache(cacheKey, summary)
      return summary
    } catch (error) {
      console.error("Error fetching market summary:", error)
      throw error
    }
  }

  async getTopGainers(limit = 5) {
    try {
      const cacheKey = this.getCacheKey("getTopGainers", [limit])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          c.symbol,
          c.name,
          c.sector,
          COALESCE(csd.current_price, 0) as price,
          COALESCE(csd.change_amount, 0) as change_amount,
          COALESCE(csd.change_percentage, 0) as change,
          COALESCE(csd.volume, 0) as volume,
          COALESCE(csd.high_52w, 0) as high_52w,
          COALESCE(csd.low_52w, 0) as low_52w
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE COALESCE(csd.current_price, 0) > 0
        ORDER BY COALESCE(csd.current_price, 0) DESC
        LIMIT ?
      `
      const result = await database.query(query, [limit])
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("Error fetching top gainers:", error)
      throw error
    }
  }

  async getTopLosers(limit = 5) {
    try {
      const cacheKey = this.getCacheKey("getTopLosers", [limit])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          c.symbol,
          c.name,
          c.sector,
          COALESCE(csd.current_price, 0) as price,
          COALESCE(csd.change_amount, 0) as change_amount,
          COALESCE(csd.change_percentage, 0) as change,
          COALESCE(csd.volume, 0) as volume,
          COALESCE(csd.high_52w, 0) as high_52w,
          COALESCE(csd.low_52w, 0) as low_52w
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE COALESCE(csd.current_price, 0) > 0
        ORDER BY COALESCE(csd.current_price, 0) ASC
        LIMIT ?
      `
      const result = await database.query(query, [limit])
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("Error fetching top losers:", error)
      throw error
    }
  }

  async searchCompanies(searchTerm, limit = 10) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        throw new Error("Search term must be at least 2 characters long")
      }

      const cacheKey = this.getCacheKey("searchCompanies", [searchTerm, limit])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          c.symbol,
          c.name,
          c.sector,
          COALESCE(csd.current_price, 0) as price,
          COALESCE(csd.change_percentage, 0) as change,
          COALESCE(csd.volume, 0) as volume
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE UPPER(c.name) LIKE UPPER(?) OR UPPER(c.symbol) LIKE UPPER(?)
        ORDER BY 
          CASE 
            WHEN UPPER(c.symbol) = UPPER(?) THEN 1
            WHEN UPPER(c.symbol) LIKE UPPER(?) THEN 2
            WHEN UPPER(c.name) LIKE UPPER(?) THEN 3
            ELSE 4
          END,
          c.name
        LIMIT ?
      `
      const searchPattern = `%${searchTerm}%`
      const exactMatch = searchTerm
      const symbolPattern = `${searchTerm}%`
      const namePattern = `${searchTerm}%`

      const result = await database.query(query, [
        searchPattern,
        searchPattern,
        exactMatch,
        symbolPattern,
        namePattern,
        limit,
      ])

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("Error searching companies:", error)
      throw error
    }
  }

  async getSectorPerformance() {
    try {
      const cacheKey = this.getCacheKey("getSectorPerformance", [])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          COALESCE(c.sector, 'Unknown') as sector,
          COUNT(*) as company_count,
          ROUND(AVG(COALESCE(csd.change_percentage, 0)), 2) as avg_change,
          SUM(COALESCE(csd.volume, 0)) as total_volume,
          ROUND(AVG(COALESCE(csd.current_price, 0)), 2) as avg_price,
          MAX(COALESCE(csd.change_percentage, 0)) as best_performer,
          MIN(COALESCE(csd.change_percentage, 0)) as worst_performer,
          SUM(CASE WHEN COALESCE(csd.change_percentage, 0) > 0 THEN 1 ELSE 0 END) as gainers_count,
          SUM(CASE WHEN COALESCE(csd.change_percentage, 0) < 0 THEN 1 ELSE 0 END) as losers_count
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE c.sector IS NOT NULL AND c.sector != ''
        GROUP BY c.sector
        ORDER BY avg_change DESC
      `
      const result = await database.query(query)

      // Add sector performance indicators
      const enrichedResult = result.map((sector) => ({
        ...sector,
        total_volume_formatted: this.formatVolume(sector.total_volume),
        performance_indicator:
          sector.avg_change > 2
            ? "strong_bullish"
            : sector.avg_change > 0
              ? "bullish"
              : sector.avg_change > -2
                ? "bearish"
                : "strong_bearish",
        gainers_ratio: ((sector.gainers_count / sector.company_count) * 100).toFixed(1),
      }))

      this.setCache(cacheKey, enrichedResult)
      return enrichedResult
    } catch (error) {
      console.error("Error fetching sector performance:", error)
      throw error
    }
  }

  // Add new methods for enhanced functionality

  async getStockAnalytics(symbol) {
    try {
      const stockData = await this.getStockData(symbol)
      const historicalData = await this.getHistoricalData(symbol, "1Y")

      if (historicalData.length < 2) {
        throw new Error("Insufficient data for analytics")
      }

      // Calculate technical indicators
      const prices = historicalData.map((d) => d.close)
      const volumes = historicalData.map((d) => d.volume)

      const analytics = {
        symbol: symbol,
        current_price: stockData.currentPrice,
        // Simple Moving Averages
        sma_20: this.calculateSMA(prices.slice(-20)),
        sma_50: this.calculateSMA(prices.slice(-50)),
        sma_200: this.calculateSMA(prices.slice(-200)),
        // Volatility
        volatility: this.calculateVolatility(prices.slice(-30)),
        // Volume analysis
        avg_volume: this.calculateAverage(volumes.slice(-30)),
        volume_trend:
          volumes[volumes.length - 1] > this.calculateAverage(volumes.slice(-10)) ? "increasing" : "decreasing",
        // Price trends
        trend_short: this.determineTrend(prices.slice(-5)),
        trend_medium: this.determineTrend(prices.slice(-20)),
        trend_long: this.determineTrend(prices.slice(-50)),
        // Support and resistance levels
        support_level: Math.min(...prices.slice(-30)),
        resistance_level: Math.max(...prices.slice(-30)),
        last_updated: new Date().toISOString(),
      }

      return analytics
    } catch (error) {
      console.error("Error calculating stock analytics:", error)
      throw error
    }
  }

  async getMarketMomentum() {
    try {
      const cacheKey = this.getCacheKey("getMarketMomentum", [])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          c.symbol,
          c.name,
          csd.change_percentage,
          csd.volume,
          csd.current_price,
          (csd.volume - AVG(sp.volume) OVER (PARTITION BY c.id)) as volume_deviation
        FROM companies c
        JOIN current_stock_data csd ON c.id = csd.company_id
        LEFT JOIN stock_prices sp ON c.id = sp.company_id AND sp.date >= date('now', '-30 days')
        WHERE csd.change_percentage IS NOT NULL
        ORDER BY ABS(csd.change_percentage) DESC, csd.volume DESC
        LIMIT 20
      `

      const result = await database.query(query)
      const momentum = {
        high_momentum_stocks: result,
        market_sentiment: this.calculateMarketSentiment(result),
        last_updated: new Date().toISOString(),
      }

      this.setCache(cacheKey, momentum)
      return momentum
    } catch (error) {
      console.error("Error fetching market momentum:", error)
      throw error
    }
  }

  async addCompany(companyData) {
    try {
      const { symbol, name, sector, market_cap, description } = companyData

      // Check if company already exists
      const existingQuery = "SELECT id FROM companies WHERE UPPER(symbol) = UPPER(?)"
      const existing = await database.query(existingQuery, [symbol])

      if (existing.length > 0) {
        throw new Error(`Company with symbol ${symbol} already exists`)
      }

      const query = `
        INSERT INTO companies (symbol, name, sector, market_cap, description)
        VALUES (?, ?, ?, ?, ?)
      `
      const result = await database.query(query, [symbol, name, sector, market_cap, description])

      // Clear cache to ensure fresh data
      this.clearCache()

      return { id: result.insertId, ...companyData }
    } catch (error) {
      console.error("Error adding company:", error)
      throw error
    }
  }

  async updateCompany(id, companyData) {
    try {
      const { symbol, name, sector, market_cap, description } = companyData

      // Check if company exists
      const existingQuery = "SELECT id FROM companies WHERE id = ?"
      const existing = await database.query(existingQuery, [id])

      if (existing.length === 0) {
        throw new Error(`Company with ID ${id} not found`)
      }

      // Check if symbol is taken by another company
      const symbolQuery = "SELECT id FROM companies WHERE UPPER(symbol) = UPPER(?) AND id != ?"
      const symbolCheck = await database.query(symbolQuery, [symbol, id])

      if (symbolCheck.length > 0) {
        throw new Error(`Symbol ${symbol} is already taken by another company`)
      }

      const query = `
        UPDATE companies 
        SET symbol = ?, name = ?, sector = ?, market_cap = ?, description = ?
        WHERE id = ?
      `
      await database.query(query, [symbol, name, sector, market_cap, description, id])

      // Clear cache to ensure fresh data
      this.clearCache()

      return { id, ...companyData }
    } catch (error) {
      console.error("Error updating company:", error)
      throw error
    }
  }

  async deleteCompany(id) {
    try {
      // Check if company exists
      const existingQuery = "SELECT id, symbol FROM companies WHERE id = ?"
      const existing = await database.query(existingQuery, [id])

      if (existing.length === 0) {
        throw new Error(`Company with ID ${id} not found`)
      }

      // Delete related data first (foreign key constraints)
      await database.query("DELETE FROM current_stock_data WHERE company_id = ?", [id])
      await database.query("DELETE FROM stock_prices WHERE company_id = ?", [id])
      await database.query("DELETE FROM watchlist WHERE company_id = ?", [id])

      // Delete the company
      await database.query("DELETE FROM companies WHERE id = ?", [id])

      // Clear cache to ensure fresh data
      this.clearCache()

      return { success: true, deletedCompany: existing[0] }
    } catch (error) {
      console.error("Error deleting company:", error)
      throw error
    }
  }

  async getCompanyById(id) {
    try {
      const query = `
        SELECT 
          c.id,
          c.symbol,
          c.name,
          c.sector,
          c.market_cap,
          c.description,
          COALESCE(csd.current_price, 0) as current_price,
          COALESCE(csd.change_percentage, 0) as change_percentage,
          COALESCE(csd.volume, 0) as volume
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE c.id = ?
      `
      const result = await database.query(query, [id])

      if (result.length === 0) {
        throw new Error(`Company with ID ${id} not found`)
      }

      return result[0]
    } catch (error) {
      console.error("Error fetching company by ID:", error)
      throw error
    }
  }

  async getCompanyDetails(symbol) {
    try {
      const query = `
        SELECT 
          c.id,
          c.symbol,
          c.name,
          c.sector,
          c.market_cap,
          c.description,
          COALESCE(csd.current_price, 0) as current_price,
          COALESCE(csd.change_percentage, 0) as change_percentage,
          COALESCE(csd.volume, 0) as volume
        FROM companies c
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE UPPER(c.symbol) = UPPER(?)
      `
      const result = await database.query(query, [symbol])

      if (result.length === 0) {
        throw new Error(`Company with symbol ${symbol} not found`)
      }

      return result[0]
    } catch (error) {
      console.error("Error fetching company details:", error)
      throw error
    }
  }

  async getWatchlist(userId = 1) {
    try {
      const cacheKey = this.getCacheKey("getWatchlist", [userId])
      const cached = this.getCache(cacheKey)
      if (cached) return cached

      const query = `
        SELECT 
          w.id as watchlist_id,
          c.id,
          c.symbol,
          c.name,
          c.sector,
          COALESCE(csd.current_price, 0) as price,
          COALESCE(csd.change_amount, 0) as change_amount,
          COALESCE(csd.change_percentage, 0) as change,
          COALESCE(csd.volume, 0) as volume,
          w.added_at as added_date
        FROM watchlist w
        JOIN companies c ON w.company_id = c.id
        LEFT JOIN current_stock_data csd ON c.id = csd.company_id
        WHERE w.user_id = ?
        ORDER BY w.added_at DESC
      `
      const result = await database.query(query, [userId])
      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error("Error fetching watchlist:", error)
      throw error
    }
  }

  async addToWatchlist(symbol, userId = 1) {
    try {
      // First get company ID by symbol
      const companyQuery = "SELECT id FROM companies WHERE UPPER(symbol) = UPPER(?)"
      const companyResult = await database.query(companyQuery, [symbol])
      
      if (companyResult.length === 0) {
        throw new Error(`Company with symbol ${symbol} not found`)
      }
      
      const companyId = companyResult[0].id

      // Check if already in watchlist
      const existingQuery = "SELECT id FROM watchlist WHERE company_id = ? AND user_id = ?"
      const existing = await database.query(existingQuery, [companyId, userId])

      if (existing.length > 0) {
        return { 
          success: true, 
          message: "Company already in watchlist",
          alreadyExists: true,
          company_id: companyId, 
          user_id: userId 
        }
      }

      const query = "INSERT INTO watchlist (company_id, user_id, added_at) VALUES (?, ?, ?)"
      const result = await database.query(query, [companyId, userId, new Date().toISOString()])

      // Clear watchlist cache
      this.cache.delete(this.getCacheKey("getWatchlist", [userId]))

      return { id: result.insertId, company_id: companyId, user_id: userId, message: "Added to watchlist successfully" }
    } catch (error) {
      console.error("Error adding to watchlist:", error)
      throw error
    }
  }

  async removeFromWatchlist(symbol, userId = 1) {
    try {
      // First get company ID by symbol
      const companyQuery = "SELECT id FROM companies WHERE UPPER(symbol) = UPPER(?)"
      const companyResult = await database.query(companyQuery, [symbol])
      
      if (companyResult.length === 0) {
        throw new Error(`Company with symbol ${symbol} not found`)
      }
      
      const companyId = companyResult[0].id

      const query = "DELETE FROM watchlist WHERE company_id = ? AND user_id = ?"
      const result = await database.query(query, [companyId, userId])

      if (result.affectedRows === 0) {
        throw new Error("Watchlist item not found or access denied")
      }

      // Clear watchlist cache
      this.cache.delete(this.getCacheKey("getWatchlist", [userId]))

      return { success: true, message: "Removed from watchlist successfully" }
    } catch (error) {
      console.error("Error removing from watchlist:", error)
      throw error
    }
  }

  // Add utility methods for calculations
  calculateSMA(prices) {
    if (prices.length === 0) return 0
    return prices.reduce((sum, price) => sum + price, 0) / prices.length
  }

  calculateAverage(values) {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  calculateVolatility(prices) {
    if (prices.length < 2) return 0
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    const avgReturn = this.calculateAverage(returns)
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252) // Annualized volatility
  }

  determineTrend(prices) {
    if (prices.length < 2) return "neutral"
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    const change = (lastPrice - firstPrice) / firstPrice

    if (change > 0.02) return "bullish"
    if (change < -0.02) return "bearish"
    return "neutral"
  }

  calculateMarketSentiment(stocks) {
    const bullish = stocks.filter((s) => s.change_percentage > 0).length
    const bearish = stocks.filter((s) => s.change_percentage < 0).length
    const ratio = bullish / (bullish + bearish)

    if (ratio > 0.6) return "bullish"
    if (ratio < 0.4) return "bearish"
    return "neutral"
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

  formatMarketCap(marketCap) {
    if (!marketCap || marketCap === 0) return "₹0"
    if (marketCap >= 1000000000000) {
      return "₹" + (marketCap / 1000000000000).toFixed(1) + "T"
    } else if (marketCap >= 1000000000) {
      return "₹" + (marketCap / 1000000000).toFixed(1) + "B"
    } else if (marketCap >= 1000000) {
      return "₹" + (marketCap / 1000000).toFixed(1) + "M"
    }
    return "₹" + marketCap.toString()
  }

  // Add cache management methods
  clearCache() {
    this.cache.clear()
    console.log("Stock service cache cleared")
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.cache.keys()),
    }
  }
}

module.exports = new StockService()
