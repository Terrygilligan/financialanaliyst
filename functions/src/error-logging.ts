// functions/src/error-logging.ts

import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

/**
 * Error log entry structure
 */
export interface ErrorLogEntry {
    timestamp: string;
    severity: ErrorSeverity;
    functionName: string;
    errorMessage: string;
    errorStack?: string;
    userId?: string;
    receiptId?: string;
    fileName?: string;
    context?: Record<string, any>;
}

/**
 * Log an error to the Firestore /error_logs collection.
 * 
 * This function provides centralized error logging for audit trail and debugging.
 * 
 * @param entry - The error log entry to store
 * @returns Promise<void>
 */
export async function logError(entry: ErrorLogEntry): Promise<void> {
    try {
        // Add server timestamp
        const logEntry = {
            ...entry,
            serverTimestamp: new Date().toISOString()
        };

        // Store in /error_logs collection
        await db.collection('error_logs').add(logEntry);

        // Also log to console for Cloud Functions logs
        const logLevel = entry.severity === ErrorSeverity.CRITICAL || entry.severity === ErrorSeverity.ERROR
            ? 'error'
            : entry.severity === ErrorSeverity.WARNING
            ? 'warn'
            : 'log';

        console[logLevel](
            `[${entry.severity.toUpperCase()}] ${entry.functionName}: ${entry.errorMessage}`,
            entry.context || {}
        );
    } catch (loggingError) {
        // If logging fails, at least log to console
        console.error('Failed to write error log to Firestore:', loggingError);
        console.error('Original error:', entry);
    }
}

/**
 * Log an info message (for audit trail).
 * 
 * @param functionName - Name of the function
 * @param message - Info message
 * @param context - Additional context
 */
export async function logInfo(
    functionName: string,
    message: string,
    context?: Record<string, any>
): Promise<void> {
    await logError({
        timestamp: new Date().toISOString(),
        severity: ErrorSeverity.INFO,
        functionName,
        errorMessage: message,
        context
    });
}

/**
 * Log a warning message.
 * 
 * @param functionName - Name of the function
 * @param message - Warning message
 * @param context - Additional context
 */
export async function logWarning(
    functionName: string,
    message: string,
    context?: Record<string, any>
): Promise<void> {
    await logError({
        timestamp: new Date().toISOString(),
        severity: ErrorSeverity.WARNING,
        functionName,
        errorMessage: message,
        context
    });
}

/**
 * Log an error with full details.
 * 
 * @param functionName - Name of the function
 * @param error - The error object
 * @param context - Additional context
 */
export async function logErrorWithDetails(
    functionName: string,
    error: Error,
    context?: Record<string, any>
): Promise<void> {
    await logError({
        timestamp: new Date().toISOString(),
        severity: ErrorSeverity.ERROR,
        functionName,
        errorMessage: error.message,
        errorStack: error.stack,
        context
    });
}

/**
 * Log a critical error (requires immediate attention).
 * 
 * @param functionName - Name of the function
 * @param error - The error object
 * @param context - Additional context
 */
export async function logCritical(
    functionName: string,
    error: Error,
    context?: Record<string, any>
): Promise<void> {
    await logError({
        timestamp: new Date().toISOString(),
        severity: ErrorSeverity.CRITICAL,
        functionName,
        errorMessage: error.message,
        errorStack: error.stack,
        context
    });
}

/**
 * Query error logs with filters.
 * 
 * @param filters - Query filters
 * @returns Array of error log entries
 */
export async function queryErrorLogs(filters: {
    severity?: ErrorSeverity;
    functionName?: string;
    userId?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
}): Promise<ErrorLogEntry[]> {
    try {
        // Bug Fix: Apply all .where() clauses BEFORE .orderBy() to avoid requiring composite indexes
        let query = db.collection('error_logs') as any;

        // Apply all filters first
        if (filters.severity) {
            query = query.where('severity', '==', filters.severity);
        }

        if (filters.functionName) {
            query = query.where('functionName', '==', filters.functionName);
        }

        if (filters.userId) {
            query = query.where('userId', '==', filters.userId);
        }

        if (filters.startDate) {
            query = query.where('serverTimestamp', '>=', filters.startDate.toISOString());
        }

        if (filters.endDate) {
            query = query.where('serverTimestamp', '<=', filters.endDate.toISOString());
        }

        // Apply ordering AFTER all filters
        query = query.orderBy('serverTimestamp', 'desc');

        // Apply limit last
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const snapshot = await query.get();
        const logs: ErrorLogEntry[] = [];

        snapshot.forEach((doc: any) => {
            logs.push(doc.data() as ErrorLogEntry);
        });

        return logs;
    } catch (error) {
        console.error('Failed to query error logs:', error);
        return [];
    }
}

