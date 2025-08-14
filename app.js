const express = require("express")
const path = require("path")
const cors = require("cors")
const ejsMate = require("ejs-mate")

const database = require("./services/database")

const app = express()

// View engine setup
app.engine("ejs", ejsMate)
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "public")))

database.initialize().catch(console.error)

// Routes
const dashboardRoutes = require("./routes/dashboard")
const apiRoutes = require("./routes/api")
const adminRoutes = require("./routes/admin")

app.use("/", dashboardRoutes)
app.use("/api", apiRoutes)
app.use("/admin", adminRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).render("pages/error", {
    title: "Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).render("pages/error", {
    title: "Page Not Found",
    error: { message: "Page not found", status: 404 },
  })
})

module.exports = app
