import {
	DocumentReference,
	addDoc,
	collection,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	onSnapshot,
	arrayUnion,
	CollectionReference,
	type UpdateData,
} from "firebase/firestore";
import set from "lodash-es/set";

import type { iNodeFnResponseStream } from "@open-xamu-co/ui-common-types";

import type {
	UserRef,
	GetRef,
	SharedDocument,
	FirebaseDocument,
	iSnapshotConfig,
	FromData,
} from "../../client/types";
import { getDocumentId } from "../../client/utils/resolver";
import { TimedPromise } from "../../server/utils/guards";

import { useAppLogger, useInstanceStore, useNuxtApp, useSessionStore } from "#imports";

interface iUseDocumentOptions extends iSnapshotConfig {
	omitLoggings?: boolean;
}

/** Creates document with the given values */
export async function useDocumentCreate<
	Vgr extends GetRef<SharedDocument>,
	V extends FromData<Vgr> = FromData<Vgr>,
>(
	collectionPath: string,
	partialRef: Vgr,
	createdCallback?: (ref: DocumentReference<Vgr, V>) => Promise<void> | void,
	{ omitLoggings, ...config }: iUseDocumentOptions = { omitLoggings: false, level: 0 }
): Promise<iNodeFnResponseStream<V>> {
	const SESSION = useSessionStore();
	const INSTANCE = useInstanceStore();
	const { $clientFirestore, $resolveClientRefs } = useNuxtApp();

	if (!collectionPath || !$clientFirestore) throw new Error("Collection path is required");

	// Instance is also required
	if (!INSTANCE) throw new Error("Missing instance");

	const collRef = <CollectionReference<Vgr, V>>collection($clientFirestore, collectionPath); // get collection ref

	// Conditionally inject instance information
	if (collectionPath === "users") {
		const instanceRef = doc($clientFirestore, INSTANCE.id);

		(partialRef as Partial<UserRef>).instancesRefs = arrayUnion(instanceRef);
	}

	// Conditionally inject member information
	if (SESSION.token) {
		const memberId = getDocumentId(SESSION.path);
		const memberPath = `${INSTANCE.id}/members/${memberId}`;
		const createdByRef = memberId ? doc($clientFirestore, memberPath) : undefined;

		partialRef.createdByRef = partialRef.updatedByRef = createdByRef;
	}

	delete partialRef.createdAt;
	delete partialRef.updatedAt;

	let createdRef: DocumentReference<Vgr, V> | undefined;

	try {
		if (partialRef.id) {
			createdRef = doc(collRef, getDocumentId(partialRef.id));

			// Set document
			await setDoc(createdRef, partialRef, { merge: true });
		} else createdRef = await addDoc(collRef, partialRef);

		// Perform additional actions with the new document, do not await
		Promise.resolve(createdCallback?.(createdRef)).catch((err) => {
			// Log unhandled error
			useAppLogger("composables:useDocumentCreate:callback", err);
		});

		const createdAt = new Date();
		/** Get emulated data */
		const data = await $resolveClientRefs?.<Vgr, V>(
			{
				data: () => ({
					...partialRef,
					id: createdRef?.path,
					createdAt,
					updatedAt: createdAt,
				}),
				exists: true,
				ref: createdRef,
			},
			config
		);

		// Immediate data, hydration
		return [
			[
				data || false,
				// Wait for cloud function snapshot
				TimedPromise<V | false>(
					(resolve, reject) => {
						if (!createdRef) return reject("No document created");

						const unsub = onSnapshot(
							createdRef,
							async (snapshot) => {
								// Cloud function should inject timestamps
								if (!snapshot.exists()) {
									unsub();
									reject("Document was deleted after creation");
								} else if (!snapshot.data()?.createdAt) return;

								const finalData = await $resolveClientRefs?.<Vgr, V>(
									snapshot,
									config
								);

								unsub();
								resolve(finalData || false);
							},
							reject
						);
					},
					{ fallback: false }
				),
			],
		];
	} catch (err) {
		if (!omitLoggings) {
			console.error("Error creating document", { createdRef, partialRef }, err);
			useAppLogger("composables:useDocumentCreate", err);
		}

		return [false];
	}
}

