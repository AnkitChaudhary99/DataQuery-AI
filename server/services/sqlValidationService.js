import sqlParser from "node-sql-parser";

// Extract Parser from the CommonJS package
const { Parser } = sqlParser;

const parser = new Parser();

const validateSQL = (sql) => {

    if (!sql || typeof sql !== "string") {
        throw new Error("SQL query is required");
    }

    // Remove optional Markdown code fences
    const cleanedSQL = sql
        .replace(/^```(?:sql)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    if (!cleanedSQL) {
        throw new Error("SQL query cannot be empty");
    }

    let ast;

    try {

        ast = parser.astify(cleanedSQL, {
            database: "Postgresql",
        });

    } catch (error) {

        throw new Error(
            `Invalid SQL syntax: ${error.message}`
        );

    }

    // Reject multiple SQL statements
    if (Array.isArray(ast)) {

        if (ast.length !== 1) {
            throw new Error(
                "Multiple SQL statements are not allowed"
            );
        }

        ast = ast[0];

    }

    // Allow SELECT statements only
    if (!ast || ast.type !== "select") {

        throw new Error(
            "Only SELECT queries are allowed"
        );

    }

    return cleanedSQL;

};

export default validateSQL;