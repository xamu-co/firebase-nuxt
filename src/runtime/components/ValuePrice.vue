<template>
	<span>{{ price.formattedPrice }}</span>
</template>

<script setup lang="ts">
	import { computed } from "vue";

	import { usePrice } from "#imports";

	/**
	 * Value price
	 *
	 * @component
	 */
	const props = defineProps<{ value: number }>();

	const price = computed(() => usePrice({ price: props.value }));
</script>
