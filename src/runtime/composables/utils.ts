import { isEqual } from "lodash-es";

import { createError, useAppStore, useInstanceStore } from "#imports";

export function useImagePath(
	path?: string,
	preset: "avatar" | "small" | "medium" | "large" = "avatar"
) {
	if (!path || path === "/sample-loading.png") return "/sample-loading.png";
	else if (path.startsWith("/api/media/images")) return path;
	else if (path.startsWith("/firebase")) path = path.replace("/firebase", "/api/media/images");
	else path = `/api/media/images/${path}/${preset}.webp`;

	return `${path}?temp=${Date.now()}`;
}

/**
 * Return object with differing properties if any
 */
export function getValuesDiff<V extends Record<string, any>>(
	values: V,
	expectedValues: Partial<V>
) {
	const keysWithDifference: Array<keyof V> = [];
	const differentValues: Partial<V> = {};

	for (const k in expectedValues) {
		if (!Object.hasOwn(expectedValues, k)) continue;

		/** Check is value is expected */
		const expected = ![null, undefined, ""].includes(expectedValues[k]);
		/** Check if value was provided */
		const provided = values[k] || values[k] === 0;

		// If provided or expected
		if (k in values || (expected && !provided)) {
			const equal = isEqual(values[k], expectedValues[k]);
			const emptyArray = isEqual(values[k] || [], expectedValues[k]);

			if (equal || emptyArray) continue;

			keysWithDifference.push(k);
			differentValues[k] = <V[keyof V]>(values[k] ?? "");
		}
	}

	if (!keysWithDifference.length) return;

	return differentValues;
}

export function useCreateError(message: string, statusCode = 500) {
	return createError({ message, statusCode, fatal: true });
}

/**
 * Append tracking information to external urls
 */
export function useUTMLink(link: string) {
	const INSTANCE = useInstanceStore();
	const { hostname } = new URL(INSTANCE.current?.url || "");
	const url = new URL(link);

	url.searchParams.append("utm_source", hostname);
	url.searchParams.append("utm_content", "textlink");

	return url.toString();
}

/**
 * Attemp to reload image after a few seconds
 */
export function onImageError(event: Event, attemp = 0) {
	// Do not abuse
	if (attemp >= 20) return;

	const APP = useAppStore();
	const img = event.target as HTMLImageElement;
	const [src] = img.src.split("?");

	// Match firebase images
	if (src.includes("/api/media/images/instances/")) {
		const key = src.slice(18, src.lastIndexOf("/"));
		const thumbnail = APP.thumbnails[key];

		// Prefer thumbnail if any
		if (thumbnail) return (img.src = thumbnail);
	}

	setTimeout(async () => {
		// Check if file exists
		try {
			const now = Date.now();
			const unchached = `${src}?t=${now}`;
			const response = await fetch(src);

			if (!response.ok) {
				// 503 or 404, attempt again
				if (response.status === 503 || response.status === 404) {
					return onImageError(event, attemp++);
				}

				return;
			}

			img.src = unchached;
		} catch (error) {
			// Unknown error, stop trying
			return;
		}
	}, 1000 * 5); // 5 seconds
}
