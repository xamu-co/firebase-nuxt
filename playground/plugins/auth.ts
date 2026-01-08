import { onIdTokenChanged } from "firebase/auth";

import { defineNuxtPlugin, useNuxtApp, useSessionStore } from "#imports";

/**
 * Auth using firebase SDK
 *
 * 1. Setup session on client, handle fresh auth redirects
 * 2. Setup instance/root on client for power users
 *
 * @plugin
 */
export default defineNuxtPlugin({
	name: "auth",
	dependsOn: ["pinia", "firebase-setup"],
	setup() {
		if (import.meta.server) return;

		const { $clientAuth } = useNuxtApp();
		const SESSION = useSessionStore();

		if (!$clientAuth) return;

		/**
		 * Setup user on every token refresh
		 * Get fresh token before any redirect
		 */
		onIdTokenChanged($clientAuth, async (authUser) => {
			// Clear session
			if (!authUser) return SESSION.unsetSession();

			const { uid, displayName: name, email, photoURL, isAnonymous } = authUser;

			// Get fresh token
			const token = await authUser.getIdToken();

			// Set session
			SESSION.setUser({ name, isAnonymous, uid, email, photoURL }, token);
		});
	},
});
