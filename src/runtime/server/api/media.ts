import { createHash } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { defineCachedFunction, useStorage } from "nitropack/runtime";
import {
	createError,
	defineEventHandler,
	getRouterParam,
	H3Event,
	isError,
	sendError,
	sendNoContent,
	setHeaders,
	setResponseHeaders,
	setResponseStatus,
} from "h3";

import { storageBucket } from "../utils/environment";
import { debugFirebaseServer } from "../utils/firestore";
import { apiLogger } from "../utils/firebase";

const maxAge = 60 * 60 * 24 * 30; // seconds in a month
const preventCache = {
	"Cache-Control": "no-cache, no-store, must-revalidate",
	Pragma: "no-cache",
	Expires: "0",
};

// @ts-expect-error virtual file
import { readCollection, readInstanceCollection } from "#internal/firebase-nuxt";

/**
 * Rdr to firebase media
 *
 * Errors are not cached
 *
 * @example /api/media/images/instances/abc123/variants/def456/ghi789.webp
 */
const cachedBufferHandler = defineCachedFunction(
	async (
		event: H3Event,
		path: string
	): Promise<{ buffer?: Buffer; headers?: Record<string, string>; error?: Error }> => {
		const { currentInstanceRef } = event.context;

		debugFirebaseServer(event, "api:media", path);

		if (!path) {
			return { error: createError({ statusCode: 400, statusMessage: "Invalid file path" }) };
		}

		const [baseAndExtension] = path.split("?"); // Ignore query params
		const [, collectionId, , fileOrSubCollectionId] = baseAndExtension.split("/");

		// Prevent getting unauthorized collections files
		if (collectionId === "instances" && !fileOrSubCollectionId.includes(".")) {
			if (!currentInstanceRef) {
				throw createError({ statusCode: 401, statusMessage: "Missing instance" });
			} else if (!readInstanceCollection(fileOrSubCollectionId, event.context)) {
				throw createError({
					statusCode: 401,
					statusMessage: `Can't get "instance/${fileOrSubCollectionId}" file`,
				});
			}
		} else if (!readCollection(collectionId, event.context)) {
			throw createError({
				statusCode: 401,
				statusMessage: `Can't get "${collectionId}" file`,
			});
		}

		// Setup bucket & get file extension
		const serverStorage = getStorage();
		const bucket = serverStorage.bucket(storageBucket.value());
		const file = bucket.file(baseAndExtension);
		const [, extension] = baseAndExtension.split(".");

		// Fetch supported extensions
		switch (extension) {
			case "webp": {
				const [exists] = await file.exists();
				const headers: Record<string, string> = { "Content-Type": "image/webp" };

				// Return actual file
				if (exists) {
					// Bypass body for HEAD requests
					if (event.method?.toUpperCase() === "HEAD") return { headers };

					const [buffer] = await file.download();

					return { buffer, headers };
				}

				// File not found, as image, check if it is being resized
				const parts = baseAndExtension.split("/");

				// Remove file name
				parts.pop();

				const [files] = await bucket.getFiles({ prefix: parts.join("/") });

				// If files within directory (original, resized...), return a 503 with a retry-after header
				// @see https://stackoverflow.com/questions/9794696/which-http-status-code-means-not-ready-yet-try-again-later
				if (files.length) {
					return {
						headers: { ...preventCache, "Retry-After": "120" },
						error: createError({
							statusCode: 503,
							statusMessage: `File with path: "${path}" is not ready yet`,
						}),
					};
				}

				break;
			}
		}

		return {
			headers: preventCache,
			error: createError({
				statusCode: 404,
				statusMessage: `File with path: "${path}" does not exist`,
			}),
		};
	},
	{
		name: "getMedia",
		maxAge,
		getKey(event, path) {
			const [baseAndExtension] = path.split("?"); // Ignore query params

			// Compact hash
			const hash = createHash("sha256").update(baseAndExtension).digest("hex");

			return `${hash}:${event.method}`;
		},
	}
);

/**
 * Media endpoint
 *
 * Buffer check because of nitro issue:
 * @see https://github.com/unjs/nitro/issues/1894
 */
export default defineEventHandler(async (event) => {
	const path = getRouterParam(event, "path") || "";
	const Allow = "GET,HEAD";

	try {
		// Override CORS headers
		setResponseHeaders(event, { Allow, "Access-Control-Allow-Methods": Allow });

		// Only GET, HEAD & OPTIONS are allowed
		if (!["GET", "HEAD", "OPTIONS"].includes(event.method?.toUpperCase())) {
			throw createError({ statusCode: 405, statusMessage: "Unsupported method" });
		} else if (event.method?.toUpperCase() === "OPTIONS") {
			// Options only needs allow headers
			return sendNoContent(event);
		}

		const { buffer, headers = {}, error } = await cachedBufferHandler(event, path);

		setHeaders(event, headers);

		if (error || !buffer) {
			// Bypass body for HEAD requests
			if (!error && event.method?.toUpperCase() === "HEAD") {
				setResponseStatus(event, 200);

				// Prevent no content status
				return "Ok";
			}

			// Set fallback error
			const err =
				error ||
				createError({
					statusCode: 500,
					statusMessage: `Something went wrong while trying to get file with path: "${path}"`,
				});

			throw err;
		}

		return Buffer.from(buffer);
	} catch (err) {
		const storage = useStorage("cache");
		const [baseAndExtension] = path.split("?"); // Ignore query params
		const hash = createHash("sha256").update(baseAndExtension).digest("hex");

		// Remove media cache
		await storage.removeItem(`nitro:functions:getMedia:${hash}.json`);

		// Bypass nuxt errors
		if (isError(err)) {
			// Do not log if file isn't ready
			if (err.statusCode !== 503) apiLogger(event, "api:media:[...path]", err.message, err);

			return sendError(event, err);
		}

		throw err;
	}
});
