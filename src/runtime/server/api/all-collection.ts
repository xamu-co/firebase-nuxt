import { FieldPath, type Query } from "firebase-admin/firestore";
import {
	createError,
	getQuery,
	getRouterParam,
	isError,
	sendNoContent,
	setResponseHeaders,
	setResponseStatus,
} from "h3";

import { defineConditionallyCachedEventHandler } from "../utils/cache";
import { getBoolean } from "../utils/guards";
import { getDocumentId } from "../../client/utils/resolver";
import {
	debugFirebaseServer,
	getEdgesPage,
	getOrderedQuery,
	getQueryAsEdges,
} from "../utils/firestore";
import { apiLogger, getServerFirebase } from "../utils/firebase";

// @ts-expect-error virtual file
import { readCollection, readInstanceCollection } from "#internal/firebase-nuxt";

/**
 * Get the edges from a given instance sub-collection
 *
 * @auth guest
 * @order createdAt
 */
export default defineConditionallyCachedEventHandler(async (event) => {
	const fieldDocument = FieldPath.documentId();
	const { firebaseFirestore } = getServerFirebase("api:all:[collectionId]");
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

		const params = getQuery(event);
		const page = getBoolean(params.page);
		const collectionId = getRouterParam(event, "collectionId");

		debugFirebaseServer(event, "api:all:[collectionId]", collectionId);

		if (!collectionId) {
			throw createError({ statusCode: 400, statusMessage: `collectionId is required` });
		}

		let query: Query = firebaseFirestore.collection(collectionId);

		// Prevent listing unauthorized collections
		if (event.path.startsWith("/api/instance/all")) {
			if (!currentInstanceRef) {
				throw createError({ statusCode: 401, statusMessage: "Missing instance" });
			} else if (!readInstanceCollection(collectionId, event.context)) {
				throw createError({
					statusCode: 401,
					statusMessage: `Can't list "instance/${collectionId}"`,
				});
			}

			// Instance is required
			query = currentInstanceRef.collection(collectionId);
		} else if (!readCollection(collectionId, event.context)) {
			throw createError({
				statusCode: 401,
				statusMessage: `Can't list "${collectionId}"`,
			});
		}

		// Bypass body for HEAD requests
		// Since we always return an array or an object, we can just return 200
		if (event.method?.toUpperCase() === "HEAD") {
			setResponseStatus(event, 200);

			// Prevent no content status
			return "Ok";
		}

		// filtered query cannot be mixed with any other query type
		if (params.include) {
			let include = Array.isArray(params.include) ? params.include : [params.include];

			// clean & filter
			include = include.filter((uid) => uid && !getBoolean(uid)).map(getDocumentId);

			debugFirebaseServer(event, "api:all:[collectionId]:filtered", include);

			// Do not fetch empty list
			if (!include.length) return [];

			/**
			 * limited subset of documents
			 *
			 * According to firebase docs, queries are limited to 30 disjuntion operations
			 * @see https://firebase.google.com/docs/firestore/query-data/queries#limits_on_or_queries
			 */
			query = query.orderBy(fieldDocument).where(fieldDocument, "in", include);

			return getQueryAsEdges(event, query);
		}

		query = getOrderedQuery(event, query);

		if (page) return getEdgesPage(event, query);

		// Page limit. Prevent abusive callings (>100)
		const first = Math.min(Number(params.first) || 10, 100);

		return getQueryAsEdges(event, query.limit(first));
	} catch (err) {
		// Bypass nuxt errors
		if (isError(err)) {
			apiLogger(event, "api:all:[collectionId]", err.message, err);

			return setResponseStatus(event, err.statusCode || 500, err.statusMessage);
		}

		throw err;
	}
});
