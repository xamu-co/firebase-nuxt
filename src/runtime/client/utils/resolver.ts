import type { FirebaseDocument, FromData } from "../types/entities/base";
import type {
	iSnapshotConfig,
	PseudoDocumentReference,
	PseudoDocumentSnapshot,
	PseudoNode,
} from "../types/firestore";

export function getDocumentId(path = ""): string {
	// This assumes a simpler db structure
	return path.split("/").pop() || "";
}

/** Timestamp breaks nuxt */
export function resolveSnapshotDefaults<
	T extends PseudoNode,
	R extends FirebaseDocument = FromData<T>,
>(id: string, node?: T): R {
	if (!node) return {} as R;

	const dateFields: Record<string, Date> = {};

	for (const key in node) {
		// TODO: match against any field of date type
		if (key.endsWith("At") && node[key] && "toDate" in node[key]) {
			dateFields[key] = node[key]?.toDate();
		}
	}

	return Object.assign({}, node, { id, ...dateFields }) as unknown as R;
}

/**
 * Get a document snapshot from a reference
 */
type Resolver = <Tr extends PseudoNode, Rr extends FirebaseDocument = FromData<Tr>>(
	ref: PseudoDocumentReference<Tr, Rr>
) => Promise<PseudoDocumentSnapshot<Tr, Rr>>;

/**
 * Get object from firebase snapshot
 */
export function makeResolveRefs(resolver: Resolver) {
	/**
	 * Resolve refs from a snapshot recursively
	 */
	return async function resolveRefs<
		T extends PseudoNode,
		R extends FirebaseDocument = FromData<T>,
	>(
		snapshot: PseudoDocumentSnapshot<T, R>,
		{ level = 0, omit = [] }: iSnapshotConfig = {},
		withAuth = false
	): Promise<R | undefined> {
		const exists = typeof snapshot.exists === "function" ? snapshot.exists() : snapshot.exists;

		if (!exists) return;

		const node = snapshot.data() || <T>{};
		const path = snapshot.ref.path;

		type kT = Extract<keyof T, string>;

		const keys = Object.keys(node || {}) as kT[];

		// Resolve all refs in parallel
		await Promise.all(
			keys.map(async (key) => {
				if (!Object.hasOwn(node, key)) return;

				const newKey = <kT>key.replace(/(Ref|Refs)$/, "");
				const innerOmit = omit
					.filter((k) => k && k.startsWith(newKey))
					.map((k) => k.replace(`${newKey.toString()}.`, ""));

				// Transform firebase paths
				// TODO: match against any field of type ref or ref[]
				if (key.endsWith("Ref")) {
					const ref = <PseudoDocumentReference<PseudoNode>>node[key];

					// Omit user if non authorized
					if (!omit.includes(newKey) && typeof ref === "object" && ref !== null) {
						let innerLevel = level;

						if (innerLevel > 0) {
							// Get member data if any
							if (newKey.endsWith("By")) {
								innerLevel = Math.max(innerLevel, 2);

								// Omit member data if non authorized
								if (!withAuth) {
									delete node[key];

									return;
								}
							}

							// Prevent infinite fetching loop, single ref
							const innerSnapshot = await resolver(ref); // node

							if (innerSnapshot) {
								const resolved = await resolveRefs(
									innerSnapshot,
									{ level: Math.max(0, innerLevel - 1), omit: innerOmit },
									withAuth
								);

								// typescript nonsense
								node[newKey] = <T[kT]>resolved;
							}
						}
					}

					delete node[key];
				} else if (key.endsWith("Refs")) {
					const nodes = <PseudoDocumentReference<PseudoNode>[]>node[key];

					// Prevent infinite fetching loop
					if (level > 0 && !omit.includes(newKey) && Array.isArray(nodes)) {
						const refs: FirebaseDocument[] = [];

						// Resolve all refs in parallel
						await Promise.all(
							nodes.map(async (ref) => {
								// bypass invalid ref
								if (typeof ref !== "object" || ref === null) return;

								const innerSnapshot = await resolver(ref); // node
								const data = innerSnapshot?.data();

								if (!innerSnapshot || !data) return;

								const resolved = await resolveRefs(
									innerSnapshot,
									{ level: Math.max(0, level - 1), omit: innerOmit },
									withAuth
								);

								if (resolved) refs.push(resolved);
							})
						);

						// typescript nonsense
						node[newKey] = <T[kT]>refs;
					}

					delete node[key];
				} else if (!key.endsWith("At") && node[key] && typeof node[key] === "object") {
					if (0 in node[key]) {
						// Fix array shaped object
						const dataArr = Object.values(node[key]).map((data) => {
							if (typeof data !== "object" || data === null) return data;

							const { id, ...newData } = resolveSnapshotDefaults("", data);

							return newData;
						});

						node[key] = <T[kT]>dataArr;
					} else {
						// Prevent non serializable inherits from being returned
						const { id, ...newData } = resolveSnapshotDefaults("", node[key]);

						node[key] = <T[kT]>newData;
					}
				}
			})
		);

		return resolveSnapshotDefaults<T, R>(path, node);
	};
}