/**
 * Updates a given document in Firestore.
 *
 * @param node - The existing document to update.
 * @param partialRef - The partial data to update the document with.
 * @returns A boolean promise.
 */
export async function useDocumentUpdate<
	Vgr extends GetRef<SharedDocument>,
	V extends FromData<Vgr> = FromData<Vgr>,
>(
	node: SharedDocument,
	middleRef: Partial<Vgr> = {},
	{ omitLoggings, ...config }: iUseDocumentOptions = { omitLoggings: false, level: 0 }
): Promise<iNodeFnResponseStream<V>> {
	const SESSION = useSessionStore();
	const INSTANCE = useInstanceStore();
	const { $clientFirestore, $resolveClientRefs } = useNuxtApp();

	if (!node.id || !$clientFirestore) throw new Error("Document id is required");

	// Instance is also required
	if (!INSTANCE) throw new Error("Missing instance");

	const docRef = <DocumentReference<Vgr, V>>doc($clientFirestore, node.id || ""); // get node ref
	const partialRef = <Vgr>middleRef;
	const lastUpdatedAt = node.updatedAt ? new Date(node.updatedAt).getTime() : 0;

	// Conditionally inject member information
	if (SESSION.token) {
		const memberId = getDocumentId(SESSION.path);
		const memberPath = `${INSTANCE.id}/members/${memberId}`;
		const updatedByRef = memberId ? doc($clientFirestore, memberPath) : undefined;

		partialRef.updatedByRef = updatedByRef;
	}

	delete partialRef.createdAt;
	delete partialRef.updatedAt;

	try {
		// Allow updating nested properties
		// See: https://firebase.google.com/docs/firestore/manage-data/add-data#update_fields_in_nested_objects
		await updateDoc(docRef, partialRef as UpdateData<V>);

		const updatedAt = new Date();
		/** Get emulated data */
		const data = await $resolveClientRefs?.<Vgr, V>(
			{
				data: () => {
					const newData = { ...partialRef, id: docRef?.path, updatedAt };

					/**
					 * Relocates dot notation
					 * See: https://firebase.google.com/docs/firestore/manage-data/add-data#update_fields_in_nested_objects
					 */
					for (const k in newData) {
						if (!Object.hasOwn(newData, k) || !k.includes(".")) continue;

						// Assign value to right location
						set(newData, k, newData[k as keyof typeof newData]);
						// Remove dot notation property
						delete newData[k as keyof typeof newData];
					}

					return newData;
				},
				exists: true,
				ref: docRef,
			},
			config
		);

		// Immediate data, hydration
		return [
			[
				data || false,
				// Wait for cloud function snapshot
				TimedPromise<V | false>(
					(resolve, reject) => {
						const unsub = onSnapshot(
							docRef,
							async (snapshot) => {
								const updatedAt = snapshot.data()?.updatedAt?.toMillis() ?? 0;

								// Cloud function should update timestamps
								if (lastUpdatedAt >= updatedAt) return;

								const finalData = await $resolveClientRefs?.<Vgr, V>(
									snapshot,
									config
								);

								unsub();
								resolve(finalData || false);
							},
							reject
						);
					},
					{ fallback: false }
				),
			],
		];
	} catch (err) {
		// Most likely a timeout
		if (!omitLoggings) {
			console.error("Error updating document", { docRef, partialRef }, err);
			useAppLogger("composables:useDocumentUpdate", err);
		}

		return [false];
	}
}

/** Clones given document */
export async function useDocumentClone<
	Vgr extends GetRef<SharedDocument>,
	V extends FromData<Vgr> = FromData<Vgr>,
