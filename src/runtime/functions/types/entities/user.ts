import type { SharedData } from "./instance";

/**
 * Firebase user
 *
 * @collection
 */
export interface UserData extends SharedData {
	uid?: string;
	photoURL?: string | null;
	isAnonymous?: boolean | null;
	name?: string | null;
	email?: string | null;
}
