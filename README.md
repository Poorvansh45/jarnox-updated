# EquiTrack - Stock Market Dashboard

A comprehensive stock market dashboard web application built with Node.js, Express, EJS, and Bootstrap. EquiTrack provides real-time stock data visualization, portfolio management, and market analysis tools.

## 🚀 Features

### Core Functionality
- **Real-time Stock Data**: Live stock prices with interactive charts
- **Company Management**: Add, edit, and delete companies from the database
- **Market Analytics**: Sector performance analysis and market trends
- **Watchlist Management**: Personal stock watchlist with alerts
- **Responsive Design**: Mobile-first Bootstrap interface
- **Admin Panel**: Complete company management system

### Technical Features
- **Interactive Charts**: Chart.js integration with multiple chart types
- **Data Caching**: Intelligent caching for improved performance
- **Market Analysis**: Technical indicators and trend analysis
- **RESTful API**: Comprehensive API endpoints for all operations
- **Database Integration**: PostgreSQL/SQLite support with migrations
- **Error Handling**: Robust error handling and validation

## 📁 Project Structure

\`\`\`
EquiTrack/
├── public/                 # Static assets
│   ├── css/
│   │   └── style.css      # Custom styles
│   └── js/
│       ├── main.js        # Dashboard functionality
│       ├── analytics.js   # Analytics page scripts
│       └── watchlist.js   # Watchlist management
├── routes/                 # Express routes
│   ├── api.js             # API endpoints
│   ├── dashboard.js       # Dashboard routes
│   └── admin.js           # Admin panel routes
├── scripts/                # Database scripts
│   ├── 01_create_tables.sql
│   ├── 02_seed_companies.sql
│   ├── 03_seed_stock_data.sql
│   └── 04_seed_current_data.sql
├── services/               # Business logic
│   ├── database.js        # Database connection
│   ├── stockService.js    # Stock data operations
│   ├── dataUpdateService.js
│   └── marketAnalysisService.js
├── tests/                  # Test files
├── views/                  # EJS templates
│   ├── layouts/
│   │   └── boilerplate.ejs
│   ├── pages/
│   │   ├── dashboard.ejs
│   │   ├── watchlist.ejs
│   │   ├── analytics.ejs
│   │   ├── admin.ejs
│   │   ├── add-company.ejs
│   │   ├── edit-company.ejs
│   │   └── error.ejs
│   └── partials/
│       ├── header.ejs
│       └── footer.ejs
├── app.js                  # Express app configuration
├── server.js              # Server startup
└── package.json           # Dependencies
\`\`\`

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL or SQLite
- Git

### Step 1: Clone the Repository
\`\`\`bash
git clone <repository-url>
cd EquiTrack
\`\`\`

### Step 2: Install Dependencies
\`\`\`bash
npm install
\`\`\`

### Step 3: Environment Configuration
Create a `.env` file in the root directory:
\`\`\`env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/equitrack
# OR for SQLite
# DATABASE_URL=sqlite:./equitrack.db

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: External API Keys
ALPHA_VANTAGE_API_KEY=your_api_key_here
\`\`\`

### Step 4: Database Setup
Run the database migration scripts:
\`\`\`bash
# Create tables
npm run db:create

# Seed with sample data
npm run db:seed
\`\`\`

Or manually run SQL scripts:
\`\`\`bash
# Connect to your database and run:
psql -d equitrack -f scripts/01_create_tables.sql
psql -d equitrack -f scripts/02_seed_companies.sql
psql -d equitrack -f scripts/03_seed_stock_data.sql
psql -d equitrack -f scripts/04_seed_current_data.sql
\`\`\`

### Step 5: Start the Application
\`\`\`bash
# Development mode
npm run dev

# Production mode
npm start
\`\`\`

The application will be available at `http://localhost:3000`

## 📊 Usage Guide

