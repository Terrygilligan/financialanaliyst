// functions/src/gemini.ts

import { VertexAI } from "@google-cloud/vertexai";
import { getFirestore } from "firebase-admin/firestore";
import { ReceiptData, Category, RECEIPT_SCHEMA } from "./schema";

const db = getFirestore();

// Initialize Vertex AI client using service account (ADC). No API key required.
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
// Use us-central1 - standard region for Gemini models
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
// Vertex public model identifier - using Gemini 2.5 Flash (1.5 Flash was retired)
const MODEL_NAME = "gemini-2.5-flash";

let cachedModel: ReturnType<VertexAI["getGenerativeModel"]> | null = null;

function getGenerativeModel() {
    if (!PROJECT_ID) {
        throw new Error("GOOGLE_CLOUD_PROJECT is not set; required for Vertex AI.");
    }

    // Log configuration for debugging
    console.log("Vertex AI Config:", {
        project: PROJECT_ID,
        location: LOCATION,
        model: MODEL_NAME
    });

    if (!cachedModel) {
        const vertex = new VertexAI({
            project: PROJECT_ID,
            location: LOCATION,
        });

        cachedModel = vertex.getGenerativeModel({ model: MODEL_NAME });
    }

    return cachedModel;
}

/**
 * Converts a Buffer to base64 string for Vertex AI.
 */
function bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
}

/**
 * Determines the MIME type based on file extension or buffer content.
 * Defaults to 'image/jpeg' if unknown.
 */
function getMimeType(filePath: string): string {
    const extension = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf'
    };
    return mimeTypes[extension || ''] || 'image/jpeg';
}

/**
 * Retry wrapper for Gemini API calls with exponential backoff
 * Handles 429 rate limit errors gracefully
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            // Check if it's a rate limit error (429)
            const isRateLimit = error.code === 429 || 
                               error.status === 429 ||
                               error.message?.includes('429') ||
                               error.message?.includes('rate limit') ||
                               error.message?.includes('quota');
            
            if (!isRateLimit || attempt === maxRetries) {
                // Not a rate limit error, or max retries reached
                throw error;
            }
            
            // Calculate exponential backoff delay
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(`[Gemini] Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError!;
}

/**
 * Calls Google Gemini API to extract structured receipt data from an image.
 * 
 * @param imageBuffer - The binary content of the receipt image
 * @param filePath - The file path (used to determine MIME type)
 * @returns Promise<ReceiptData> - The extracted receipt data
 * @throws Error if the API call fails or returns invalid data
 */
