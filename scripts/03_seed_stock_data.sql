WITH RECURSIVE date_series(date_val, company_id) AS (
  SELECT date('now', '-30 days'), 1
  UNION ALL
  SELECT date(date_val, '+1 day'), company_id
  FROM date_series
  WHERE date_val < date('now')
),
all_dates AS (
  SELECT date_val, c.id as company_id, c.symbol
  FROM date_series ds
  CROSS JOIN companies c
  WHERE date_val < date('now')
),
base_prices AS (
  SELECT
    company_id,
    date_val,
    CASE 
      WHEN symbol = 'RELIANCE' THEN 2800 + (RANDOM() % 200) - 100
      WHEN symbol = 'TCS' THEN 3500 + (RANDOM() % 300) - 150
      WHEN symbol = 'HDFCBANK' THEN 1600 + (RANDOM() % 150) - 75
      WHEN symbol = 'INFY' THEN 1400 + (RANDOM() % 120) - 60
      WHEN symbol = 'HINDUNILVR' THEN 2400 + (RANDOM() % 200) - 100
      WHEN symbol = 'ICICIBANK' THEN 950 + (RANDOM() % 80) - 40
      WHEN symbol = 'SBIN' THEN 550 + (RANDOM() % 50) - 25
      WHEN symbol = 'BHARTIARTL' THEN 850 + (RANDOM() % 70) - 35
      WHEN symbol = 'ITC' THEN 420 + (RANDOM() % 40) - 20
      WHEN symbol = 'KOTAKBANK' THEN 1800 + (RANDOM() % 150) - 75
      WHEN symbol = 'LT' THEN 2200 + (RANDOM() % 180) - 90
      WHEN symbol = 'HCLTECH' THEN 1200 + (RANDOM() % 100) - 50
      WHEN symbol = 'ASIANPAINT' THEN 3200 + (RANDOM() % 250) - 125
      WHEN symbol = 'MARUTI' THEN 9500 + (RANDOM() % 800) - 400
      ELSE 1000 + (RANDOM() % 100) - 50
    END as open_price
  FROM all_dates
)
INSERT OR REPLACE INTO stock_prices
(company_id, date, open_price, high_price, low_price, close_price, volume)
SELECT
  company_id,
  date_val,
  open_price,
  open_price + (RANDOM() % 50) + 10,
  open_price - (RANDOM() % 40) - 5,
  open_price + (RANDOM() % 60) - 30,
  (RANDOM() % 10000000) + 1000000
FROM base_prices;
