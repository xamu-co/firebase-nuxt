import type { ClientProvide } from "./runtime/plugins/firebase-setup";
import type { H3Context } from "./runtime/server/types";
import type { FirebaseNuxtPublicRuntimeConfig } from "./runtime/server/utils/environment";

/**
 * Nuxt specific configuration
 */
export interface FirebaseNuxtModuleOptions {
	/** Enable tenants */
	tenants?: boolean;
	/** Enable media */
	media?: boolean;
	/**
	 * Whether the current auth is authorized to read the given instance's collection
	 *
	 * @server Runs server side only
	 */
	readInstanceCollection?: (collection: string, context: H3Context) => boolean;
	/**
	 * Whether the current auth is authorized to read the given collection
	 *
	 * @server Runs server side only
	 */
	readCollection?: (collection: string, context: H3Context) => boolean;
	/**
	 * Whether the current auth is a super user
	 *
	 * @server Runs server side only
	 */
	sudo?: (context: H3Context) => boolean;
}

// Do not use unscoped schema
declare module "@nuxt/schema" {
	interface PublicRuntimeConfig extends FirebaseNuxtPublicRuntimeConfig {}
}

type Decorate<T extends Record<string, any>> = {
	[K in keyof T as K extends string ? `$${K}` : never]: T[K];
};

declare module "#app" {
	interface NuxtApp extends Decorate<ClientProvide> {}
}
