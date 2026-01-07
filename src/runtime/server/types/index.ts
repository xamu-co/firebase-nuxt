import type { DocumentReference } from "firebase-admin/firestore";
import type {
	EventHandler,
	EventHandlerRequest,
	EventHandlerResponse,
	H3Event,
	H3EventContext,
} from "h3";

import type { InstanceData } from "../../functions/types";
import type { Instance, User } from "../../client/types";

export interface H3Context extends H3EventContext {
	currentInstance?: Instance & { millis: string; url: string; id: string };
	currentInstanceRef?: DocumentReference<InstanceData>;
	/**
	 * Milliseconds from creation
	 */
	currentInstanceMillis?: string;
	/**
	 * Clean host without port
	 *
	 * @example "example.com"
	 * @cache used for instance cache key
	 */
	currentInstanceHost?: string;
	currentAuth?: User & { id: string; uid: string };
	currentAuthRef?: DocumentReference;
}

export interface CachedH3Event<T extends EventHandlerRequest = EventHandlerRequest> extends Omit<
	H3Event<T>,
	"context"
> {
	context: H3Context;
}

export interface CachedEventHandler<
	T extends EventHandlerRequest = EventHandlerRequest,
	D extends EventHandlerResponse = EventHandlerResponse,
> extends Omit<EventHandler<T, D>, "event"> {
	(event: CachedH3Event<T>): D;
}
