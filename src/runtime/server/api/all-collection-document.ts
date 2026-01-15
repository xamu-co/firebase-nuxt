import type { CollectionReference } from "firebase-admin/firestore";
import {
	createError,
	getRouterParam,
	isError,
	sendNoContent,
	setResponseHeaders,
	setResponseStatus,
} from "h3";

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
export default defineConditionallyCachedEventHandler(async (event) => {
	const { firebaseFirestore } = getServerFirebase("api:all:[collectionId]:[documentId]");
	const { currentInstanceRef } = event.context;
	const Allow = "GET,HEAD";

	try {
		// Override CORS headers
		setResponseHeaders(event, {
			Allow,
			"Access-Control-Allow-Methods": Allow,
			"Content-Type": "application/json",
		});

		// Only GET, HEAD & OPTIONS are allowed
		if (!["GET", "HEAD", "OPTIONS"].includes(event.method?.toUpperCase())) {
			throw createError({ statusCode: 405, statusMessage: "Unsupported method" });
		} else if (event.method?.toUpperCase() === "OPTIONS") {
			// Options only needs allow headers
			return sendNoContent(event);
		}

		const collectionId = getRouterParam(event, "collectionId");
		const documentId = getRouterParam(event, "documentId");

		debugFirebaseServer(event, "api:all:[collectionId]:[documentId]", collectionId, documentId);

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

		if (!documentSnapshot?.exists) {
			let statusMessage = `No "${collectionId}" document matched`;

			if (documentSnapshot?.ref.path) {
				statusMessage = `${statusMessage} for ${documentSnapshot.ref.path}`;
			}

			throw createError({ statusCode: 404, statusMessage });
		}

		// Bypass body for HEAD requests
		if (event.method?.toUpperCase() === "HEAD") {
			setResponseStatus(event, 200);

			// Prevent no content status
			return "Ok";
		}

		return resolveServerDocumentRefs(event, documentSnapshot);
	} catch (err) {
		// Bypass nuxt errors
		if (isError(err)) {
			apiLogger(event, "api:all:[collectionId]:[documentId]", err.message, err);

			return setResponseStatus(event, err.statusCode || 500, err.statusMessage);
		}

		throw err;
	}
});