### Dashboard
- **Main View**: Overview of market performance with top gainers/losers
- **Company Selection**: Click on any company in the sidebar to view detailed charts
- **Chart Interactions**: Hover for data points, toggle between different time periods

### Watchlist
- **Add Stocks**: Search and add companies to your personal watchlist
- **Remove Stocks**: Click the remove button to delete from watchlist
- **Quick Actions**: Direct links to company charts and analysis

### Analytics
- **Sector Performance**: View performance across different market sectors
- **Market Heatmap**: Visual representation of market movements
- **Technical Analysis**: Moving averages and trend indicators

### Admin Panel
Access the admin panel at `/admin` for company management:
- **Add Companies**: Create new company entries with sector classification
- **Edit Companies**: Update company information and market cap
- **Delete Companies**: Remove companies (with confirmation)
- **Bulk Operations**: Manage multiple companies efficiently

## 🔧 API Endpoints

### Public API
\`\`\`
GET /api/companies              # Get all companies
GET /api/companies/:id          # Get company details
GET /api/companies/:id/prices   # Get stock price history
GET /api/market/summary         # Market overview
GET /api/market/gainers         # Top gaining stocks
GET /api/market/losers          # Top losing stocks
GET /api/sectors                # Sector performance
\`\`\`

### Admin API
\`\`\`
POST /admin/companies           # Create company
PUT /admin/companies/:id        # Update company
DELETE /admin/companies/:id     # Delete company
\`\`\`

### Watchlist API
\`\`\`
GET /api/watchlist              # Get user watchlist
POST /api/watchlist             # Add to watchlist
DELETE /api/watchlist/:id       # Remove from watchlist
\`\`\`

## 🧪 Testing

Run the test suite:
\`\`\`bash
# Run all tests
npm test

# Run specific test file
npm test tests/stockService.test.js

# Run with coverage
npm run test:coverage
\`\`\`

## 🚀 Deployment

### Using Docker
\`\`\`bash
# Build image
docker build -t equitrack .

# Run container
docker run -p 3000:3000 --env-file .env equitrack
\`\`\`

### Using Docker Compose
\`\`\`bash
docker-compose up -d
\`\`\`

### Manual Deployment
1. Set up production database
2. Configure environment variables
3. Install dependencies: `npm ci --production`
4. Run database migrations
5. Start application: `npm start`

## 🔒 Security Features

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection (recommended to add)
- Environment variable security
- Error handling without information leakage

## 🎨 Customization

### Styling
- Modify `public/css/style.css` for custom styles
- Bootstrap classes can be overridden
- Color scheme defined in CSS variables

### Adding New Features
1. Create new route in `routes/`
2. Add business logic in `services/`
3. Create EJS template in `views/pages/`
4. Update navigation in `views/partials/header.ejs`

### Database Schema Changes
1. Create new migration script in `scripts/`
2. Update service methods in `services/stockService.js`
3. Test thoroughly before deployment

## 📈 Performance Optimization

- **Caching**: Implemented in-memory caching for frequently accessed data
- **Database Indexing**: Proper indexes on frequently queried columns
- **Lazy Loading**: Charts and data loaded on demand
- **Compression**: Enable gzip compression in production
- **CDN**: Use CDN for Bootstrap and Chart.js in production

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
\`\`\`bash
# Check database URL and credentials
echo $DATABASE_URL
# Ensure database server is running
\`\`\`

**Port Already in Use**
\`\`\`bash
# Change port in .env file or kill existing process
lsof -ti:3000 | xargs kill -9
\`\`\`

**Missing Dependencies**
\`\`\`bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Debug Mode
Enable debug logging:
\`\`\`bash
DEBUG=equitrack:* npm start
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Chart.js for interactive charts
- Bootstrap for responsive design
- Express.js for web framework
- PostgreSQL for database
- Font Awesome for icons

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@equitrack.com
- Documentation: [Wiki](link-to-wiki)

---

**Built with ❤️ for the JarNox Technical Assessment**
