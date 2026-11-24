import "dotenv/config";

import app from "./app.js";
import pool from "./config/database.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await pool.query("SELECT NOW()");

        console.log("PostgreSQL connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
};

startServer();