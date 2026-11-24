import pool from "../config/database.js";

const getDatabaseSchema = async () => {

    // 1. Retrieve all tables
    const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `;

    const tablesResult = await pool.query(tablesQuery);


    // 2. Retrieve columns and primary key information
    const columnsQuery = `
        SELECT
            c.table_name,
            c.column_name,
            c.data_type,
            c.udt_name,
            c.is_nullable,
            c.column_default,

            CASE
                WHEN pk.column_name IS NOT NULL THEN TRUE
                ELSE FALSE
            END AS is_primary_key

        FROM information_schema.columns c

        LEFT JOIN (
            SELECT
                kcu.table_name,
                kcu.column_name

            FROM information_schema.table_constraints tc

            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
                AND tc.table_name = kcu.table_name

            WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'

        ) pk

        ON c.table_name = pk.table_name
        AND c.column_name = pk.column_name

        WHERE c.table_schema = 'public'

        ORDER BY c.table_name, c.ordinal_position;
    `;

    const columnsResult = await pool.query(columnsQuery);


    // 3. Retrieve foreign key relationships
    // Using PostgreSQL system catalogs to support composite foreign keys

    const foreignKeysQuery = `
        SELECT
            src.relname AS table_name,
            src_att.attname AS column_name,
            tgt.relname AS foreign_table_name,
            tgt_att.attname AS foreign_column_name,
            con.conname AS constraint_name

        FROM pg_constraint con

        JOIN pg_class src
            ON src.oid = con.conrelid

        JOIN pg_namespace src_ns
            ON src_ns.oid = src.relnamespace

        JOIN pg_class tgt
            ON tgt.oid = con.confrelid

        JOIN LATERAL
            unnest(con.conkey) WITH ORDINALITY
            AS src_key(attnum, ord)
            ON TRUE

        JOIN LATERAL
            unnest(con.confkey) WITH ORDINALITY
            AS tgt_key(attnum, ord)
            ON tgt_key.ord = src_key.ord

        JOIN pg_attribute src_att
            ON src_att.attrelid = src.oid
            AND src_att.attnum = src_key.attnum

        JOIN pg_attribute tgt_att
            ON tgt_att.attrelid = tgt.oid
            AND tgt_att.attnum = tgt_key.attnum

        WHERE con.contype = 'f'
        AND src_ns.nspname = 'public'

        ORDER BY src.relname, con.conname, src_key.ord;
    `;

    const foreignKeysResult = await pool.query(foreignKeysQuery);


    // 4. Organize tables
    const tables = {};

    tablesResult.rows.forEach((row) => {

        tables[row.table_name] = {
            tableName: row.table_name,
            columns: [],
            foreignKeys: [],
        };

    });


    // 5. Attach columns
    columnsResult.rows.forEach((row) => {

        if (tables[row.table_name]) {

            tables[row.table_name].columns.push({
                columnName: row.column_name,
                dataType: row.data_type,
                udtName: row.udt_name,
                isNullable: row.is_nullable === "YES",
                defaultValue: row.column_default,
                isPrimaryKey: row.is_primary_key,
            });

        }

    });


    // 6. Attach foreign keys
    foreignKeysResult.rows.forEach((row) => {

        if (tables[row.table_name]) {

            tables[row.table_name].foreignKeys.push({
                column: row.column_name,
                referencesTable: row.foreign_table_name,
                referencesColumn: row.foreign_column_name,
                constraintName: row.constraint_name,
            });

        }

    });


    // 7. Return structured schema
    return {
        database: process.env.DB_NAME,
        schema: "public",
        tables: Object.values(tables),
    };

};

export default getDatabaseSchema;