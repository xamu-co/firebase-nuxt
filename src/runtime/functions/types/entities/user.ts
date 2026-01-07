import type { eIdDocumentType } from "../../enums";
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
	// id
	name?: string | null;
	email?: string | null;
	documentNumber?: string;
	documentType?: eIdDocumentType;
	// location
	locationCity?: string;
	locationState?: string;
	locationCountry?: string;
	zip?: string;
	address?: string;
	// contact
	cellphoneNumber?: string;
	cellphoneIndicative?: `${string}+${number}`;
}
