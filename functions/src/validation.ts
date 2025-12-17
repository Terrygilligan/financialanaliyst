// functions/src/validation.ts

import { Category } from "./schema";

/**
 * Validation result structure
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * VAT number patterns for different countries.
 * Based on EU VAT number formats.
 */
const VAT_PATTERNS: Record<string, RegExp> = {
    // EU Countries
    AT: /^ATU\d{8}$/,              // Austria
    BE: /^BE0\d{9}$/,              // Belgium
    BG: /^BG\d{9,10}$/,            // Bulgaria
    CY: /^CY\d{8}[A-Z]$/,          // Cyprus
    CZ: /^CZ\d{8,10}$/,            // Czech Republic
    DE: /^DE\d{9}$/,               // Germany
    DK: /^DK\d{8}$/,               // Denmark
    EE: /^EE\d{9}$/,               // Estonia
    EL: /^EL\d{9}$/,               // Greece
    ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, // Spain
    FI: /^FI\d{8}$/,               // Finland
    FR: /^FR[A-Z0-9]{2}\d{9}$/,   // France
    GB: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/, // United Kingdom
    HR: /^HR\d{11}$/,              // Croatia
    HU: /^HU\d{8}$/,               // Hungary
    IE: /^IE\d[A-Z0-9]\d{5}[A-Z]$/, // Ireland
    IT: /^IT\d{11}$/,              // Italy
    LT: /^LT(\d{9}|\d{12})$/,     // Lithuania
    LU: /^LU\d{8}$/,               // Luxembourg
    LV: /^LV\d{11}$/,              // Latvia
    MT: /^MT\d{8}$/,               // Malta
    NL: /^NL\d{9}B\d{2}$/,        // Netherlands
    PL: /^PL\d{10}$/,              // Poland
    PT: /^PT\d{9}$/,               // Portugal
    RO: /^RO\d{2,10}$/,            // Romania
    SE: /^SE\d{12}$/,              // Sweden
    SI: /^SI\d{8}$/,               // Slovenia
    SK: /^SK\d{10}$/,              // Slovakia
    
    // Non-EU Countries
    CH: /^CHE\d{9}(MWST|TVA|IVA)$/, // Switzerland
    NO: /^NO\d{9}MVA$/,            // Norway
};

/**
 * Validate VAT number format.
 * 
 * Checks if the VAT number matches the expected format for the country.
 * Does NOT verify if the VAT number is registered (would require external API).
 * 
 * @param vatNumber - The VAT number to validate (e.g., "GB123456789", "DE123456789")
 * @returns Validation result with isValid flag and error messages
 */
export function validateVATNumber(vatNumber: string | null | undefined): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // VAT number is optional - if not provided, it's valid
    if (!vatNumber || vatNumber.trim() === '') {
        return result;
    }

    // Normalize: remove spaces, convert to uppercase
    const normalized = vatNumber.replace(/\s/g, '').toUpperCase();

    // Extract country code (first 2 characters)
    const countryCode = normalized.substring(0, 2);

    // Check if we have a pattern for this country
    if (!VAT_PATTERNS[countryCode]) {
        result.warnings.push(`VAT number format for country "${countryCode}" is not recognized. Manual verification recommended.`);
        return result;
    }

    // Validate against pattern
    const pattern = VAT_PATTERNS[countryCode];
    if (!pattern.test(normalized)) {
        result.isValid = false;
        result.errors.push(`Invalid VAT number format for ${countryCode}. Expected format: ${getVATFormatDescription(countryCode)}`);
    }

    return result;
}

/**
 * Get human-readable VAT format description for a country.
 * 
 * @param countryCode - Two-letter country code
 * @returns Format description
 */
function getVATFormatDescription(countryCode: string): string {
    const formats: Record<string, string> = {
        AT: 'ATU + 8 digits',
        BE: 'BE0 + 9 digits',
        BG: 'BG + 9-10 digits',
        CY: 'CY + 8 digits + 1 letter',
        CZ: 'CZ + 8-10 digits',
        DE: 'DE + 9 digits',
        DK: 'DK + 8 digits',
        EE: 'EE + 9 digits',
        EL: 'EL + 9 digits',
        ES: 'ES + letter/digit + 7 digits + letter/digit',
        FI: 'FI + 8 digits',
        FR: 'FR + 2 alphanumeric + 9 digits',
        GB: 'GB + 9 or 12 digits (or GD/HA + 3 digits)',
        HR: 'HR + 11 digits',
        HU: 'HU + 8 digits',
        IE: 'IE + digit + alphanumeric + 5 digits + letter',
        IT: 'IT + 11 digits',
        LT: 'LT + 9 or 12 digits',
        LU: 'LU + 8 digits',
        LV: 'LV + 11 digits',
        MT: 'MT + 8 digits',
        NL: 'NL + 9 digits + B + 2 digits',
        PL: 'PL + 10 digits',
        PT: 'PT + 9 digits',
        RO: 'RO + 2-10 digits',
        SE: 'SE + 12 digits',
        SI: 'SI + 8 digits',
        SK: 'SK + 10 digits',
        CH: 'CHE + 9 digits + MWST/TVA/IVA',
        NO: 'NO + 9 digits + MVA'
    };

    return formats[countryCode] || 'Unknown format';
}

