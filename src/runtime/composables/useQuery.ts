import type { NitroFetchOptions, NitroFetchRequest } from "nitropack";

import { useRequestHeaders, useNuxtApp, useRuntimeConfig, useSessionStore } from "#imports";

/**
 * Inject auth headers and refresh token
 *
 * @param baseOptions
 * @returns
 */
async function getQueryOptions<R extends NitroFetchRequest = NitroFetchRequest>(
	baseOptions?: NitroFetchOptions<R>
): Promise<NitroFetchOptions<R>> {
	const SESSION = useSessionStore();
	const { $clientAuth } = useNuxtApp();
	const { cache } = useRuntimeConfig().public;
	const { query, ...options } = { ...baseOptions };
	const headers: Record<string, any> = {
		...useRequestHeaders(), // Server headers (required for instance)
		authorization: SESSION.token || "",
		"Cache-Control": cache.frequent,
		...options?.headers, // Overrides
		"Xamu-Context-Source": import.meta.client ? "client" : "server",
	};

	// Refresh token, before server request (required for auth)
	if (SESSION.user) {
		if (import.meta.client) {
			const freshToken = await $clientAuth?.currentUser?.getIdToken();

			headers.authorization = freshToken || headers.authorization;
		}

		SESSION.setUser(SESSION.user, headers.authorization);
	}

	return { credentials: "same-origin", ...options, query, headers };
}

/**
 * Fetch wrapper with csrf token
 */
export async function useCsrfQuery<T, R extends NitroFetchRequest = NitroFetchRequest>(
	url: Extract<R, string>,
	baseOptions?: NitroFetchOptions<R>
) {
	const { $csrfFetch } = useNuxtApp();
	const { responseType, ...options } = await getQueryOptions(baseOptions);

	return $csrfFetch<T>(url, options);
}

/**
 * Fetch wrapper
 *
 * Refresh auth token before each request
 * @see https://stackoverflow.com/questions/47803495/error-firebase-id-token-has-expired
 */
export async function useQuery<T, R extends NitroFetchRequest = NitroFetchRequest>(
	url: Extract<R, string>,
	baseOptions?: NitroFetchOptions<R>
) {
	const options = await getQueryOptions(baseOptions);

	return $fetch<T>(url, options);
}
