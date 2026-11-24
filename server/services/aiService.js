import ai from "../config/gemini.js";

import buildSQLPrompt from "./promptService.js";


// ---------------------------------------------
// GENERATE CONTENT USING GEMINI
// ---------------------------------------------

const generateWithModel = async (model, prompt) => {

    console.log(`Attempting Gemini model: ${model}`);

    const response = await ai.models.generateContent({

        model,

        contents: prompt,

    });

    const generatedText = response.text?.trim();

    if (!generatedText) {

        throw new Error("Gemini returned an empty response");

    }

    return generatedText;

};


// ---------------------------------------------
// PRIMARY + FALLBACK MODEL HANDLING
// ---------------------------------------------

const generateWithFallback = async (prompt) => {

    const primaryModel =
        process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const fallbackModel =
        process.env.GEMINI_FALLBACK_MODEL || "gemini-3.7-flash";


    try {

        return await generateWithModel(
            primaryModel,
            prompt
        );

    } catch (primaryError) {

        console.error(
            "Primary Gemini model failed:",
            primaryError.message
        );


        if (
            primaryError.status !== 503 &&
            primaryError.status !== 429
        ) {

            throw primaryError;

        }


        console.log(
            "Switching to fallback model:",
            fallbackModel
        );


        try {

            return await generateWithModel(
                fallbackModel,
                prompt
            );

        } catch (fallbackError) {

            console.error(
                "Fallback Gemini model failed:",
                fallbackError.message
            );

            throw new Error(
                "All configured Gemini models are currently unavailable."
            );

        }

    }

};


// ---------------------------------------------
// STEP 1: GENERATE SQL
// ---------------------------------------------

const generateSQL = async (
    question,
    schema,
    conversationHistory = []
) => {

    console.log("--------------------------------");
    console.log("Generating SQL using Gemini");
    console.log("--------------------------------");


    const prompt = buildSQLPrompt(
        question,
        schema,
        conversationHistory
    );


    const sqlQuery = await generateWithFallback(prompt);


    console.log("SQL generated successfully!");


    return sqlQuery;

};


// ---------------------------------------------
// STEP 2: AUTOMATIC SQL CORRECTION
// ---------------------------------------------

export const correctSQL = async ({
    question,
    schema,
    previousSQL,
    errorMessage,
    conversationHistory = []
}) => {

    console.log("--------------------------------");
    console.log("Attempting automatic SQL correction");
    console.log("--------------------------------");


    const correctionPrompt = `

You are an expert PostgreSQL database developer.

Your task is to correct an SQL query that failed
during validation or execution.

ORIGINAL USER QUESTION:

${question}


DATABASE SCHEMA:

${JSON.stringify(schema, null, 2)}


PREVIOUS CONVERSATION:

${JSON.stringify(conversationHistory, null, 2)}


PREVIOUS SQL QUERY:

${previousSQL}


ERROR MESSAGE:

${errorMessage}


INSTRUCTIONS:

1. Understand the original user question.
2. Consider previous conversation context.
3. Identify the problem in the previous SQL.
4. Use only existing tables and columns.
5. Preserve the original user's intent.
6. Generate PostgreSQL-compatible SQL.
7. Generate SELECT statements only.
8. Do not generate multiple SQL statements.
9. Do not invent table names or columns.
10. Return ONLY the corrected SQL query.
11. Do not include explanations or Markdown formatting.


CORRECTED SQL:

`;


    const correctedSQL = await generateWithFallback(
        correctionPrompt
    );


    console.log("Corrected SQL generated successfully!");


    return correctedSQL;

};


// ---------------------------------------------
// EXPORT
// ---------------------------------------------

export default generateSQL;