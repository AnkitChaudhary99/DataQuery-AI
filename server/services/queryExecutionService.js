import readonlyPool from "../config/readonlyDatabase.js";

const executeQuery = async (sql) => {

    const client = await readonlyPool.connect();

    const startTime = Date.now();

    try {

        // Start a read-only transaction
        await client.query("BEGIN READ ONLY");

        // Limit execution time
        await client.query(
            "SET LOCAL statement_timeout = '10000'"
        );

        // Restrict schema lookup
        await client.query(
            "SET LOCAL search_path TO public"
        );

        // Execute the validated SQL
        const result = await client.query(sql);

        // Commit transaction
        await client.query("COMMIT");

        const executionTime = Date.now() - startTime;

        return {

            columns: result.fields.map(
                (field) => field.name
            ),

            rows: result.rows,

            rowCount: result.rowCount,

            executionTime,

        };

    } catch (error) {

        await client.query("ROLLBACK").catch(() => {});

        console.error("SQL Execution Error:", error.message);

        throw error;

    } finally {

        client.release();

    }

};

export default executeQuery;