/**
 * Validate category selection.
 * 
 * Ensures the category is one of the valid enum values.
 * 
 * @param category - The category to validate
 * @returns Validation result
 */
export function validateCategory(category: string | null | undefined): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Category is required
    if (!category || category.trim() === '') {
        result.isValid = false;
        result.errors.push('Category is required');
        return result;
    }

    // Check if category is valid
    const validCategories = Object.values(Category);
    if (!validCategories.includes(category as Category)) {
        result.isValid = false;
        result.errors.push(`Invalid category "${category}". Must be one of: ${validCategories.join(', ')}`);
    }

    return result;
}

/**
 * Validate total amount.
 * 
 * Ensures the amount is a valid number and within reasonable bounds.
 * 
 * @param amount - The amount to validate
 * @param allowZero - Whether to allow zero as a valid amount (default: true)
 * @returns Validation result
 */
export function validateAmount(amount: number | null | undefined, allowZero: boolean = true): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Amount is required
    if (amount == null) {
        result.isValid = false;
        result.errors.push('Amount is required');
        return result;
    }

    // Check if it's a valid number
    if (typeof amount !== 'number' || isNaN(amount)) {
        result.isValid = false;
        result.errors.push('Amount must be a valid number');
        return result;
    }

    // Check for negative amounts
    if (amount < 0) {
        result.isValid = false;
        result.errors.push('Amount cannot be negative');
        return result;
    }

    // Check for zero if not allowed
    if (!allowZero && amount === 0) {
        result.isValid = false;
        result.errors.push('Amount cannot be zero');
        return result;
    }

    // Warning for suspiciously large amounts (over 100,000)
    if (amount > 100000) {
        result.warnings.push(`Amount ${amount} is unusually large. Please verify.`);
    }

    return result;
}

/**
 * Validate vendor name.
 * 
 * Ensures vendor name is present and not too short/long.
 * 
 * @param vendorName - The vendor name to validate
 * @returns Validation result
 */
export function validateVendorName(vendorName: string | null | undefined): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Vendor name is required
    if (!vendorName || vendorName.trim() === '') {
        result.isValid = false;
        result.errors.push('Vendor name is required');
        return result;
    }

    const trimmed = vendorName.trim();

    // Check minimum length
    if (trimmed.length < 2) {
        result.isValid = false;
        result.errors.push('Vendor name must be at least 2 characters');
    }

    // Check maximum length
    if (trimmed.length > 100) {
        result.isValid = false;
        result.errors.push('Vendor name must not exceed 100 characters');
    }

    return result;
}

/**
 * Validate transaction date.
 * 
 * Ensures date is in correct format and within reasonable range.
 * 
 * @param dateString - The date string to validate (YYYY-MM-DD format)
 * @returns Validation result
 */
export function validateTransactionDate(dateString: string | null | undefined): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Date is required
    if (!dateString || dateString.trim() === '') {
        result.isValid = false;
        result.errors.push('Transaction date is required');
        return result;
    }

    // Check format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        result.isValid = false;
        result.errors.push('Transaction date must be in YYYY-MM-DD format');
        return result;
    }

    // Parse and validate as actual date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        result.isValid = false;
        result.errors.push('Transaction date is not a valid date');
        return result;
    }

    // Check if date is in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (date > today) {
        result.warnings.push('Transaction date is in the future. Please verify.');
    }

    // Check if date is too old (more than 10 years ago)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (date < tenYearsAgo) {
        result.warnings.push(`Transaction date is more than 10 years old (${dateString}). Please verify.`);
    }

    return result;
}

/**
 * Validate complete receipt data.
 * 
 * Performs comprehensive validation of all receipt fields.
 * 
 * @param receiptData - The receipt data to validate
 * @returns Combined validation result
 */
export function validateReceiptData(receiptData: {
    vendorName?: string;
    transactionDate?: string;
    totalAmount?: number;
    category?: string;
    vatNumber?: string;
}): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Validate each field
    const vendorValidation = validateVendorName(receiptData.vendorName);
    const dateValidation = validateTransactionDate(receiptData.transactionDate);
    const amountValidation = validateAmount(receiptData.totalAmount, true); // Allow zero
    const categoryValidation = validateCategory(receiptData.category);
    const vatValidation = validateVATNumber(receiptData.vatNumber);

    // Combine results
    const validations = [vendorValidation, dateValidation, amountValidation, categoryValidation, vatValidation];

    for (const validation of validations) {
        if (!validation.isValid) {
            result.isValid = false;
        }
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
    }

    return result;
}

