import { type EventHandlerRequest, type EventHandlerResponse, defineEventHandler } from "h3";
import { defineCachedEventHandler } from "nitropack/runtime";

import { debugNitro } from "../utils/environment";
import type { CachedEventHandler, CachedH3Event } from "../types";

// @ts-expect-error virtual file
import { sudo } from "#internal/firebase-nuxt";

interface CachedEventHandlerOptions<T extends EventHandlerRequest = EventHandlerRequest> {
	/** Optional key generator */
	getKey?: (...args: [CachedH3Event<T>]) => string | Promise<string>;
	/** Partition cache by instance */
	instanceOnly?: boolean;
}

/**
 * Conditionally cache event data.
 * Bypasses cache for admin purposes
 * Caches by instance by default
 *
 * @cache 30 seconds
 *
 * @param handler event handler, should have its own error handling
 * @param options optional key generator and instanceOnly flag
 * @returns event handler
 */
export const defineConditionallyCachedEventHandler = <
	T extends EventHandlerRequest,
	D extends EventHandlerResponse = EventHandlerResponse,
>(
	handler: CachedEventHandler<T, D>,
	{ getKey, instanceOnly = true }: CachedEventHandlerOptions<T> = {}
): CachedEventHandler<T, D> => {
	const cachedHandler = defineCachedEventHandler(handler, {
		maxAge: 30, // 30 seconds
		getKey: instanceOnly
			? (event: CachedH3Event<T>) => {
					// Prefix with instance host if available
					const { currentInstanceHost } = event.context;
					const key = getKey?.(event) || event.path;

					if (currentInstanceHost) return `${currentInstanceHost}:${key}`;

					return key;
				}
			: getKey,
	});

	return defineEventHandler<T>(async (event: CachedH3Event<T>) => {
		// Bypass cache for admin purposes
		if (sudo(event.context) || debugNitro.value()) return handler(event);

		return cachedHandler(event);
	});
};
