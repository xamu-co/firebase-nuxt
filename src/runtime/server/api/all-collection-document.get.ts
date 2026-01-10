import type { CollectionReference } from "firebase-admin/firestore";
import { createError, getRouterParam, isError, setResponseStatus } from "h3";

import { defineConditionallyCachedEventHandler } from "../utils/cache";
import { debugFirebaseServer, resolveServerDocumentRefs } from "../utils/firestore";
import { apiLogger, getServerFirebase } from "../utils/firebase";

// @ts-expect-error virtual file
import { readCollection, readInstanceCollection } from "#internal/firebase-nuxt";

/**
 * Get a document from a given collection
 *
 * @auth guest
 */
export default defineConditionallyCachedEventHandler(
	async (event) => {
		const { firebaseFirestore } = getServerFirebase("api:all:[collectionId]:[documentId]");
		const { currentInstanceRef } = event.context;

		try {
			const collectionId = getRouterParam(event, "collectionId");
			const documentId = getRouterParam(event, "documentId");

			debugFirebaseServer(
				event,
				"api:all:[collectionId]:[documentId]",
				collectionId,
				documentId
			);

			if (!collectionId || !documentId) {
				throw createError({
					statusCode: 400,
					statusMessage: `collectionId & documentId are required`,
				});
			}

			let collectionRef: CollectionReference = firebaseFirestore.collection(collectionId);

			// Prevent getting unauthorized collections documents
			if (event.path.startsWith("/api/instance/all")) {
				// Instance is required
				if (!currentInstanceRef) {
					throw createError({ statusCode: 401, statusMessage: "Missing instance" });
				} else if (!readInstanceCollection(collectionId, event.context)) {
					throw createError({
						statusCode: 401,
						statusMessage: `Can't get "instance/${collectionId}" document`,
					});
				}

				collectionRef = currentInstanceRef.collection(collectionId);
			} else if (!readCollection(collectionId, event.context)) {
				throw createError({
					statusCode: 401,
					statusMessage: `Can't get "${collectionId}" document`,
				});
			}

			const documentsRef = collectionRef.doc(documentId);
			const documentSnapshot = await documentsRef.get();

			return resolveServerDocumentRefs(event, documentSnapshot, collectionId);
		} catch (err) {
			// Bypass nuxt errors
			if (isError(err)) {
				apiLogger(event, "api:all:[collectionId]:[documentId]", err.message, err);

				return setResponseStatus(event, err.statusCode || 500, err.statusMessage);
			}

			throw err;
		}
	},
	{
		instanceOnly: false,
	}
);
