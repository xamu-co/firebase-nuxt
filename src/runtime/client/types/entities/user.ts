import type { DocumentReference, FieldValue } from "firebase/firestore";

import type { UserData } from "../../../functions/types";
import type { FromData } from "./base";
import type { Instance, SharedDocument } from "./instance";

/**
 * Remove FirebaseDocument properties to make valid Ref
 *
 * Ref are used to create and modify firebase document
 * Removed properties are not required or are part of automation
 */
export type GetSharedRef<T extends SharedDocument, O extends keyof T = never> = {
	[K in keyof FromData<Omit<T, "id" | O>> as K extends `${string}At` ? never : K]: FromData<
		Omit<T, "id" | O>
	>[K];
} & {
	createdByRef?: DocumentReference | FieldValue;
	updatedByRef?: DocumentReference | FieldValue;
	deletedByRef?: DocumentReference | FieldValue;
};

/**
 * Firebase user
 */
export interface User extends SharedDocument, FromData<UserData> {
	instances?: Instance[];
}
/** This one goes to the database */
export interface UserRef extends GetSharedRef<User, "instances"> {
	instancesRefs?: DocumentReference[] | FieldValue;
}
