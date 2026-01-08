import type { DocumentReference, FieldValue } from "firebase/firestore";

import type {
	InstanceMemberData,
	InstanceLogData,
	InstanceData,
	RootData,
} from "../../../functions/types";
import type { FirebaseDocument, FromData, GetRef } from "./base";
import type { GetSharedRef, User, UserRef } from "./user";

/**
 * Document can be modified by any user
 *
 * This data is used to keep track of the changes
 */
export interface SharedDocument extends FirebaseDocument {
	createdBy?: FirebaseDocument;
	updatedBy?: FirebaseDocument;
	deletedBy?: FirebaseDocument;
}

/** @output Root instance*/
export interface Root extends SharedDocument, FromData<RootData> {}
/** @input Omit automation */
export interface RootRef extends GetSharedRef<Root> {}

/** @output App instance */
export interface Instance extends SharedDocument, FromData<InstanceData> {}
/** @input Omit automation */
export interface InstanceRef extends GetSharedRef<Instance> {}

/** @output Firebase log */
export interface InstanceLog extends SharedDocument, FromData<InstanceLogData> {}
/** @input Omit automation */
export interface InstanceLogRef extends GetSharedRef<InstanceLog> {}

/** @output Instance member */
export interface InstanceMember extends SharedDocument, FromData<InstanceMemberData> {
	user?: User;
	rootMember?: InstanceMember;
}
/** @input Omit automation */
export interface InstanceMemberRef extends GetRef<InstanceMember> {
	userRef?: DocumentReference<User, UserRef> | FieldValue;
	rootMemberRef?: DocumentReference<InstanceMember, InstanceMemberRef> | FieldValue;
}
