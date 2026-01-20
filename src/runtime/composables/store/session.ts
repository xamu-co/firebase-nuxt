import { deleteUser, type Auth } from "firebase/auth";
import { defineStore, skipHydrate } from "pinia";
import { computed } from "vue";

import type { InstanceMember, User } from "../../client/types";

import { type CookieOptions } from "#app";
import { useCookie, useRuntimeConfig, useSwal } from "#imports";

const cookieOptionsDefaults = {
	sameSite: "strict",
	maxAge: 365 * 24 * 60 * 60, // 1 year
} satisfies CookieOptions;

/**
 * Session store
 * Handle authentication state
 *
 * Token is to large, so this store should handle its own cookie
 *
 * @state
 */
export const useSessionStore = defineStore("session", () => {
	const { production } = useRuntimeConfig().public;
	const cookieOptions = {
		...cookieOptionsDefaults,
		secure: production,
		partitioned: production,
	} satisfies CookieOptions;

	// State
	const token = useCookie<string | null>("session.token", {
		...cookieOptions,
		default: () => null,
	});
	const expiredToken = useCookie<boolean>("session.expiredToken", {
		...cookieOptions,
		default: () => false,
	});
	const user = useCookie<(User & Omit<InstanceMember, "user">) | undefined>("session.user", {
		...cookieOptions,
		partitioned: false,
		default: () => undefined,
	});

	// Getters
	/**
	 * User firestore path
	 * Path or empty string if no session is available
	 */
	const path = computed<string>(() => user.value?.id || "");

	// Actions
	function setToken(newToken: string, newExpiredToken = false) {
		token.value = newToken || null;
		expiredToken.value = newExpiredToken;
	}
	function setUser({ createdAt, updatedAt, ...userData }: User, token: string): void {
		user.value = { ...user.value, ...userData };
		setToken(token, false);
	}
	function unsetSession(expiredToken = false): void {
		setToken("", expiredToken);
		user.value = undefined;
	}
	/**
	 * Logout user
	 * @param clientAuth Firebase auth client
	 * @param unsetSessionFn Function to unset session data
	 */
	async function logout(
		clientAuth?: Auth,
		unsetSessionFn: (expiredToken?: boolean) => void = unsetSession
	): Promise<void> {
		if (import.meta.server) return;

		const Swal = useSwal();
		const { value } = await Swal.firePrevent({
			title: "Cerrar sesion",
			text: "¿Esta seguro de querer cerrar sesion?",
		});

		if (value) {
			unsetSessionFn();
			await clientAuth?.signOut();
			window.location.href = "/"; // rdr & reload page
		}
	}
	async function remove(clientAuth?: Auth) {
		if (import.meta.server) return;

		const Swal = useSwal();

		const { value } = await Swal.firePrevent({
			title: "Eliminar cuenta",
			text: "¿Esta seguro de querer eliminar tu cuenta?",
			footer: "Borraremos toda tu información, esta acción no es reversible, aunque puedes volver a registrarte mas tarde",
		});

		const user = clientAuth?.currentUser;

		if (user && value) {
			await deleteUser(user);
			window.location.href = "/"; // rdr & reload page
		}
	}

	return {
		// User
		token: skipHydrate(token),
		expiredToken: skipHydrate(expiredToken),
		user: skipHydrate(user),
		// User getters
		path,
		// User actions
		setUser,
		unsetSession,
		logout,
		remove,
	};
});
