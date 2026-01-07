export function isNumberOrString(v: unknown): v is number | string {
	return ["number", "string"].includes(typeof v);
}

export function isFileArray<T>(values?: File[] | T[]): values is File[] {
	return !values?.every((v) => Array.isArray(v));
}

export function getBoolean(value?: unknown, prefer?: boolean): boolean {
	if (value && typeof value === "string") {
		return value.toUpperCase() === "TRUE";
	}

	return !!prefer;
}

type tPromiseExecutor<T> = (
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (reason?: any) => void
) => void;

/**
 * Fails promise if it takes too long (30s by default)
 * Any error must be capture within the executor and rejected
 *
 * @see https://ourcodeworld.com/articles/read/1544/how-to-implement-a-timeout-for-javascript-promises
 */
export function TimedPromise<T>(
	executor: tPromiseExecutor<T>,
	{ fallback, timeout = 1000 * 30 }: { fallback?: T; timeout?: number } = {}
): Promise<T> {
	return Promise.race<T>([
		new Promise(executor),
		new Promise((resolve, reject) => {
			setTimeout(() => {
				if (fallback) return resolve(fallback);

				reject("Timed out");
			}, timeout);
		}),
	]);
}
