const express = require("express")
const router = express.Router()
const stockService = require("../services/stockService")

// Admin dashboard
router.get("/", async (req, res) => {
  try {
    const companies = await stockService.getAllCompanies()
    const totalCompanies = companies.length
    const marketSummary = await stockService.getMarketSummary()

    res.render("pages/admin", {
      title: "Admin Dashboard",
      companies,
      totalCompanies,
      marketSummary,
    })
  } catch (error) {
    console.error("Error loading admin dashboard:", error)
    res.render("pages/error", {
      title: "Error",
      error: "Failed to load admin dashboard",
    })
  }
})

// Add company form
router.get("/companies/add", (req, res) => {
  res.render("pages/add-company", {
    title: "Add Company",
  })
})

// Create company
router.post("/companies", async (req, res) => {
  try {
    const { symbol, name, sector, market_cap, description } = req.body

    // Validation
    if (!symbol || !name || !sector) {
      return res.status(400).render("pages/add-company", {
        title: "Add Company",
        error: "Symbol, name, and sector are required",
        formData: req.body,
      })
    }

    await stockService.addCompany({
      symbol: symbol.toUpperCase(),
      name,
      sector,
      market_cap: Number.parseFloat(market_cap) || 0,
      description: description || null,
    })

    res.redirect("/admin?success=Company added successfully")
  } catch (error) {
    console.error("Error adding company:", error)
    res.status(500).render("pages/add-company", {
      title: "Add Company",
      error: "Failed to add company",
      formData: req.body,
    })
  }
})

// Edit company form
router.get("/companies/:id/edit", async (req, res) => {
  try {
    const company = await stockService.getCompanyById(req.params.id)
    if (!company) {
      return res.status(404).render("pages/error", {
        title: "Error",
        error: "Company not found",
      })
    }

    res.render("pages/edit-company", {
      title: "Edit Company",
      company,
    })
  } catch (error) {
    console.error("Error loading company:", error)
    res.status(500).render("pages/error", {
      title: "Error",
      error: "Failed to load company",
    })
  }
})

// Update company
router.post("/companies/:id", async (req, res) => {
  try {
    const { symbol, name, sector, market_cap, description } = req.body

    // Validation
    if (!symbol || !name || !sector) {
      const company = await stockService.getCompanyById(req.params.id)
      return res.status(400).render("pages/edit-company", {
        title: "Edit Company",
        error: "Symbol, name, and sector are required",
        company: { ...company, ...req.body },
      })
    }

    await stockService.updateCompany(req.params.id, {
      symbol: symbol.toUpperCase(),
      name,
      sector,
      market_cap: Number.parseFloat(market_cap) || 0,
      description: description || null,
    })

    res.redirect("/admin?success=Company updated successfully")
  } catch (error) {
    console.error("Error updating company:", error)
    const company = await stockService.getCompanyById(req.params.id)
    res.status(500).render("pages/edit-company", {
      title: "Edit Company",
      error: "Failed to update company",
      company: { ...company, ...req.body },
    })
  }
})

// Delete company
router.post("/companies/:id/delete", async (req, res) => {
  try {
    await stockService.deleteCompany(req.params.id)
    res.redirect("/admin?success=Company deleted successfully")
  } catch (error) {
    console.error("Error deleting company:", error)
    res.redirect("/admin?error=Failed to delete company")
  }
})

module.exports = router
