// functions/src/gemini.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ReceiptData, Category } from "./schema";

// Initialize Gemini client
// Uses API key from environment variable or service account credentials
let genAI: GoogleGenerativeAI | null = null;

function getGenAIClient(): GoogleGenerativeAI {
    if (!genAI) {
        // Try API key first (for @google/generative-ai SDK)
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (apiKey) {
            genAI = new GoogleGenerativeAI(apiKey);
        } else {
            // Fallback: try to use Application Default Credentials
            // Note: @google/generative-ai may not support ADC directly
            // In that case, you'll need to set GEMINI_API_KEY in environment
            throw new Error("GEMINI_API_KEY environment variable is required. Please set it in your .env file or Firebase Functions config.");
        }
    }
    return genAI;
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
 * Calls Google Gemini API to extract structured receipt data from an image.
 * 
 * @param imageBuffer - The binary content of the receipt image
 * @param filePath - The file path (used to determine MIME type)
 * @returns Promise<ReceiptData> - The extracted receipt data
 * @throws Error if the API call fails or returns invalid data
 */
export async function extractReceiptData(
    imageBuffer: Buffer,
    filePath: string
): Promise<ReceiptData> {
    const genAI = getGenAIClient();
    
    // Use simple model name - the SDK handles path resolution automatically
    const model = "gemini-2.5-flash";
    const generativeModel = genAI.getGenerativeModel({ model });

    // Convert image to base64
    const base64Image = bufferToBase64(imageBuffer);
    const mimeType = getMimeType(filePath);

    // Construct the prompt with clear instructions
    const prompt = `Analyze this receipt image and extract the following information as JSON:
{
  "vendorName": "The name of the store or business",
  "transactionDate": "The purchase date in YYYY-MM-DD format",
  "totalAmount": The final total including tax (as a number, no currency symbols),
  "category": "One of: Maintenance, Cleaning Supplies, Utilities, Supplies, or Other"
}

Categories:
- "Maintenance": Tools, hardware, repairs, equipment maintenance
- "Cleaning Supplies": Cleaning products, detergents, paper towels, etc.
- "Utilities": Electricity, water, gas, internet, phone bills
- "Supplies": Office supplies, general business supplies
- "Other": Anything that doesn't fit the above categories

Be precise and extract only information that is clearly visible on the receipt.
Return ONLY valid JSON, no other text.`;

    try {
        // Prepare the multimodal request for @google/generative-ai SDK
        const result = await generativeModel.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            },
            {
                text: prompt
            }
        ]);
        
        const response = result.response;
        
        // Extract text from response
        const textResponse = response.text();
        
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
            timestamp: new Date().toISOString()
        };

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
