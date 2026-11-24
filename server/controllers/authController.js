import pool from "../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


// ---------------------------------------------
// COOKIE CONFIGURATION
// ---------------------------------------------

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
};


// ---------------------------------------------
// GENERATE JWT TOKEN
// ---------------------------------------------

const generateToken = (userId) => {

    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        }
    );

};


// ---------------------------------------------
// STEP 1: REGISTER USER
// ---------------------------------------------

export const registerUser = async (req, res) => {

    try {

        const { name, email, password } = req.body;

        // Validate input

        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });

        }

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid input format"
            });

        }

        if (name.trim().length === 0) {

            return res.status(400).json({
                success: false,
                message: "Name cannot be empty"
            });

        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {

            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });

        }

        if (password.length < 8) {

            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });

        }


        // Check whether user already exists

        const existingUser = await pool.query(
            `
            SELECT id
            FROM app_internal.users
            WHERE LOWER(email) = $1
            `,
            [normalizedEmail]
        );

        if (existingUser.rowCount > 0) {

            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });

        }


        // Hash password

        const saltRounds = 12;

        const passwordHash = await bcrypt.hash(
            password,
            saltRounds
        );


        // Insert new user

        const result = await pool.query(
            `
            INSERT INTO app_internal.users
            (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, created_at
            `,
            [
                name.trim(),
                normalizedEmail,
                passwordHash
            ]
        );

        const user = result.rows[0];


        // Generate JWT

        const token = generateToken(user.id);


        // Set HTTP-only cookie

        res.cookie(
            "token",
            token,
            cookieOptions
        );


        return res.status(201).json({

            success: true,

            message: "Account created successfully",

            user

        });

    } catch (error) {

        console.error("Registration error:", error);

        return res.status(500).json({

            success: false,

            message: "Failed to register user"

        });

    }

};


// ---------------------------------------------
// STEP 2: LOGIN USER
// ---------------------------------------------

export const loginUser = async (req, res) => {

    try {

        const { email, password } = req.body;


        // Validate input

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message: "Email and password are required"

            });

        }


        const normalizedEmail = email.trim().toLowerCase();


        // Find user

        const result = await pool.query(
            `
            SELECT id, name, email, password_hash
            FROM app_internal.users
            WHERE LOWER(email) = $1
            `,
            [normalizedEmail]
        );


        if (result.rowCount === 0) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password"

            });

        }


        const user = result.rows[0];


        // Compare password

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );


        if (!isPasswordValid) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password"

            });

        }


        // Generate JWT

        const token = generateToken(user.id);


        // Set authentication cookie

        res.cookie(
            "token",
            token,
            cookieOptions
        );


        return res.status(200).json({

            success: true,

            message: "Login successful",

            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }

        });


    } catch (error) {

        console.error("Login error:", error);

        return res.status(500).json({

            success: false,

            message: "Login failed"

        });

    }

};


// ---------------------------------------------
// STEP 3: LOGOUT USER
// ---------------------------------------------

export const logoutUser = (req, res) => {

    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    return res.status(200).json({

        success: true,

        message: "Logged out successfully"

    });

};


// ---------------------------------------------
// STEP 4: GET CURRENT USER
// ---------------------------------------------

export const getCurrentUser = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT id, name, email, created_at
            FROM app_internal.users
            WHERE id = $1
            `,
            [req.user.id]
        );


        if (result.rowCount === 0) {

            return res.status(404).json({

                success: false,

                message: "User not found"

            });

        }


        return res.status(200).json({

            success: true,

            user: result.rows[0]

        });


    } catch (error) {

        console.error("Get current user error:", error);

        return res.status(500).json({

            success: false,

            message: "Failed to retrieve user"

        });

    }

};