<template>
	<span v-if="node?.user?.documentNumber">
		{{ node?.user?.documentType || "CC" }}. {{ node?.user?.documentNumber }}
	</span>
	<span v-else>-</span>
</template>

<script setup lang="ts">
	import { eIdDocumentType } from "../functions/utils/enums";

	/**
	 * Value user document
	 *
	 * @component
	 */
	defineProps<{
		value: number;
		node?: {
			user?: {
				documentType?: eIdDocumentType;
				documentNumber?: string;
			};
		};
	}>();
</script>