>(
	node: SharedDocument,
	middleRef: Partial<Vgr> = {},
	{ omitLoggings, ...config }: iUseDocumentOptions = { omitLoggings: false, level: 0 }
): Promise<iNodeFnResponseStream<V>> {
	const SESSION = useSessionStore();
	const INSTANCE = useInstanceStore();
	const { $clientFirestore, $resolveClientRefs } = useNuxtApp();

	if (!node.id || !$clientFirestore) throw new Error("Document id is required");

	// Instance is also required
	if (!INSTANCE) throw new Error("Missing instance");

	const docRef = <DocumentReference<Vgr, V>>doc($clientFirestore, node.id);
	const partialRef = <Vgr>middleRef;
	const source = (await getDoc(docRef)).data();

	if (!source) return [false];

	// Conditionally inject member information
	if (SESSION.token) {
		const memberId = getDocumentId(SESSION.path);
		const memberPath = `${INSTANCE.id}/members/${memberId}`;
		const clonedByRef = memberId ? doc($clientFirestore, memberPath) : undefined;

		partialRef.createdByRef = partialRef.updatedByRef = clonedByRef;
	}

	delete source.id;
	delete source.createdAt;
	delete source.updatedAt;
	delete source.lock;
	delete partialRef.createdAt;
	delete partialRef.updatedAt;

	const collRef = docRef.parent;
	let clonedDoc: DocumentReference<Vgr, V> | undefined;

	try {
		clonedDoc = await addDoc(collRef, {
			...source,
			...partialRef,
		});

		const createdAt = new Date();
		/** Get emulated data */
		const data = await $resolveClientRefs?.<Vgr, V>(
			{
				data: () => ({
					...partialRef,
					id: clonedDoc?.path,
					createdAt,
					updatedAt: createdAt,
				}),
				exists: true,
				ref: clonedDoc,
			},
			config
		);

		// Immediate data, hydration
		return [
			[
				data || false,
				// Wait for cloud function snapshot
				TimedPromise<V | false>(
					(resolve, reject) => {
						if (!clonedDoc) return reject("No document cloned");

						const unsub = onSnapshot(
							clonedDoc,
							async (snapshot) => {
								// Cloud function should inject timestamps
								if (!snapshot.data()?.createdAt) return;

								const finalData = await $resolveClientRefs?.<Vgr, V>(
									snapshot,
									config
								);

								unsub();
								resolve(finalData || false);
							},
							reject
						);
					},
					{ fallback: false }
				),
			],
		];
	} catch (err) {
		// Most likely a timeout
		if (!omitLoggings) {
			console.error("Error cloning document", { clonedDoc, partialRef }, err);
			useAppLogger("composables:useDocumentClone", err);
		}

		return [false];
	}
}

/** Deletes given document */
export async function useDocumentDelete<T extends FirebaseDocument = FirebaseDocument>(
	node: SharedDocument,
	{ omitLoggings }: iUseDocumentOptions = { omitLoggings: false, level: 0 }
): Promise<iNodeFnResponseStream<T>> {
	const SESSION = useSessionStore();
	const INSTANCE = useInstanceStore();
	const { $clientFirestore } = useNuxtApp();

	if (!node.id || !$clientFirestore) throw new Error("Document id is required");

	// Instance is also required
	if (!INSTANCE) throw new Error("Missing instance");

	const docRef = doc($clientFirestore, node.id);
	const memberId = getDocumentId(SESSION.path);
	const memberPath = `${INSTANCE.id}/members/${memberId}`;
	const deletedByRef = memberId ? doc($clientFirestore, memberPath) : undefined;

	// Prevent deletion if document is locked
	if (node.lock) return [false];

	try {
		// Set deletion author, cloud function will handle deletion
		await setDoc(docRef, { deletedByRef, updatedByRef: deletedByRef }, { merge: true });

		// Immediate data, hydration
		return [
			[
				// Assume deleted
				true,
				// Wait for cloud function snapshot
				TimedPromise<boolean>(
					(resolve, reject) => {
						const unsub = onSnapshot(
							docRef,
							async (snapshot) => {
								// Cloud function should delete
								if (snapshot.exists()) return;

								unsub();
								resolve(true);
							},
							reject
						);

						// 10 seconds timeout, document is possibly locked & won't be deleted
						setTimeout(() => {
							unsub();
							resolve(false);
						}, 10000);
					},
					{ fallback: false }
				),
			],
		];
	} catch (err) {
		// Most likely a timeout
		if (!omitLoggings) {
			console.error("Error deleting document", { docRef }, err);
			useAppLogger("composables:useDocumentDelete", err);
		}

		return [false];
	}
}
