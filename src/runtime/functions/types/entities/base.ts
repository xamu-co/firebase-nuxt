import type { FieldValue, Timestamp } from "firebase-admin/firestore";

import type { ePaymentValidator } from "../../enums";

export type FirebaseValues<T extends FirebaseData> = { [K in keyof T]?: T[K] | FieldValue };

/**
 * Extended firebase DocumentData
 *
 * @abstract
 */
export interface FirebaseData extends Record<string, any> {
	/** @automated Creation date */
	createdAt?: Timestamp;
	/** @automated Last update date */
	updatedAt?: Timestamp;
	/**
	 * Lock document & prevent deletion
	 * A boolean or an array of reference paths locking the document
	 *
	 * @automated
	 */
	lock?: boolean | string[];
}

/**
 * Price data
 *
 * @abstract
 */
export interface PriceData {
	/** Full price */
	price?: number;
	/** base price (no iva) */
	base?: number;
	/** Iva price */
	iva?: number;
	/** @automated unique item ref */
	reference?: string;
}

/**
 * Payment data
 *
 * @abstract
 */
export interface PaymentData extends PriceData {
	/** @automated Integrity hash */
	integrity?: string;
	/** @automated Payment validation source */
	validator?: ePaymentValidator;
	/**
	 * Client has paid
	 * @automated Payment date
	 */
	paidAt?: false | Timestamp;
	observations?: string;
	oldObservations?: string;
}
