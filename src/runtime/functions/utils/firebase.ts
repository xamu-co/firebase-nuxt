import { getApp, getApps, initializeApp, type AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export function getFirebase(at = "Unknown", appOptions?: AppOptions) {
	if (import.meta.client) throw new Error("This function is only available in server context");

	try {
		const firebaseApp = getApps().length ? getApp() : initializeApp(appOptions);
		const firebaseFirestore = getFirestore(firebaseApp);
		const firebaseAuth = getAuth(firebaseApp);
		const firebaseStorage = getStorage();

		// Do once per context
		if (!("ignoreUndefined" in global)) {
			// Ignore undefined values
			firebaseFirestore.settings({ ignoreUndefinedProperties: true });
			Object.assign(global, { ignoreUndefined: true });
		}

		return { firebaseApp, firebaseFirestore, firebaseAuth, firebaseStorage };
	} catch (err: any) {
		console.log(err);

		throw new Error(`Could not initialize Firebase Admin SDK, ${err.message}, at: ${at}`);
	}
}
