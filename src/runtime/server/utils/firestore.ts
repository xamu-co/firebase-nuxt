import { type H3Event, type EventHandlerRequest, getRequestURL, createError, getQuery } from "h3";
import {
	type DocumentData,
	DocumentReference,
	DocumentSnapshot,
	QuerySnapshot,
	Query,
} from "firebase-admin/firestore";
import { useEvent } from "nitropack/runtime";

import type { iPage, iPageEdge, tLogger, tOrderBy } from "@open-xamu-co/ui-common-types";

import type { PseudoNode, FirebaseDocument, iSnapshotConfig, FromData } from "../../client/types";
import { getBoolean, isNumberOrString } from "../utils/guards";
import { makeResolveRefs } from "../../client/utils/resolver";
import { apiLogger, getServerFirebase } from "./firebase";
import { debugFirebase } from "../utils/environment";

// @ts-expect-error virtual file
import { sudo } from "#internal/firebase-nuxt";

const decodeCursor = (cursor: string) => Buffer.from(cursor, "base64").toString("utf8");
// base64 encode the snapshot's path
const encodeCursor = (ref: DocumentReference) => {
	return Buffer.from(ref.path).toString("base64");
};

/**
 * Logging for debugging purposes on server
 */
export function debugFirebaseServer<T extends EventHandlerRequest>(
	event: H3Event<T>,
	mss: string,
	...args: any[]
) {
	if (import.meta.server && debugFirebase.value()) {
		const url = getRequestURL(event);

		console.group("\x1b[34m%s\x1b[0m", url);
		console.log(`${mss},`, ...args);
		console.groupEnd();
	}
}

/**
 * This one is used on api endpoints
 */
export function resolveServerDocumentRefs<
	T extends PseudoNode,
	R extends FromData<T> = FromData<T>,
>(event: H3Event, snapshot?: DocumentSnapshot<T, R>, collection = "documents", withAuth?: boolean) {
	if (!snapshot?.exists) {
		let statusMessage = `No "${collection}" matched`;

		if (snapshot?.ref.path) statusMessage = `${statusMessage} for ${snapshot.ref.path}`;

		throw createError({ statusCode: 404, statusMessage });
	}

	const params = getQuery(event);
	const level = Array.isArray(params.level) || !params.level ? 0 : Number(params.level);
	const omit = Array.isArray(params.omit) ? params.omit : [params.omit];

	return resolveServerRefs<T, R>(snapshot, { level, omit }, withAuth);
}

/**
 * Resolve general refs
 */
export async function resolveServerRefs<T extends PseudoNode, R extends FromData<T> = FromData<T>>(
	snapshot: DocumentSnapshot<T, R>,
	config: iSnapshotConfig = {},
	withAuth?: boolean
) {
	const event = useEvent();
	const resolveRefs = makeResolveRefs((ref) => ref.get?.());

	try {
		// validate authorization
		if (withAuth === undefined) withAuth = sudo(event.context);
	} catch (err) {
		const payload: Parameters<tLogger> = [`resolveServerRefs:${snapshot.ref.path}`, err];

		config.logger ? config.logger(...payload) : apiLogger(event, ...payload);
	}

	return resolveRefs<T, R>(snapshot, config, withAuth);
}

/** Edge guard */
const edge = (e: iPageEdge<FirebaseDocument> | undefined): e is iPageEdge<FirebaseDocument> => !!e;

export async function mapEdges<T extends Record<string, any>>(
	collectionSnapshot: QuerySnapshot<T>,
	encoder: (v: any) => string,
	snapshotConfig: iSnapshotConfig
) {
	// Awaited edges, run in parallel
	const edges: (iPageEdge<FirebaseDocument> | undefined)[] = await Promise.all(
		collectionSnapshot.docs.map(async (document) => {
			const node = await resolveServerRefs(document, snapshotConfig);

			if (node) return { cursor: encoder(document.ref), node };
		})
	);

	return edges.filter(edge);
}

export function getOrderedQuery<T extends EventHandlerRequest>(
	event: H3Event<T>,
	query: Query
): Query {
	const params = getQuery<{ orderBy?: tOrderBy[] }>(event);
	const orderByParam = Array.isArray(params.orderBy?.[0]) ? params.orderBy[0] : [];
	const orderByValues: tOrderBy = [orderByParam[0] ?? "createdAt", orderByParam[1] ?? "desc"];

	return query.orderBy(...orderByValues);
}

