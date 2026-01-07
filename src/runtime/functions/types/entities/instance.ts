import type { DocumentReference } from "firebase-admin/firestore";

import type { FirebaseData } from "./base";
import type { LogData } from "./logs";
import type { UserData } from "./user";

/**
 * Document can be modified by any user
 *
 * This data is used to keep track of the changes
 */
export interface SharedData extends FirebaseData {
	createdByRef?: DocumentReference;
	updatedByRef?: DocumentReference;
	deletedByRef?: DocumentReference;
}

/**
 * Root instance
 * Stores data that is shared across all instances
 *
 * @collection instances
 */
export interface RootData extends InstanceData {
	config?: InstanceData["config"] & {
		/**
		 * IVA percentage
		 * Keep track of the IVA percentage
		 * @example 19
		 */
		iva?: number;
	};
	/** @example "Xamu" */
	poweredBy?: string;
}

/**
 * App instance
 *
 * @collection instances
 */
export interface InstanceData extends SharedData {
	// Location
	locationCity?: string;
	locationState?: string;
	locationCountry?: string;
	/**
	 * Canonical site url
	 *
	 * @example https://my-store.mydomain.com
	 * @automated
	 */
	url?: string;
	config?: {
		[key: string]: any;
		/**
		 * When tenants are enabled, domains are required
		 */
		domains?: string[];
	};
}

/**
 * Firebase log
 *
 * @collection instances/logs
 */
export interface InstanceLogData extends LogData, SharedData {}

/**
 * Instance member
 *
 * @collection instances/members
 */
export interface InstanceMemberData extends SharedData {
	userRef?: DocumentReference<UserData>;
	/** Could be non existent */
	rootMemberRef?: DocumentReference<InstanceMemberData>;
}
