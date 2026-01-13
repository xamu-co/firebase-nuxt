import type { iNodeFnResponseStream } from "@open-xamu-co/ui-common-types";

import type { SharedDocument } from "./entities/instance";

export * from "./entities/base";
export * from "./entities/user";
export * from "./entities/instance";
export * from "./entities/logs";
export * from "./firestore";

export type Resolve<T extends SharedDocument, P extends [T?, ...any[]] = [T]> = [
	(v?: boolean | iNodeFnResponseStream<T>) => void,
	...P,
];
