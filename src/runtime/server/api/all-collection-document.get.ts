import { createError, getRouterParam, isError, setResponseStatus } from "h3";

import { defineConditionallyCachedEventHandler } from "../utils/cache";
import { debugFirebaseServer, resolveServerDocumentRefs } from "../utils/firestore";
import { apiLogger, getServerFirebase } from "../utils/firebase";

// @ts-expect-error virtual file
import { readCollection } from "#internal/firebase-nuxt";

/**
 * Get a document from a given collection
 *
 * @auth guest
 */
export default defineConditionallyCachedEventHandler(
	async (event) => {
		const { firebaseFirestore } = getServerFirebase("api:all:collection:documentId");

		try {
			const collectionId = getRouterParam(event, "collectionId");
			const documentId = getRouterParam(event, "documentId");

			debugFirebaseServer(event, "api:all:collection:documentId", collectionId, documentId);

			if (!collectionId || !documentId) {
				throw createError({
					statusCode: 400,
					statusMessage: `collectionId & documentId are required`,
				});
			}

			// Prevent listing unauthorized collections
			if (!readCollection(collectionId, event.context)) {
				throw createError({
					statusCode: 401,
					statusMessage: `Couldn't list "${collectionId}"`,
				});
			}

			const collectionRef = firebaseFirestore.collection(collectionId);
			const documentsRef = collectionRef.doc(documentId);
			const documentSnapshot = await documentsRef.get();

			return resolveServerDocumentRefs(event, documentSnapshot, collectionId);
		} catch (err) {
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
