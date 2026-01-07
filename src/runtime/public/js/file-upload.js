import {
	initializeApp,
	getApps,
	getApp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
	getAuth,
	onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
	initializeAppCheck,
	CustomProvider,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app-check.js";
import {
	getStorage,
	uploadBytes,
	ref as storageRef,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Worker for image uploading to firebase storage
self.onmessage = async ({ data }) => {
	const { filePath, file, customMetadata, appData, appCheckToken: token } = data;

	try {
		// Get app
		const app = getApps().length ? getApp() : initializeApp(appData);
		// Set auth, required by fire storage custom rule
		const appAuth = getAuth(app);

		/**
		 * Initialize AppCheck
		 * @see https://github.com/firebase/firebase-js-sdk/issues/6645#issuecomment-1316654203
		 */
		initializeAppCheck(app, {
			provider: new CustomProvider({
				getToken: () => Promise.resolve({ token, expireTimeMillis: 0 }),
			}),
		});

		// Check auth
		const unsub = onAuthStateChanged(appAuth, async (authUser) => {
			// Auth required for uploading
			if (!authUser) return self.postMessage({ message: "Missing auth", type: "message" });

			// Setup storage
			const storage = getStorage(app);
			const fileRef = storageRef(storage, filePath);

			try {
				// Upload file
				const result = await uploadBytes(fileRef, file, { customMetadata });
				const size = result.metadata.size;

				if (size) self.postMessage({ result: size, type: "result" });
				else self.postMessage({ error: result, type: "error" });
			} catch (error) {
				// Upload error
				self.postMessage({ error, type: "error" });
			}

			unsub();
		});
	} catch (error) {
		// Initialization error
		self.postMessage({ error, type: "error" });
	}
};
