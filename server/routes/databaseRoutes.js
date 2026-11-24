import express from "express";

import {
    fetchDatabaseSchema,
} from "../controllers/databaseController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All database routes require authentication
router.use(authMiddleware);

router.get("/schema", fetchDatabaseSchema);

export default router;