// functions/src/currency.ts

import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Exchange rate cache entry
 */
interface ExchangeRateCache {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    cachedAt: string;
    expiresAt: string;
}

/**
 * Currency conversion result
 */
export interface CurrencyConversionResult {
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    baseCurrency: string;
    exchangeRate: number;
    conversionDate: string;
}

/**
 * Convert amount from one currency to another using cached or fetched exchange rates.
 * 
 * Uses a free exchange rate API (Frankfurter) with 24-hour caching in Firestore.
 * Falls back gracefully if conversion fails.
 * 
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code (e.g., 'USD')
 * @param toCurrency - Target currency code (e.g., 'GBP')
 * @returns Conversion result or null if conversion fails
 */
export async function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
): Promise<CurrencyConversionResult | null> {
    try {
        // Normalize currency codes to uppercase
        const from = fromCurrency.toUpperCase();
        const to = toCurrency.toUpperCase();

        // If currencies are the same, no conversion needed
        if (from === to) {
            return {
                originalAmount: amount,
                originalCurrency: from,
                convertedAmount: amount,
                baseCurrency: to,
                exchangeRate: 1.0,
                conversionDate: new Date().toISOString()
            };
        }

        // Check cache first
        const cachedRate = await getCachedExchangeRate(from, to);
        if (cachedRate) {
            console.log(`Using cached exchange rate: 1 ${from} = ${cachedRate} ${to}`);
            return {
                originalAmount: amount,
                originalCurrency: from,
                convertedAmount: amount * cachedRate,
                baseCurrency: to,
                exchangeRate: cachedRate,
                conversionDate: new Date().toISOString()
            };
        }

        // Fetch fresh rate from API
        const rate = await fetchExchangeRate(from, to);
        if (rate) {
            // Cache the rate for 24 hours
            await cacheExchangeRate(from, to, rate);
            
            console.log(`Fetched and cached exchange rate: 1 ${from} = ${rate} ${to}`);
            return {
                originalAmount: amount,
                originalCurrency: from,
                convertedAmount: amount * rate,
                baseCurrency: to,
                exchangeRate: rate,
                conversionDate: new Date().toISOString()
            };
        }

        // If all else fails, return null
        console.error(`Failed to convert ${from} to ${to}`);
        return null;
    } catch (error) {
        console.error(`Error during currency conversion:`, error);
        return null;
    }
}

/**
 * Get cached exchange rate from Firestore if still valid (not expired).
 * 
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate or null if not cached or expired
 */
async function getCachedExchangeRate(
    fromCurrency: string,
    toCurrency: string
): Promise<number | null> {
    try {
        const cacheId = `${fromCurrency}_${toCurrency}`;
        const cacheDoc = await db.collection('fx_cache').doc(cacheId).get();

        if (!cacheDoc.exists) {
            return null;
        }

        const cache = cacheDoc.data() as ExchangeRateCache;
        const expiresAt = new Date(cache.expiresAt);
        const now = new Date();

        // Check if cache has expired
        if (now > expiresAt) {
            console.log(`Cache expired for ${fromCurrency} -> ${toCurrency}`);
            // Clean up expired cache
            await cacheDoc.ref.delete();
            return null;
        }

        return cache.rate;
    } catch (error) {
        console.error(`Error fetching cached exchange rate:`, error);
        return null;
    }
}

/**
 * Cache exchange rate in Firestore with 24-hour expiry.
 * 
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rate - Exchange rate
 */
async function cacheExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number
): Promise<void> {
    try {
        const cacheId = `${fromCurrency}_${toCurrency}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        const cacheEntry: ExchangeRateCache = {
            fromCurrency,
            toCurrency,
            rate,
            cachedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString()
        };

        await db.collection('fx_cache').doc(cacheId).set(cacheEntry);
        console.log(`Cached exchange rate: ${cacheId} = ${rate}`);
    } catch (error) {
        console.error(`Error caching exchange rate:`, error);
        // Non-critical error, don't throw
    }
}

/**
 * Fetch exchange rate from Frankfurter API (free, no API key required).
 * 
 * API: https://www.frankfurter.app/
 * Documentation: https://www.frankfurter.app/docs/
 * 
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate or null if fetch fails
 */
async function fetchExchangeRate(
    fromCurrency: string,
    toCurrency: string
): Promise<number | null> {
    try {
        const url = `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`Frankfurter API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        
        // Response format: { amount: 1, base: "USD", date: "2024-01-01", rates: { "GBP": 0.79 } }
        const rate = data.rates?.[toCurrency];
        
        if (typeof rate !== 'number') {
            console.error(`Invalid rate received from Frankfurter API:`, data);
            return null;
        }

        return rate;
    } catch (error) {
        console.error(`Error fetching exchange rate from Frankfurter API:`, error);
        return null;
    }
}

/**
 * Get base currency from environment variable.
 * Defaults to 'GBP' if not set.
 * 
 * @returns Base currency code
 */
export function getBaseCurrency(): string {
    return process.env.BASE_CURRENCY || 'GBP';
}

/**
 * Convert receipt amount to base currency if needed.
 * 
 * @param amount - Receipt amount
 * @param currency - Receipt currency (optional, defaults to base currency)
 * @returns Conversion result with both original and converted amounts
 */
export async function convertReceiptToBaseCurrency(
    amount: number,
    currency?: string
): Promise<CurrencyConversionResult | null> {
    const baseCurrency = getBaseCurrency();
    const receiptCurrency = currency ? currency.toUpperCase() : baseCurrency;

    // If no currency specified or same as base, no conversion needed
    if (!currency || receiptCurrency === baseCurrency) {
        return {
            originalAmount: amount,
            originalCurrency: baseCurrency,
            convertedAmount: amount,
            baseCurrency: baseCurrency,
            exchangeRate: 1.0,
            conversionDate: new Date().toISOString()
        };
    }

    // Perform conversion
    return await convertCurrency(amount, receiptCurrency, baseCurrency);
}

