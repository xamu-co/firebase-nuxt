import type { FirebaseOptions } from "firebase/app";
import { defineString, defineBoolean, defineInt } from "firebase-functions/params";

import { eCacheControl } from "../../functions/utils/enums";

/**
 * Public runtime config
 */
export interface FirebaseNuxtPublicRuntimeConfig {
	// App
	appName: string;
	production: boolean;
	forcedInstanceId: string;
	indexable: boolean;
	tenants: boolean;
	// Firebase
	firebaseConfig: Required<Omit<FirebaseOptions, "databaseURL">>;
	recaptchaEnterpriseKey: string;
	debugAppCheck: boolean;
	debugFirebase: boolean;
	// Utils
	cache: {
		none: eCacheControl;
		frequent: eCacheControl;
		normal: eCacheControl;
		midterm: eCacheControl;
		longterm: eCacheControl;
	};
}

const environment = defineString("NODE_ENV", { default: "development" });

// Project
export const port = defineInt("PORT", { default: 3000 }).value() || 3000;
export const production = environment.equals("production").value();
export const indexable = defineBoolean("INDEXABLE", { default: false }).value();
export const origin = defineString("ORIGIN").value();
export const forcedInstanceId = defineString("INSTANCE").value();
export const appName = defineString("APP_NAME").value();

// Debug
export const debugNuxt = !production && defineBoolean("DEBUG_NUXT", { default: false }).value();
export const debugNitro = !production && defineBoolean("DEBUG_NITRO", { default: false }).value();
export const debugCSS = !production && defineBoolean("DEBUG_CSS", { default: false }).value();
export const debugAppCheck =
	!production && defineBoolean("DEBUG_APP_CHECK", { default: false }).value();
export const debugFirebase =
	!production && defineBoolean("DEBUG_FIREBASE", { default: false }).value();

// Firebase
export const storageBucket = defineString("F_STORAGE_BUCKET").value();
// Service account
export const projectId = defineString("F_PROJECT_ID").value();
export const privateKey = defineString("F_PRIVATE_KEY").value();
export const clientEmail = defineString("F_CLIENT_EMAIL").value();
/** App check, public key */
export const recaptchaEnterpriseKey = defineString("RECAPTCHA_ENTERPRISE_SITE_KEY").value();

// Google fonts
export const fontsApiKey = defineString("FONTS_API_KEY").value();

/**
 * Firebase client data
 */
const firebaseConfig: FirebaseNuxtPublicRuntimeConfig["firebaseConfig"] = {
	projectId,
	apiKey: defineString("F_API_KEY").value(),
	authDomain: defineString("F_AUTH_DOMAIN").value(),
	storageBucket,
	messagingSenderId: defineString("F_MESSAGING_SENDER_ID").value(),
	appId: defineString("F_APP_ID").value(),
	measurementId: defineString("F_MEASUREMENT_ID").value(),
};

/**
 * Public runtime config
 */
export const publicRuntimeConfig: FirebaseNuxtPublicRuntimeConfig = {
	// App
	appName,
	production,
	forcedInstanceId,
	indexable,
	// Firebase
	firebaseConfig,
	recaptchaEnterpriseKey,
	debugAppCheck,
	debugFirebase,
	// Utils
	cache: {
		none: eCacheControl.NONE,
		frequent: eCacheControl.FREQUENT,
		normal: eCacheControl.NORMAL,
		midterm: eCacheControl.MIDTERM,
		longterm: eCacheControl.LONGTERM,
	},
	tenants: false,
};
