import {
	defineNuxtModule,
	addPlugin,
	createResolver,
	addImportsDir,
	addComponentsDir,
	addServerHandler,
	addServerTemplate,
} from "@nuxt/kit";

import type { FirebaseNuxtModuleOptions } from "./types";
import { locale } from "./runtime/client/utils/locale";
import {
	debugNuxt,
	publicRuntimeConfig,
	port,
	csurfSecret,
} from "./runtime/server/utils/environment";

/**
 * Nuxt module for @open-xamu-co/firebase-nuxt
 */
export default defineNuxtModule<FirebaseNuxtModuleOptions>({
	meta: {
		name: "@open-xamu-co/firebase-nuxt",
		configKey: "firebaseNuxt",
		compatibility: { nuxt: "^3.0.0" },
	},
	async setup(moduleOptions, nuxt) {
		const { resolve } = createResolver(import.meta.url);
		const runtimePath = resolve("./runtime");

		const firebaseDeps: string[] = [
			"firebase",
			"firebase/app",
			"firebase/auth",
			"firebase/app-check",
			"firebase/firestore",
			"firebase/analytics",
		];

		// Update nuxt options
		nuxt.options.devtools.enabled = debugNuxt;
		nuxt.options.devtools.timeline = { enabled: debugNuxt };
		nuxt.options.experimental.asyncContext = true;
		nuxt.options.experimental.viewTransition = true;
		nuxt.options.nitro.compressPublicAssets = true;

		// Prevent optimization
		nuxt.options.vite.optimizeDeps = {
			...nuxt.options.vite.optimizeDeps,
			exclude: [
				...(nuxt.options.vite.optimizeDeps?.exclude || []),
				...firebaseDeps,
				// Server imports
				"nitropack/runtime",
			],
		};

		// Dedupe deps
		nuxt.options.vite.resolve = {
			...nuxt.options.vite.resolve,
			dedupe: [
				...(nuxt.options.vite.resolve?.dedupe || []),
				...firebaseDeps,
				// Pinia store
				"pinia",
			],
		};

		// Expose dev server
		if (debugNuxt) {
			nuxt.options.devServer = { ...nuxt.options.devServer, host: "0.0.0.0", port };
		}

		// Set runtime config
		nuxt.options.runtimeConfig.public = {
			...nuxt.options.runtimeConfig.public,
			...publicRuntimeConfig,
			tenants: moduleOptions.tenants, // Globally available
		};

		// Register plugins (Manually)
		addPlugin(resolve(runtimePath, "plugins/scrollBehavior.client"));
		addPlugin(resolve(runtimePath, "plugins/firebase-setup"));
		addPlugin(resolve(runtimePath, "plugins/loaded.client"));

		// Register composables (Auto import)
		addImportsDir(resolve(runtimePath, "composables"));

		// Register components (Auto import)
		addComponentsDir({ path: resolve(runtimePath, "components") });

		// Register public assets
		nuxt.hook("nitro:config", (nitroConfig) => {
			nitroConfig.publicAssets ||= [];
			nitroConfig.publicAssets.push({
				dir: resolve(runtimePath, "public"),
				maxAge: 60 * 60 * 24 * 365, // 1 year
			});
		});

		// Register server virtual templates
		// Since functions are not serializable, we need to use a virtual template
		addServerTemplate({
			filename: "#internal/firebase-nuxt",
			getContents: () => `
				export const readInstanceCollection = ${moduleOptions.readInstanceCollection?.toString() || "() => false"};
				export const readCollection = ${moduleOptions.readCollection?.toString() || "() => false"};
				export const sudo = ${moduleOptions.sudo?.toString() || "() => false"};
			`,
		});

		// Register server middlewares
		addServerHandler({
			middleware: true,
			handler: resolve(runtimePath, "server/middleware/0.hotlinking"),
		});
		addServerHandler({
			middleware: true,
			handler: resolve(runtimePath, "server/middleware/1.context"),
		});

		// Register server handlers, media
		// @see https://github.com/nuxt/nuxt/issues/34044#issuecomment-3735519341
		if (moduleOptions.media) {
			addServerHandler({
				method: "get",
				route: "/api/media/**:path",
				handler: resolve(runtimePath, "server/api/media.get"),
			});
		}

		// Register server handlers, global
		addServerHandler({
			method: "get",
			route: "/api/all/:collectionId",
			handler: resolve(runtimePath, "server/api/all-collection.get"),
		});
		addServerHandler({
			method: "get",
			route: "/api/all/:collectionId/:documentId",
			handler: resolve(runtimePath, "server/api/all-collection-document.get"),
		});

		// Register server handlers, instance
		addServerHandler({
			method: "get",
			route: "/api/instance/all/:collectionId",
			handler: resolve(runtimePath, "server/api/all-collection.get"),
		});
		addServerHandler({
			method: "get",
			route: "/api/instance/all/:collectionId/:documentId",
			handler: resolve(runtimePath, "server/api/all-collection-document.get"),
		});
	},
	moduleDependencies() {
		const { resolve } = createResolver(import.meta.url);
		const runtimePath = resolve("./runtime");

		return {
			"nuxt-csurf": {
				version: ">=1.6.5",
				defaults: {
					addCsrfTokenToEventCtx: true, // Run server side
					encryptSecret: csurfSecret,
				},
			},
			"@open-xamu-co/ui-nuxt": {
				version: ">=4.0.0-next.4",
				defaults: {
					locale,
					lang: "es",
					country: "CO",
					imageHosts: ["lh3.googleusercontent.com"],
					imagePlaceholder: "/sample-missing.png",
				},
			},
			"@nuxt/image": {
				version: ">=1.0.0",
				defaults: {
					provider: "firebase",
					domains: ["firebasestorage.googleapis.com"],
					providers: {
						firebase: { provider: resolve(runtimePath, "providers/firebase") },
					},
				},
			},
			"@pinia/nuxt": {
				version: ">=0.11.0",
			},
		};
	},
});
