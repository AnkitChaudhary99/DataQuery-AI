import express from "express";

import {
    generateQuery,
} from "../controllers/queryController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All AI query routes require authentication
router.use(authMiddleware);

router.post("/generate", generateQuery);

export default router;