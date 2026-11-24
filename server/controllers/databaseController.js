import getDatabaseSchema from "../services/schemaService.js";

export const fetchDatabaseSchema = async (req, res) => {

    try {

        const schema = await getDatabaseSchema();

        return res.status(200).json({
            success: true,
            message: "Database schema retrieved successfully",
            data: schema,
        });

    } catch (error) {

        console.error("Schema retrieval error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve database schema",
            error: error.message,
        });

    }

};