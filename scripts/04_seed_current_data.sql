-- Seed current stock data based on latest historical data
INSERT OR REPLACE INTO current_stock_data (
  company_id, 
  current_price, 
  change_amount, 
  change_percentage, 
  high_52w, 
  low_52w, 
  volume
)
SELECT 
  c.id,
  latest.close_price as current_price,
  latest.close_price - prev.close_price as change_amount,
  ROUND(((latest.close_price - prev.close_price) / prev.close_price) * 100, 2) as change_percentage,
  yearly.high_52w,
  yearly.low_52w,
  latest.volume
FROM companies c
JOIN (
  -- Get latest stock price for each company
  SELECT 
    company_id, 
    close_price, 
    volume,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY date DESC) as rn
  FROM stock_prices
) latest ON c.id = latest.company_id AND latest.rn = 1
JOIN (
  -- Get previous day's price for change calculation
  SELECT 
    company_id, 
    close_price,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY date DESC) as rn
  FROM stock_prices
) prev ON c.id = prev.company_id AND prev.rn = 2
JOIN (
  -- Get 52-week high and low
  SELECT 
    company_id,
    MAX(high_price) as high_52w,
    MIN(low_price) as low_52w
  FROM stock_prices
  WHERE date >= date('now', '-365 days')
  GROUP BY company_id
) yearly ON c.id = yearly.company_id;
