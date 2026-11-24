import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import databaseRoutes from "./routes/databaseRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";

const app = express();


// ---------------------------------------------
// MIDDLEWARE
// ---------------------------------------------

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());

app.use(cookieParser());


// ---------------------------------------------
// HEALTH CHECK
// ---------------------------------------------

app.get("/", (req, res) => {

    res.status(200).json({
        success: true,
        message: "Data Query AI API is running",
    });

});


// ---------------------------------------------
// API ROUTES
// ---------------------------------------------

// Authentication routes
app.use("/api/auth", authRoutes);

// Database routes
app.use("/api/database", databaseRoutes);

// AI query routes
app.use("/api/query", queryRoutes);


export default app;