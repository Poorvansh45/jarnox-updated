INSERT INTO companies (symbol, name, sector, market_cap)
VALUES
('RELIANCE', 'Reliance Industries Limited', 'Oil & Gas', 1800000000000),
('TCS', 'Tata Consultancy Services', 'Information Technology', 1400000000000),
('HDFCBANK', 'HDFC Bank Limited', 'Banking', 1200000000000),
('INFY', 'Infosys Limited', 'Information Technology', 800000000000),
('HINDUNILVR', 'Hindustan Unilever Limited', 'FMCG', 600000000000),
('ICICIBANK', 'ICICI Bank Limited', 'Banking', 700000000000),
('SBIN', 'State Bank of India', 'Banking', 500000000000),
('BHARTIARTL', 'Bharti Airtel Limited', 'Telecommunications', 450000000000),
('ITC', 'ITC Limited', 'FMCG', 400000000000),
('KOTAKBANK', 'Kotak Mahindra Bank', 'Banking', 350000000000),
('LT', 'Larsen & Toubro Limited', 'Construction', 300000000000),
('HCLTECH', 'HCL Technologies Limited', 'Information Technology', 280000000000),
('ASIANPAINT', 'Asian Paints Limited', 'Paints', 250000000000),
('MARUTI', 'Maruti Suzuki India Limited', 'Automobile', 240000000000),
('BAJFINANCE', 'Bajaj Finance Limited', 'Financial Services', 220000000000)
ON CONFLICT(symbol) DO UPDATE SET
    name = excluded.name,
    sector = excluded.sector,
    market_cap = excluded.market_cap;
