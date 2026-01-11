import { debounce } from "lodash-es";
import {
	browserLocalPersistence,
	setPersistence,
	GoogleAuthProvider,
	signInWithPopup,
	signInWithRedirect,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { ref } from "vue";

import { useSwal } from "@open-xamu-co/ui-common-helpers";

import { useAppLogger, useNuxtApp, useRouter, useRoute } from "#imports";

export function useGoogleAuth(defaultRdrPath = "/") {
	const { $clientAuth } = useNuxtApp();
	const Swal = useSwal();

	const loading = ref(false);

	const loginWithGoogle = debounce(async (): Promise<void> => {
		const router = useRouter();
		const route = useRoute();
		const { restricted } = route.query;

		loading.value = true;

		try {
			if (!$clientAuth) throw new Error("Missing auth");

			const googleProvider = new GoogleAuthProvider();

			// Do not assume account
			// see: https://developers.google.com/identity/openid-connect/openid-connect?hl=es-419#authenticationuriparameters
			googleProvider.setCustomParameters({ prompt: "select_account" });

			await setPersistence($clientAuth, browserLocalPersistence);

			try {
				// Attempt sign with popup
				await signInWithPopup($clientAuth, googleProvider);
			} catch (err) {
				// Not popup blocked, throw error
				if (!(err instanceof FirebaseError) || err.code !== "auth/popup-blocked") throw err;

				// Attemp sign with redirect instead
				await signInWithRedirect($clientAuth, googleProvider);
			}

			// rdr, Restricted rdr handled by plugin
			if (!restricted) router.push({ path: defaultRdrPath });
		} catch (err) {
			Swal.fire({
				title: "¡Algo sucedió!",
				text: "Ocurrió un error mientras iniciabas sesión",
				icon: "error",
			});
			useAppLogger("composables:useGoogleAuth", err);
		}

		loading.value = false;
	});

	return { loading, loginWithGoogle };
}
