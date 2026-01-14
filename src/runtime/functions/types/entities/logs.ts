import type { DocumentReference } from "firebase-admin/firestore";

import type { FirebaseData } from "./base";

/** General log entity */
export interface LogData extends FirebaseData {
	at?: string;
	code?: string;
	message?: string;
	error?: string;
	/** Additional log tracking metadata */
	metadata?: any;
	/**
	 * Internal logs, omit some automation
	 * @automated
	 */
	internal?: boolean;
}

/**
 * Offender entity
 *
 * Keep track of abbussive requests
 */
export interface OffenderData extends FirebaseData {
	/** IP address */
	ip?: string;
	/** ISO country codes */
	countries?: string[];
	/** User agents */
	userAgents?: string[];
	/** Preferred languages */
	languages?: string[];
	/**
	 * Number of hits
	 * @automated
	 */
	hits?: number;
	/**
	 * Log reference
	 * @automated
	 */
	lastLogRef?: DocumentReference<LogData>;
}
