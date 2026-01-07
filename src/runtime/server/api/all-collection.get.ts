import { FieldPath, type Query } from "firebase-admin/firestore";
import { createError, getQuery, getRouterParam, isError, setResponseStatus } from "h3";

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
import { readCollection } from "#internal/firebase-nuxt";

/**
 * Get the edges from a given instance sub-collection
 *
 * @auth guest
 * @order createdAt
 */
export default defineConditionallyCachedEventHandler(
	async (event) => {
		const fieldDocument = FieldPath.documentId();
		const { firebaseFirestore } = getServerFirebase("api:all:collection");

		try {
			const params = getQuery(event);
			const page = getBoolean(params.page);
			const collectionId = getRouterParam(event, "collectionId");

			debugFirebaseServer(event, "api:all:collection", collectionId);

			if (!collectionId) {
				throw createError({ statusCode: 400, statusMessage: `collectionId is required` });
			}

			// Prevent listing unauthorized collections
			if (!readCollection(collectionId, event.context)) {
				throw createError({
					statusCode: 401,
					statusMessage: `Couldn't list "${collectionId}"`,
				});
			}

			let query: Query = firebaseFirestore.collection(collectionId);

			// filtered query cannot be mixed with any other query type
			if (params.include) {
				let include = Array.isArray(params.include) ? params.include : [params.include];

				// clean & filter
				include = include.filter((uid) => uid && !getBoolean(uid)).map(getDocumentId);

				debugFirebaseServer(event, "getFilteredCollection", include);

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
			if (isError(err)) {
				apiLogger(event, "api:all:[collectionId]", err.message, err);

				return setResponseStatus(event, err.statusCode || 500, err.statusMessage);
			}

			throw err;
		}
	},
	{
		instanceOnly: false,
	}
);