export async function extractReceiptData(
    imageBuffer: Buffer,
    filePath: string,
    businessId: string
): Promise<ReceiptData> {
    return retryWithBackoff(async () => {
        const generativeModel = getGenerativeModel();

    // 1. Fetch the active schema for the business
    let schema: any;
    try {
        const schemaSnapshot = await db.collection(`businesses/${businessId}/schemas`)
            .where('active', '==', true)
            .limit(1)
            .get();

        if (schemaSnapshot.empty) {
            // Fallback to schema_definitions (legacy)
            const legacySnapshot = await db.collection(`businesses/${businessId}/schema_definitions`).get();
            if (legacySnapshot.empty) {
                console.warn(`No active schema found for business ${businessId}. Falling back to default schema.`);
                schema = RECEIPT_SCHEMA;
            } else {
                // Merge legacy custom fields into the base schema
                const customFields: any = {};
                legacySnapshot.forEach(doc => {
                    customFields[doc.id] = {
                        type: "string",
                        description: doc.data().description || `Custom field: ${doc.id}`
                    };
                });
                schema = {
                    ...RECEIPT_SCHEMA,
                    properties: { ...RECEIPT_SCHEMA.properties, ...customFields }
                };
            }
        } else {
            const schemaData = schemaSnapshot.docs[0].data();
            // Jules format uses a 'fields' property containing the schema
            schema = schemaData.fields || schemaData;
            console.log(`Using active schema '${schemaSnapshot.docs[0].id}' for business ${businessId}`);
        }
    } catch (error) {
        console.error(`Error fetching schema for business ${businessId}:`, error);
        schema = RECEIPT_SCHEMA;
    }

    // Convert image to base64
    const base64Image = bufferToBase64(imageBuffer);
    const mimeType = getMimeType(filePath);

    // 3. Construct the dynamic prompt.
    const prompt = `Analyze this receipt image and extract the following information as a valid JSON object:
${JSON.stringify(schema.properties, null, 2)}

Category Descriptions:
- "Maintenance": Tools, hardware, repairs, equipment maintenance
- "Cleaning Supplies": Cleaning products, detergents, paper towels, etc.
- "Utilities": Electricity, water, gas, internet, phone bills
- "Supplies": Office supplies, general business supplies
- "Other": Anything that doesn't fit the above categories

Be precise and extract only information that is clearly visible on the receipt.
Return ONLY a single, valid JSON object, with no other text, comments, or markdown.`;

    try {
            // Prepare the multimodal request for Vertex AI (service account auth)
            const result = await generativeModel.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64Image
                                }
                            },
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2
                }
            });

            const candidate = result.response?.candidates?.[0];
            const textResponse = candidate?.content?.parts
                ?.map((part: any) => part.text || "")
                .join("")
                .trim();

            if (!textResponse) {
                throw new Error("No text response from Gemini API");
            }

            // Parse the JSON response
            let jsonText = textResponse.trim();
            
            // Remove markdown code blocks if present
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parse the JSON
            let extractedData: any;
            try {
                extractedData = JSON.parse(jsonText);
            } catch (parseError) {
                // If direct parsing fails, try to extract JSON from the text
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    extractedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error(`Failed to parse JSON from Gemini API response: ${textResponse.substring(0, 200)}`);
            }
            }

            // Validate and transform the extracted data
            const receiptData: ReceiptData = {
                vendorName: extractedData.vendorName || extractedData.vendor || "Unknown Vendor",
                transactionDate: extractedData.transactionDate || extractedData.date || new Date().toISOString().split('T')[0],
                totalAmount: parseFloat(extractedData.totalAmount || extractedData.amount || extractedData.total || "0"),
                category: validateCategory(extractedData.category),
                timestamp: new Date().toISOString(),
                // Phase 2.4: Currency field (extracted by Gemini)
                currency: extractedData.currency,
                // Phase 3.1: VAT fields (extracted by Gemini if visible)
                supplierVatNumber: extractedData.supplierVatNumber,
                vatBreakdown: extractedData.vatBreakdown ? {
                    subtotal: extractedData.vatBreakdown.subtotal ? parseFloat(extractedData.vatBreakdown.subtotal) : undefined,
                    vatAmount: extractedData.vatBreakdown.vatAmount ? parseFloat(extractedData.vatBreakdown.vatAmount) : undefined,
                    vatRate: extractedData.vatBreakdown.vatRate ? parseFloat(extractedData.vatBreakdown.vatRate) : undefined
                } : undefined
            };

            // Dynamically add custom schema fields to the final object
            // We can determine which fields are custom by checking schema.properties
            Object.keys(schema.properties).forEach((key) => {
                if (!RECEIPT_SCHEMA.properties.hasOwnProperty(key)) {
                    if (extractedData[key] !== undefined) {
                        receiptData[key] = extractedData[key];
                    }
                }
            });

            // Validate required fields
            if (!receiptData.vendorName || receiptData.vendorName === "Unknown Vendor") {
                throw new Error("Could not extract vendor name from receipt");
            }
            
            if (isNaN(receiptData.totalAmount) || receiptData.totalAmount <= 0) {
                throw new Error(`Invalid total amount extracted: ${extractedData.totalAmount}`);
            }

            if (!receiptData.transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(receiptData.transactionDate)) {
                console.warn(`Invalid date format, using today's date: ${receiptData.transactionDate}`);
                receiptData.transactionDate = new Date().toISOString().split('T')[0];
            }

            return receiptData;

        } catch (error) {
            console.error("Gemini API error:", error);
            throw new Error(`Failed to extract receipt data: ${(error as Error).message}`);
        }
    });
}

/**
 * Validates and normalizes the category value.
 * Falls back to "Other" if the category doesn't match any enum value.
 */
function validateCategory(category: string | undefined): Category {
    if (!category) {
        return Category.OTHER;
    }

    // Case-insensitive matching
    const normalized = category.trim();
    const categoryValues = Object.values(Category);
    
    for (const validCategory of categoryValues) {
        if (validCategory.toLowerCase() === normalized.toLowerCase()) {
            return validCategory;
        }
    }

    // Try partial matching for common variations
    const lowerCategory = normalized.toLowerCase();
    if (lowerCategory.includes('maintenance')) {
        return Category.MAINTENANCE;
    } else if (lowerCategory.includes('cleaning')) {
        return Category.CLEANING_SUPPLIES;
    } else if (lowerCategory.includes('utilit')) {
        return Category.UTILITIES;
    } else if (lowerCategory.includes('suppl')) {
        return Category.SUPPLIES;
    }

    console.warn(`Unknown category "${category}", defaulting to "Other"`);
    return Category.OTHER;
}
