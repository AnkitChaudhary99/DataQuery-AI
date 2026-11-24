import pool from "../config/database.js";


// ---------------------------------------------
// STEP 1: CREATE A NEW CONVERSATION
// ---------------------------------------------

export const createConversation = async (userId) => {

    const result = await pool.query(
        `
        INSERT INTO app_internal.conversations
        (user_id)
        VALUES ($1)
        RETURNING id
        `,
        [userId]
    );

    return result.rows[0].id;

};


// ---------------------------------------------
// STEP 2: RETRIEVE CONVERSATION HISTORY
// ---------------------------------------------

export const getConversationHistory = async (
    conversationId,
    userId
) => {

    // Verify conversation ownership

    const conversation = await pool.query(
        `
        SELECT id
        FROM app_internal.conversations
        WHERE id = $1
        AND user_id = $2
        `,
        [conversationId, userId]
    );


    if (conversation.rowCount === 0) {
        return null;
    }


    // Retrieve conversation messages

    const result = await pool.query(
        `
        SELECT
            role,
            content,
            sql_query,
            query_results,
            created_at
        FROM app_internal.messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 10
        `,
        [conversationId]
    );


    return result.rows.reverse();

};


// ---------------------------------------------
// STEP 3: SAVE USER QUESTION AND AI RESPONSE
// ---------------------------------------------

export const saveConversationExchange = async ({
    conversationId,
    userId,
    question,
    sqlQuery,
    results,
    columns,
    rowCount
}) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");


        // Verify conversation ownership

        const ownership = await client.query(
            `
            SELECT id
            FROM app_internal.conversations
            WHERE id = $1
            AND user_id = $2
            FOR UPDATE
            `,
            [conversationId, userId]
        );


        if (ownership.rowCount === 0) {

            const error = new Error(
                "Conversation not found"
            );

            error.statusCode = 404;

            throw error;

        }


        // Save user message

        await client.query(
            `
            INSERT INTO app_internal.messages
            (
                conversation_id,
                role,
                content
            )
            VALUES ($1, $2, $3)
            `,
            [
                conversationId,
                "user",
                question
            ]
        );


        // Save AI response

        await client.query(
            `
            INSERT INTO app_internal.messages
            (
                conversation_id,
                role,
                content,
                sql_query,
                query_results
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                conversationId,
                "assistant",
                `Query executed successfully. Returned ${rowCount} rows.`,
                sqlQuery,
                JSON.stringify({
                    columns,
                    rows: results.slice(0, 20),
                    rowCount
                })
            ]
        );


        // Update conversation timestamp

        await client.query(
            `
            UPDATE app_internal.conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            AND user_id = $2
            `,
            [conversationId, userId]
        );


        await client.query("COMMIT");

    } catch (error) {

        await client.query("ROLLBACK");

        throw error;

    } finally {

        client.release();

    }

};