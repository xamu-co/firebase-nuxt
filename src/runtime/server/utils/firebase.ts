import type { H3Event } from "h3";
import { cert } from "firebase-admin/app";

import type { tLogger } from "@open-xamu-co/ui-common-types";

import type { H3Context } from "../types";
import { clientEmail, privateKey, projectId } from "../utils/environment";
import { makeLogger } from "../../client/utils/logger";
import { getFirebase } from "../../functions/utils/firebase";

export function getServerFirebase(at = "Unknown") {
	const credential = cert({
		projectId: projectId.value(),
		privateKey: privateKey.value(),
		clientEmail: clientEmail.value(),
	});

	return getFirebase(at, { credential });
}

export function apiLogger(event: H3Event, ...args: Parameters<tLogger>): void {
	const { currentAuth, currentInstance } = <Partial<H3Context>>(event.context || {});
	const logger = makeLogger({ instanceId: currentInstance?.id, authId: currentAuth?.uid });

	// use makeLogger to add additional context
	return logger(...args);
}
