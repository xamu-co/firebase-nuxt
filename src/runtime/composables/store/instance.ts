import { defineStore, skipHydrate } from "pinia";
import { omit } from "lodash-es";
import { computed } from "vue";

import type { Instance, Root } from "../../client/types";
import { makeLogger } from "../../client/utils/logger";

import { type CookieOptions } from "#app";
import { useCookie, useRuntimeConfig } from "#imports";

export interface City {
	state?: { name: string };
	country?: { name: string };
	// internals
	name: string;
}

const cookieOptionsDefaults = {
	sameSite: "strict",
	maxAge: 60 * 60, // 1 hour
} satisfies CookieOptions;

/**
 * Root instance store
 * Handle root instance state
 *
 * @state
 */
export const useRootStore = defineStore("root", () => {
	const { production } = useRuntimeConfig().public;
	const cookieOptions = {
		...cookieOptionsDefaults,
		secure: production,
		partitioned: production,
	} satisfies CookieOptions;

	// State
	const current = useCookie<Root | undefined>("root.current", {
		...cookieOptions,
		default: () => undefined,
	});

	// Getters

	/** Get updated iva from db, 1.19 */
	const tax = computed(() => {
		return (current.value?.config?.iva ?? 19) / 100 + 1;
	});

	// Actions
	function setRoot(newRoot?: Root) {
		if (!newRoot) return;

		current.value = newRoot;
	}

	return {
		// State
		current: skipHydrate(current),
		// Getters
		tax,
		// Actions
		setRoot,
	};
});

/**
 * Instance store
 * Handle current instance state
 *
 * @state
 */
export const useInstanceStore = defineStore("instance", () => {
	const { production, cache } = useRuntimeConfig().public;
	const cookieOptions = {
		...cookieOptionsDefaults,
		secure: production,
		partitioned: production,
	} satisfies CookieOptions;

	// State
	const current = useCookie<Instance | undefined>("instance.current", {
		...cookieOptions,
		default: () => undefined,
	});
	const location = useCookie<string | undefined>("instance.location", {
		...cookieOptions,
		default: () => undefined,
	});
	/** Instance is fresh (session only) */
	const fresh = useCookie<boolean>("instance.fresh", {
		...omit(cookieOptions, "maxAge"),
		default: () => false,
	});

	// Getters
	const id = computed(() => current.value?.id || "");

	// Actions
	async function setInstance(instance?: Instance) {
		if (!instance) return;

		const url = instance.url;
		const logger = makeLogger({ instanceId: id.value });
		const { locationCountry, locationState, locationCity } = instance;

		current.value = { ...instance, url };

		// Prevent massive request on the server
		if (fresh.value || !locationCountry || !locationState || !locationCity) return;

		const endpoint = `${url}/_countries/${locationCountry}/${locationState}/${locationCity}`;

		fresh.value = true;

		try {
			// Fetch location, prefer $fetch
			const { data } = await $fetch<{ data?: City }>(endpoint, {
				query: { state: true, country: true },
				headers: { "Cache-Control": cache.longterm },
			});

			if (!data) return;

			location.value = `${data.name}. ${data.state?.name}. ${data.country?.name}.`;
		} catch (err) {
			logger("composables:useInstanceStore:setInstance", err);
		}
	}
	function unsetInstance() {
		location.value = undefined;
		current.value = undefined;
		fresh.value = false;
	}

	return {
		// Instance
		fresh: skipHydrate(fresh),
		current: skipHydrate(current),
		location: skipHydrate(location),
		// Getters
		id,
		// Actions
		setInstance,
		unsetInstance,
	};
});