/**
 * Get the edges from a given query
 */
export async function getQueryAsEdges<T extends EventHandlerRequest>(
	event: H3Event<T>,
	query: Query,
	callback?: (v: QuerySnapshot<DocumentData>) => void | Promise<void>
): Promise<iPageEdge<DocumentData, string>[]> {
	const params = getQuery(event);
	const page = getBoolean(params.page);
	const level = Array.isArray(params.level) || !params.level ? 0 : Number(params.level);
	const omit = Array.isArray(params.omit) ? params.omit : [params.omit];

	debugFirebaseServer(event, "getQueryAsEdges", params);

	// Prevent abusive callings (>100)
	if (!page) {
		const first = Math.min(Number(params.first) || 10, 100); // Page limit

		query = query.limit(first);
	}

	const snapshot = await query.get();

	// Do something with the snapshot, do not await
	Promise.resolve(callback?.(snapshot)).catch((err) => {
		// Log unhandled error
		apiLogger(event, "getQueryAsEdges:callback", err);
	});

	return mapEdges(snapshot, encodeCursor, { level, omit });
}

/**
 * Cursor pagination from a given query
 */
export async function getEdgesPage<T extends EventHandlerRequest>(
	event: H3Event<T>,
	query: Query
): Promise<iPage<DocumentData, string>> {
	const { firebaseFirestore } = getServerFirebase(`api:getEdgesPage:${event.path}`);
	const params = getQuery(event);
	/**
	 * Cursor or encoded cursor path.
	 *
	 * The number zero could be a cursor, validate against undefined
	 */
	const at = isNumberOrString(params.at) ? params.at : undefined;
	// Page limit. Prevent abusive callings (>=100)
	let first = Math.min(Number(params.first) || 10, 100);
	const page: iPage<DocumentData, string> = {
		edges: [],
		pageInfo: {
			hasNextPage: false,
			hasPreviousPage: false,
			pageNumber: 0,
			path: event.path,
		},
		totalCount: 0,
	};
	// Count all items in collection
	const aggregatorRef = query.count();
	let cursorRef = query; // Start collection at given cursor
	let startAtCursor: DocumentSnapshot | undefined;

	if (typeof at === "string") {
		// Awaited data, run in parallel
		const [aggregatorSnapshot, snapshot] = await Promise.all([
			aggregatorRef.get(),
			firebaseFirestore.doc(decodeCursor(at)).get(),
		]);
		const count = aggregatorSnapshot.data().count;

		first = Math.min(first, count);
		page.totalCount = count;

		if (snapshot.exists) {
			startAtCursor = snapshot;
			cursorRef = cursorRef.startAt(snapshot);
		}
	} else {
		// Use matching doc as cursor or fallback to at
		if (at !== undefined) cursorRef = cursorRef.startAt(at);

		const { count } = (await aggregatorRef.get()).data();

		first = Math.min(first, count);
		page.totalCount = count;
	}

	// Empty collection
	if (!page.totalCount) return page;

	const paginatedRef = cursorRef.limit(first + 1); // First n+1 items in collection after cursor

	// Has previous page?
	if (startAtCursor) {
		const previousPaginatedRef = query.endBefore(startAtCursor);
		const previousAggregatorRef = previousPaginatedRef.count(); // Estimate current page
		// Awaited data, run in parallel
		const [edges, previousCountRef, previousSnapshot] = await Promise.all([
			getQueryAsEdges(event, paginatedRef),
			previousAggregatorRef.get(),
			previousPaginatedRef.limitToLast(first).get(),
		]);
		const { count } = previousCountRef.data();

		page.edges = edges;
		page.pageInfo.pageNumber = Math.floor(count / first) + 1;

		if (!previousSnapshot.empty) {
			page.pageInfo.hasPreviousPage = true;
			page.pageInfo.previousCursor = encodeCursor(previousSnapshot.docs[0].ref);
		}
	} else {
		// First page
		page.edges = await getQueryAsEdges(event, paginatedRef);
		page.pageInfo.pageNumber = 1;
	}

	// Has next page?
	if (page.edges.length > first) {
		const nextEdge = page.edges.pop(); // Get last edge

		page.pageInfo.hasNextPage = !!nextEdge;
		page.pageInfo.nextCursor = nextEdge?.cursor;
	}

	return page;
}
