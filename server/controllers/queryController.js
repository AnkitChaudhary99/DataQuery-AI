import generateSQL, {
    correctSQL
} from "../services/aiService.js";

import getDatabaseSchema from "../services/schemaService.js";

import validateSQL from "../services/sqlValidationService.js";

import executeQuery from "../services/queryExecutionService.js";

import {
    createConversation,
    getConversationHistory,
    saveConversationExchange
} from "../services/conversationService.js";


const MAX_CORRECTION_ATTEMPTS = 2;


// ---------------------------------------------
// CHECK WHETHER AN ERROR CAN BE AUTO-CORRECTED
// ---------------------------------------------

const isCorrectableError = (error) => {

    if (
        error.message?.startsWith("Invalid SQL syntax:")
    ) {

        return true;

    }

    const errorCode = error.code;

    if (
        typeof errorCode === "string" &&
        errorCode.startsWith("42")
    ) {

        return true;

    }

    return false;

};


// ---------------------------------------------
// MAIN QUERY CONTROLLER
// ---------------------------------------------

export const generateQuery = async (req, res) => {

    try {

        const {
            question,
            conversationId: requestedConversationId
        } = req.body;


        // STEP 1: VALIDATE USER INPUT

        if (
            !question ||
            typeof question !== "string" ||
            !question.trim()
        ) {

            return res.status(400).json({

                success: false,

                message: "Please provide a valid question"

            });

        }


        const userQuestion = question.trim();


        // STEP 2: VALIDATE CONVERSATION ID

        let conversationId;


        if (requestedConversationId) {

            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


            if (!uuidRegex.test(requestedConversationId)) {

                return res.status(400).json({

                    success: false,

                    message: "Invalid conversation ID"

                });

            }


            conversationId = requestedConversationId;

        } else {

            conversationId = await createConversation(req.user.id);

        }


        // STEP 3: RETRIEVE CONVERSATION HISTORY

        let conversationHistory;


        if (requestedConversationId) {

            conversationHistory = await getConversationHistory(
            conversationId,
            req.user.id
            );


            if (conversationHistory === null) {

                return res.status(404).json({

                    success: false,

                    message: "Conversation not found"

                });

            }

        } else {

            conversationHistory = [];

        }


        console.log("--------------------------------");
        console.log("New database query request");
        console.log("Conversation ID:", conversationId);
        console.log("Question:", userQuestion);
        console.log(
            "Previous messages:",
            conversationHistory.length
        );
        console.log("--------------------------------");


        // STEP 4: RETRIEVE DATABASE SCHEMA

        const schema = await getDatabaseSchema();


        // STEP 5: GENERATE CONTEXT-AWARE SQL

        let currentSQL = await generateSQL(

            userQuestion,

            schema,

            conversationHistory

        );


        console.log("Initial SQL generated");


        // STEP 6: AUTOMATIC VALIDATION AND EXECUTION

        let correctionAttempts = 0;


        while (true) {

            try {

                console.log("--------------------------------");

                console.log(
                    `SQL validation attempt: ${correctionAttempts + 1}`
                );

                console.log("--------------------------------");


                // Validate SQL

                const validatedSQL = validateSQL(
                    currentSQL
                );


                console.log("SQL validation successful");


                // Execute SQL

                const queryResult = await executeQuery(
                    validatedSQL
                );


                console.log("SQL execution successful");


                // STEP 7: SAVE CONVERSATION

                await saveConversationExchange({

                    conversationId,

                    userId: req.user.id,

                    question: userQuestion,

                    sqlQuery: validatedSQL,

                    results: queryResult.rows,

                    columns: queryResult.columns,

                    rowCount: queryResult.rowCount

                });


                console.log("Conversation saved successfully");


                // STEP 8: RETURN RESPONSE

                return res.status(200).json({

                    success: true,

                    message: "Query generated and executed successfully",

                    conversationId,

                    question: userQuestion,

                    sqlQuery: validatedSQL,

                    results: queryResult.rows,

                    columns: queryResult.columns,

                    rowCount: queryResult.rowCount,

                    executionTime: queryResult.executionTime,

                    wasAutoCorrected: correctionAttempts > 0,

                    correctionAttempts

                });


            } catch (sqlError) {

                console.error("--------------------------------");

                console.error("SQL processing error");

                console.error("Error:", sqlError.message);

                console.error("--------------------------------");


                // Check correction eligibility

                if (!isCorrectableError(sqlError)) {

                    throw sqlError;

                }


                // Check maximum correction attempts

                if (
                    correctionAttempts >= MAX_CORRECTION_ATTEMPTS
                ) {

                    throw new Error(

                        `SQL correction failed after ${MAX_CORRECTION_ATTEMPTS} attempts. Last error: ${sqlError.message}`

                    );

                }


                correctionAttempts++;


                console.log("--------------------------------");

                console.log(
                    `Automatic correction attempt: ${correctionAttempts}`
                );

                console.log("--------------------------------");


                // Ask Gemini to correct SQL

                currentSQL = await correctSQL({

                    question: userQuestion,

                    schema,

                    previousSQL: currentSQL,

                    errorMessage: sqlError.message,

                    conversationHistory

                });


                console.log("Corrected SQL generated");

            }

        }


    } catch (error) {

        console.error("--------------------------------");

        console.error("Query processing error:", error);

        console.error("--------------------------------");


        const statusCode = error.statusCode || 500;

        return res.status(statusCode).json({

            success: false,

            message: statusCode === 404
                ? "Conversation not found"
                : "Failed to generate or execute SQL query",

            error: statusCode === 500
                ? "An internal server error occurred"
                : undefined

        });

    }

};