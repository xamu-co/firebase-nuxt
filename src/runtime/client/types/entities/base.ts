import type { DocumentReference, Timestamp } from "firebase/firestore";

import type { GetSharedRef } from "./user";
import type { SharedDocument } from "./instance";
import type { FirebaseData } from "../../../functions/types";

export interface FirebaseDocument {
	/** @automated Document path */
	id?: string;
	/** @automated Creation date */
	createdAt?: string | Date;
	/** @automated Last update date */
	updatedAt?: string | Date;
	/**
	 * Lock document & prevent deletion
	 * A boolean or an array of reference paths locking the document
	 *
	 * @automated
	 */
	lock?: boolean | string[];
}

/**
 * Clear refs from data
 *
 * Utility types return any, so avoid them like the plague
 */
export type FromData<Data extends FirebaseData, O extends keyof Data = never> = {
	[K in keyof Data as K extends O
		? never
		: K extends `${string}Ref` | `${string}Refs`
			? never
			: K]: K extends `${string}At` ? string | Date | undefined : Data[K];
};

export type GetRef<T extends SharedDocument, O extends keyof T = never> = GetSharedRef<T, O> & {
	createdAt?: Timestamp;
	updatedAt?: Timestamp;
	instanceRef?: DocumentReference;
};
