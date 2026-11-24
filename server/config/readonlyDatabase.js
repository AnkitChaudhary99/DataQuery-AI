import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const readonlyPool = new Pool({

    host: process.env.DB_HOST || "localhost",

    port: process.env.DB_PORT || 5432,

    database: process.env.DB_NAME || "data_query_ai",

    user: process.env.READONLY_DB_USER,

    password: process.env.READONLY_DB_PASSWORD,

    max: 5,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 5000,

});

readonlyPool.on("connect", () => {
    console.log("Read-only PostgreSQL connection established");
});

readonlyPool.on("error", (error) => {
    console.error("Read-only PostgreSQL pool error:", error);
});

export default readonlyPool;