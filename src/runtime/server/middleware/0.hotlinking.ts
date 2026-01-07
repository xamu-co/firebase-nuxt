import { isError, defineEventHandler, setResponseHeaders, setResponseStatus } from "h3";

import { apiLogger } from "../utils/firebase";
import { getRootInstance } from "../utils/instance";

/**
 * Prevent hotlinking & clickjacking
 */
export default defineEventHandler(async (event) => {
	try {
		const root = await getRootInstance(event);

		// Prevent further navigation if root instance is missing
		if (!root?.url) return setResponseStatus(event, 500, "Missing root instance");

		const { hostname } = new URL(root.url);

		// Set Headers
		setResponseHeaders(event, {
			// Prevent clickjacking
			"X-Frame-Options": "SAMEORIGIN",
			// Legacy XSS protection
			"X-XSS-Protection": "1; mode=block",
			// Prevent MIME type sniffing
			"X-Content-Type-Options": "nosniff",
			// Prevent referrer leaks
			"Referrer-Policy": "strict-origin-when-cross-origin",
			// CSP Defaults, safe assets only
			"Content-Security-Policy":
				"default-src 'self'; " +
				"frame-src 'self' data: https:;" +
				"img-src 'self' data: https:; " +
				"script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
				"style-src 'self' 'unsafe-inline' https:; " +
				"font-src 'self' data: https:; " +
				"connect-src 'self' https:; " +
				// Allow root (self) & subdomains
				`frame-ancestors 'self' https://*.${hostname};`,
		});
	} catch (err) {
		if (isError(err)) {
			apiLogger(event, "api:middleware:hotlinking", err.message, err);

			// Prevent further navigation
			return setResponseStatus(event, err.statusCode, err.message);
		}

		throw err;
	}
});
