const database = require("./database")

class MarketAnalysisService {
  constructor() {
    this.analysisCache = new Map()
    this.cacheTimeout = 10 * 60 * 1000 // 10 minutes
  }

  async generateMarketReport() {
    try {
      const cacheKey = "market_report"
      const cached = this.getFromCache(cacheKey)
      if (cached) return cached

      const report = {
        timestamp: new Date().toISOString(),
        market_overview: await this.getMarketOverview(),
        sector_analysis: await this.getSectorAnalysis(),
        top_performers: await this.getTopPerformers(),
        market_indicators: await this.getMarketIndicators(),
        risk_assessment: await this.getRiskAssessment(),
      }

      this.setCache(cacheKey, report)
      return report
    } catch (error) {
      console.error("Error generating market report:", error)
      throw error
    }
  }

  async getMarketOverview() {
    const query = `
      SELECT 
        COUNT(*) as total_stocks,
        AVG(COALESCE(change_percentage, 0)) as avg_change,
        SUM(CASE WHEN COALESCE(change_percentage, 0) > 0 THEN 1 ELSE 0 END) as advancing,
        SUM(CASE WHEN COALESCE(change_percentage, 0) < 0 THEN 1 ELSE 0 END) as declining,
        SUM(CASE WHEN COALESCE(change_percentage, 0) = 0 THEN 1 ELSE 0 END) as unchanged,
        MAX(COALESCE(change_percentage, 0)) as biggest_gainer,
        MIN(COALESCE(change_percentage, 0)) as biggest_loser,
        SUM(COALESCE(volume, 0)) as total_volume
      FROM current_stock_data csd
      RIGHT JOIN companies c ON csd.company_id = c.id
    `

    const result = await database.query(query)
    const overview = result[0]

    return {
      ...overview,
      advance_decline_ratio: overview.advancing / Math.max(overview.declining, 1),
      market_breadth: (overview.advancing - overview.declining) / overview.total_stocks,
      market_sentiment: this.calculateMarketSentiment(overview),
    }
  }

  async getSectorAnalysis() {
    const query = `
      SELECT 
        c.sector,
        COUNT(*) as stock_count,
        AVG(COALESCE(csd.change_percentage, 0)) as avg_performance,
        MAX(COALESCE(csd.change_percentage, 0)) as best_stock,
        MIN(COALESCE(csd.change_percentage, 0)) as worst_stock,
        SUM(COALESCE(csd.volume, 0)) as sector_volume,
        AVG(COALESCE(csd.current_price, 0)) as avg_price
      FROM companies c
      LEFT JOIN current_stock_data csd ON c.id = csd.company_id
      WHERE c.sector IS NOT NULL AND c.sector != ''
      GROUP BY c.sector
      ORDER BY avg_performance DESC
    `

    const sectors = await database.query(query)

    return sectors.map((sector) => ({
      ...sector,
      performance_rating: this.rateSectorPerformance(sector.avg_performance),
      volatility: Math.abs(sector.best_stock - sector.worst_stock),
      volume_share: 0, // Would calculate based on total market volume
    }))
  }

  async getTopPerformers() {
    const gainersQuery = `
      SELECT c.symbol, c.name, c.sector, csd.change_percentage, csd.volume
      FROM companies c
      JOIN current_stock_data csd ON c.id = csd.company_id
      WHERE csd.change_percentage > 0
      ORDER BY csd.change_percentage DESC
      LIMIT 10
    `

    const losersQuery = `
      SELECT c.symbol, c.name, c.sector, csd.change_percentage, csd.volume
      FROM companies c
      JOIN current_stock_data csd ON c.id = csd.company_id
      WHERE csd.change_percentage < 0
      ORDER BY csd.change_percentage ASC
      LIMIT 10
    `

    const volumeQuery = `
      SELECT c.symbol, c.name, c.sector, csd.volume, csd.change_percentage
      FROM companies c
      JOIN current_stock_data csd ON c.id = csd.company_id
      ORDER BY csd.volume DESC
      LIMIT 10
    `

    const [gainers, losers, highVolume] = await Promise.all([
      database.query(gainersQuery),
      database.query(losersQuery),
      database.query(volumeQuery),
    ])

    return {
      top_gainers: gainers,
      top_losers: losers,
      high_volume: highVolume,
    }
  }

  async getMarketIndicators() {
    // Calculate various market indicators
    const pricesQuery = `
      SELECT AVG(current_price) as avg_price, 
             COUNT(*) as total_stocks
      FROM current_stock_data
      WHERE current_price > 0
    `

    const volatilityQuery = `
      SELECT AVG(ABS(change_percentage)) as avg_volatility,
             STDEV(change_percentage) as price_dispersion
      FROM current_stock_data
      WHERE change_percentage IS NOT NULL
    `

    const [priceData, volatilityData] = await Promise.all([
      database.query(pricesQuery),
      database.query(volatilityQuery),
    ])

    return {
      market_price_level: priceData[0].avg_price,
      market_volatility: volatilityData[0].avg_volatility,
      price_dispersion: volatilityData[0].price_dispersion,
      vix_equivalent: this.calculateVIXEquivalent(volatilityData[0].avg_volatility),
    }
  }

  async getRiskAssessment() {
    const riskQuery = `
      SELECT 
        COUNT(CASE WHEN change_percentage < -5 THEN 1 END) as high_risk_stocks,
        COUNT(CASE WHEN change_percentage BETWEEN -5 AND -2 THEN 1 END) as medium_risk_stocks,
        COUNT(CASE WHEN change_percentage > -2 THEN 1 END) as low_risk_stocks,
        AVG(ABS(change_percentage)) as avg_price_movement
      FROM current_stock_data
      WHERE change_percentage IS NOT NULL
    `

    const result = await database.query(riskQuery)
    const riskData = result[0]

    return {
      ...riskData,
      overall_risk_level: this.assessOverallRisk(riskData),
      risk_distribution: {
        high: riskData.high_risk_stocks,
        medium: riskData.medium_risk_stocks,
        low: riskData.low_risk_stocks,
      },
    }
  }

  // Utility methods
  calculateMarketSentiment(overview) {
    const ratio = overview.advancing / Math.max(overview.declining, 1)
    if (ratio > 1.5) return "very_bullish"
    if (ratio > 1.2) return "bullish"
    if (ratio > 0.8) return "neutral"
    if (ratio > 0.5) return "bearish"
    return "very_bearish"
  }

  rateSectorPerformance(avgPerformance) {
    if (avgPerformance > 3) return "excellent"
    if (avgPerformance > 1) return "good"
    if (avgPerformance > -1) return "neutral"
    if (avgPerformance > -3) return "poor"
    return "very_poor"
  }

  calculateVIXEquivalent(volatility) {
    // Simplified VIX calculation
    return Math.min(100, Math.max(0, volatility * 5))
  }

  assessOverallRisk(riskData) {
    const totalStocks = riskData.high_risk_stocks + riskData.medium_risk_stocks + riskData.low_risk_stocks
    const highRiskRatio = riskData.high_risk_stocks / totalStocks

    if (highRiskRatio > 0.3) return "high"
    if (highRiskRatio > 0.15) return "medium"
    return "low"
  }

  // Cache management
  setCache(key, data) {
    this.analysisCache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  getFromCache(key) {
    const cached = this.analysisCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    this.analysisCache.delete(key)
    return null
  }
}

module.exports = new MarketAnalysisService()
