<template>
	<Body class="--minHeight-full flx --flx-center">
		<main id="appex" class="flx --flxColumn --flx-center-start">
			<div class="view --width-100">
				<div class="view-item">
					<XamuLoaderContent
						:loading="loading"
						class="holder flx --flxColumn --flx-center-start --gap-30"
						label="Signing in..."
						content
					>
						<div class="txt --txtColor --gap-30">
							<div>
								<h1>Firebase Nuxt</h1>
								<p>Module playground</p>
							</div>
							<div>
								<p><b>Test your vue components here</b></p>
								<p class="--txtSize-sm --txtColor-dark5">
									Also please remember to not version anything within this
									playground
								</p>
							</div>
						</div>
						<XamuActionButtonLink
							v-if="!SESSION.user"
							:size="eSizes.LG"
							:theme="[eColors.DANGER, eColors.LIGHT]"
							link-button
							@click.prevent="loginWithGoogle"
						>
							<XamuIconFa name="google" brand :size="20" />
							<span>Login with Google</span>
						</XamuActionButtonLink>
						<XamuDropdown
							v-else-if="$clientAuth || SESSION.token"
							:position="['bottom', 'center']"
							class="flx --flxColumn --flx-center-start"
							invert-theme
						>
							<template #toggle="{ setModel }">
								<h2>
									<XamuActionLink :size="eSizes.LG" @click="setModel()">
										<span>Hi {{ SESSION.user.name }}</span>
										<XamuIconFa name="chevron-down" :size="10" indicator />
									</XamuActionLink>
								</h2>
							</template>
							<template #default="{ setModel }">
								<nav
									class="list flx --flxColumn --gap-20 --minWidth-220 --minWidth-180:md --maxWidth-100 --txtColor"
								>
									<ul class="list-group">
										<li>
											<p
												class="--txtSize-xs --txtWrap-nowrap --txtTransform-upper"
											>
												Cuenta
											</p>
										</li>
										<hr />
										<li>
											<XamuActionLink
												:theme="eColors.DANGER"
												@click.prevent="() => logout(setModel)"
											>
												<XamuIconFa name="power-off" />
												<span>Logout</span>
											</XamuActionLink>
										</li>
									</ul>
								</nav>
							</template>
						</XamuDropdown>
						<XamuBoxMessage
							v-else
							:theme="eColors.DANGER"
							text="Missing firebase credentials"
							class="--width-100"
						/>
					</XamuLoaderContent>
				</div>
			</div>
		</main>
	</Body>
</template>

<script setup lang="ts">
	import { eColors, eSizes } from "@open-xamu-co/ui-common-enums";

	import { useGoogleAuth, useNuxtApp, useSessionStore } from "#imports";

	const SESSION = useSessionStore();
	const { $clientAuth } = useNuxtApp();
	const { loading, loginWithGoogle } = useGoogleAuth();

	/**
	 * Logout and close modal
	 */
	function logout(toggleModal?: (v?: boolean) => void) {
		toggleModal?.(false);
		SESSION.logout($clientAuth);
	}
</script>

<style>
	#appex {
		min-height: 100%;
		display: flex;
		flex-flow: column nowrap;
		justify-content: center;
		align-items: center;
		width: 100%;
	}
</style>
