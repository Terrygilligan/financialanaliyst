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
    currency?: string; // Currency code (e.g., "USD", "GBP", "EUR") - extracted by Gemini, used for conversion
    entity?: string; // Optional: Entity name (e.g., "Entity A", "Unassigned")
    // Phase 2.4: Currency conversion fields (all optional)
    originalCurrency?: string; // Original currency code (e.g., "USD", "EUR")
    originalAmount?: number; // Original amount before conversion
    exchangeRate?: number; // Exchange rate used for conversion
    conversionDate?: string; // ISO 8601 timestamp of when conversion was done
    // Phase 3.1: VAT extraction fields (all optional for backward compatibility)
    supplierVatNumber?: string; // Supplier's VAT registration number
    vatBreakdown?: {
        subtotal?: number; // Amount before VAT
        vatAmount?: number; // VAT amount charged
        vatRate?: number; // VAT rate as percentage (e.g., 20 for 20%)
    };
    // Phase 3.3: Audit trail fields (all optional)
    processedBy?: string; // 'user' or 'admin' or 'system'
    validationStatus?: string; // 'passed', 'warning', 'failed', 'admin_override'
    hasErrors?: boolean; // Flag for receipts that had processing errors
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
        currency: {
            type: "string",
            description: "The currency code (e.g., USD, GBP, EUR). Default to GBP if not visible."
        },
        category: {
            type: "string",
            enum: Object.values(Category),
            description: "The assigned business category from the predefined list."
        },
        // Phase 3.1: VAT fields (optional)
        supplierVatNumber: {
            type: "string",
            description: "The supplier's VAT registration number if visible on the receipt (e.g., GB123456789)."
        },
        vatBreakdown: {
            type: "object",
            properties: {
                subtotal: {
                    type: "number",
                    description: "The amount before VAT/tax was applied."
                },
                vatAmount: {
                    type: "number",
                    description: "The VAT/tax amount charged."
                },
                vatRate: {
                    type: "number",
                    description: "The VAT/tax rate as a percentage (e.g., 20 for 20%)."
                }
            },
            description: "Breakdown of VAT/tax information if visible on the receipt."
        },
        // We will add the timestamp in the processor, not extracted by AI.
    },
    required: ["vendorName", "transactionDate", "totalAmount", "category"]
};
