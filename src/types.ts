import type { H3Context } from "./runtime/server/types";
import type { FirebaseNuxtPublicRuntimeConfig } from "./runtime/server/utils/environment";

/**
 * Nuxt specific configuration
 */
export interface FirebaseNuxtModuleOptions {
	/** Enable tenants */
	tenants: boolean;
	/**
	 * Whether the current auth is authorized to read the given instance's collection
	 *
	 * @server Runs server side only
	 */
	readInstanceCollection: (collection: string, context: H3Context) => boolean;
	/**
	 * Whether the current auth is authorized to read the given collection
	 *
	 * @server Runs server side only
	 */
	readCollection: (collection: string, context: H3Context) => boolean;
	/**
	 * Whether the current auth is a super user
	 *
	 * @server Runs server side only
	 */
	sudo: (context: H3Context) => boolean;
}

declare module "nuxt/schema" {
	interface PublicRuntimeConfig extends FirebaseNuxtPublicRuntimeConfig {}
}
declare module "@nuxt/schema" {
	interface PublicRuntimeConfig extends FirebaseNuxtPublicRuntimeConfig {}
}
