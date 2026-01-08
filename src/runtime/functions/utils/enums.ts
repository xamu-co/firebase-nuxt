export enum eIdDocumentType {
	/** Cédula de ciudadanía */
	CC = "CC",
	/** Cédula de extranjería */
	CE = "CE",
	/** Pasaporte */
	PA = "PA",
	/** Tarjeta de identidad */
	TI = "TI",
	/** Numero de identificación tributario */
	NIT = "NIT",
}

/**
 * Purchase validation source
 */
export enum ePaymentValidator {
	/** Gateway did its job */
	WEBHOOK = "WEBHOOK",
	/** Timeout elapsep */
	TIMEOUT_TASK = "TIMEOUT_TASK",
	/** User returned from gateway */
	TURNBACK = "TURNBACK",
	/** Admin handled the charge */
	ADMIN = "ADMIN",
}

/**
 * Cache control
 */
export enum eCacheControl {
	NONE = "no-cache, no-store, must-revalidate",
	/** Cache for a few minutes */
	FREQUENT = "public, max-age=120, stale-while-revalidate=60",
	/** Cache for an hour */
	NORMAL = "public, max-age=3600, must-revalidate",
	/** Cache for a month */
	MIDTERM = "public, max-age=2592000, must-revalidate",
	/** Cache for a year */
	LONGTERM = "public, max-age=31536000, must-revalidate",
}

export {};
