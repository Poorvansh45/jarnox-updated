const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const fs = require("fs")

class Database {
  constructor() {
    this.db = null
    this.dbPath = process.env.DATABASE_URL || path.join(__dirname, "../data/equitrack.db")
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("Error opening database:", err.message)
          reject(err)
        } else {
          console.log("Connected to SQLite database")
          // Enable foreign keys
          this.db.run("PRAGMA foreign_keys = ON")
          resolve()
        }
      })
    })
  }

  async runScript(scriptPath) {
    return new Promise((resolve, reject) => {
      const fullPath = path.join(__dirname, "../scripts", scriptPath)
      const sql = fs.readFileSync(fullPath, "utf8")

      this.db.exec(sql, (err) => {
        if (err) {
          console.error(`Error running script ${scriptPath}:`, err.message)
          reject(err)
        } else {
          console.log(`Successfully executed ${scriptPath}`)
          resolve()
        }
      })
    })
  }

  async initialize() {
    try {
      await this.connect()

      // Run initialization scripts in order
      const scripts = [
        "01_create_tables.sql",
        "02_seed_companies.sql",
        "03_seed_stock_data.sql",
        "04_seed_current_data.sql",
      ]

      for (const script of scripts) {
        await this.runScript(script)
      }

      console.log("Database initialization completed successfully")
    } catch (error) {
      console.error("Database initialization failed:", error)
      throw error
    }
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID, changes: this.changes })
        }
      })
    })
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err)
          } else {
            console.log("Database connection closed")
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }
}

module.exports = new Database()
