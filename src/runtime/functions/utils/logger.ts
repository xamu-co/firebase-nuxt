import { DocumentReference, type Firestore } from "firebase-admin/firestore";

import type { tLogger } from "@open-xamu-co/ui-common-types";

import { getLog } from "./logs.js";

export function makeFunctionsLogger(
	at: DocumentReference | Firestore,
	authorRef?: DocumentReference,
	metadata: Record<string, any> = {}
): tLogger {
	return function (...args: Parameters<tLogger>) {
		const logData = getLog(...args, metadata);

		if (!logData) return;

		try {
			const logsRef = at.collection("logs");

			// Inject author
			if (at instanceof DocumentReference && authorRef) {
				logData.createdByRef = logData.updatedByRef = authorRef;
			}

			logsRef.add(logData);
		} catch (err) {
			console.error("Error logging to db", err);
		}
	};
}
