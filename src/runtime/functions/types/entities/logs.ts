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
