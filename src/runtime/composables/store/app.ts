import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { getBase64FromImageFile } from "@open-xamu-co/ui-common-helpers";

import { TimedPromise } from "../../server/utils/guards";

import { useState } from "#imports";

interface Queue {
	id: string;
	message: string;
	completed: boolean;
}

interface QueueData<T> {
	data?: T;
	message: string;
}

/**
 * App store
 * Handle app state
 *
 * @state
 */
export const useAppStore = defineStore("app", () => {
	// State
	/**
	 * Queue of tasks
	 *
	 * The user should be able to keep track of background tasks
	 */
	const queue = useState<Queue[]>("app.queue", () => []);
	/**
	 * Thumbs of images
	 *
	 * @cache Session only, fallback for file upload
	 */
	const thumbnails = ref<Record<string, string>>({});
	const tvMQRange = useState<boolean>("app.tvMQRange", () => false);
	const laptopMQRange = useState<boolean>("app.laptopMQRange", () => false);
	const tabletMQRange = useState<boolean>("app.tabletMQRange", () => false);
	const mobileMQRange = useState<boolean>("app.mobileMQRange", () => false);
	const smartwatchMQRange = useState<boolean>("app.smartwatchMQRange", () => false);

	// Getters
	const activeQueue = computed(() => queue.value.filter((item) => !item.completed));

	// Actions
	/**
	 * Runs tasks in the background and displays a queue
	 * @param id Unique identifier of the task
	 * @param message Message to display
	 * @param toQueue Task to await
	 * @param minutes Max amount of minutes to wait
	 * @returns
	 */
	async function useQueue<T>(
		id: string,
		message: string,
		toQueue: () => Promise<string | { data: T; message: string }>,
		minutes = 5 // 5 minutes
	): Promise<{ error?: Error; data?: T }> {
		let error: Error | undefined;
		let data: T | undefined;

		try {
			// New queue item
			queue.value.push({ id, message, completed: false });
			// Limit queue time
			data = await TimedPromise(
				async (resolve) => {
					// Mark task as completed once it resolves
					const message = await toQueue();
					const queued: QueueData<T> =
						typeof message === "string" ? { message } : message;
					const index = queue.value.findIndex((item) => item.id === id);

					if (queue.value[index]) {
						queue.value[index].message = queued.message;
						queue.value[index].completed = true;
					}

					// Return resolved data if any
					resolve(queued.data);
				},
				{ timeout: 1000 * 60 * minutes }
			);
		} catch (err) {
			// Display error if queue is still active
			error = err instanceof Error ? err : new Error("Hubo un error");

			const index = queue.value.findIndex((item) => item.id === id);

			if (queue.value[index]) {
				queue.value[index].message = error.message;
				queue.value[index].completed = true;
			}
		}

		// Remove from queue after 1 minute
		setTimeout(() => {
			queue.value = queue.value.filter((item) => item.id !== id);
		}, 1000 * 60);

		// Crash if any (Handle errors outside of task)
		return { error, data };
	}
	function clearQueue() {
		queue.value = [];
	}
	function setTvMQRange(newValue: boolean) {
		tvMQRange.value = newValue;
	}
	function setLaptopMQRange(newValue: boolean) {
		laptopMQRange.value = newValue;
	}
	function setTabletMQRange(newValue: boolean) {
		tabletMQRange.value = newValue;
	}
	function setMobileMQRange(newValue: boolean) {
		mobileMQRange.value = newValue;
	}
	function setSmartwatchMQRange(newValue: boolean) {
		smartwatchMQRange.value = newValue;
	}
	async function saveThumbnail(path: string, file: File) {
		const thumb = await getBase64FromImageFile(file);

		thumbnails.value[path] = thumb;
	}

	const store = {
		// App, refs
		queue,
		thumbnails,
		tvMQRange,
		laptopMQRange,
		tabletMQRange,
		mobileMQRange,
		smartwatchMQRange,
		// App, computed
		activeQueue,
		// App, actions
		useQueue,
		clearQueue,
		setTvMQRange,
		setLaptopMQRange,
		setTabletMQRange,
		setMobileMQRange,
		setSmartwatchMQRange,
		saveThumbnail,
	};

	return store;
});
