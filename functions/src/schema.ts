// functions/src/schema.ts

/**
 * Defines the strict categories allowed for financial logging.
 */
export enum Category {
    MAINTENANCE = "Maintenance",
    CLEANING_SUPPLIES = "Cleaning Supplies",
    UTILITIES = "Utilities",
    SUPPLIES = "Supplies",
    OTHER = "Other"
}

/**
 * TypeScript interface for the clean, structured data extracted by Gemini.
 */
export interface ReceiptData {
    vendorName: string;
    transactionDate: string; // YYYY-MM-DD format
    totalAmount: number;
    category: Category;
    timestamp: string; // ISO 8601 timestamp of when the function ran
}

/**
 * JSON Schema definition used to force Gemini's structured output.
 */
export const RECEIPT_SCHEMA = {
    type: "object",
    properties: {
        vendorName: {
            type: "string",
            description: "The name of the company or store on the receipt (e.g., Home Depot, QuickMart)."
        },
        transactionDate: {
            type: "string",
            format: "date",
            description: "The date of the purchase in YYYY-MM-DD format only."
        },
        totalAmount: {
            type: "number",
            description: "The grand total of the purchase, including tax and fees."
        },
        category: {
            type: "string",
            enum: Object.values(Category),
            description: "The assigned business category from the predefined list."
        },
        // We will add the timestamp in the processor, not extracted by AI.
    },
    required: ["vendorName", "transactionDate", "totalAmount", "category"]
};
