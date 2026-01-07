import type { iPagination, tLogger } from "@open-xamu-co/ui-common-types";

import type { FirebaseDocument, FromData } from "./entities/base";

export interface PseudoNode extends Record<string, any> {
	[key: `${string}Ref`]: Record<string, any>;
	[key: `${string}Refs`]: Record<string, any>[];
}

export interface PseudoDocumentSnapshot<
	T extends PseudoNode,
	R extends FirebaseDocument = FromData<T>,
> extends Record<string, any> {
	data(): T | undefined;
	exists: boolean | (() => this is PseudoDocumentSnapshot<T, R>);
}

export interface PseudoDocumentReference<
	T extends PseudoNode,
	R extends FirebaseDocument = FromData<T>,
> extends Record<string, any> {
	get: () => Promise<PseudoDocumentSnapshot<T, R>>;
	// The following list is here just to appease getDoc on client
	converter: any;
	type: any;
	firestore: any;
	id: any;
	parent: any;
	path: any;
	withConverter: any;
	toJSON: any;
}

export interface iSnapshotConfig {
	/**
	 * Refs level
	 *
	 * @default 0 - All refs will be omited
	 */
	level?: number;
	/**
	 * Omit these properties
	 *
	 * to omit "productRef"
	 * @example { omit: [ "product"]}
	 */
	omit?: string[];
	logger?: tLogger;
}
export interface iUseEdges extends iPagination, iSnapshotConfig {
	/**
	 * Get these specific documents from collection.
	 *
	 * @example "nodeUid" and "collectionId/nodeUid" are valid id structures
	 *
	 * According to firebase docs, queries are limited to 30 disjuntion operations
	 * @see https://firebase.google.com/docs/firestore/query-data/queries#limits_on_or_queries
	 */
	include?: boolean | string[];
}
export interface iUsePage extends iUseEdges {
	/**
	 * Bypass limitations
	 */
	visible?: boolean;
	page?: boolean;
}
