import { toRaw } from "vue";
import { collection, doc, DocumentReference, getDoc, increment, setDoc } from "firebase/firestore";
import { getToken } from "firebase/app-check";

import { getDocumentId } from "../client/utils/resolver";
import useAppLogger from "./useAppLogger";

import {
	useNuxtApp,
	useAppStore,
	useInstanceStore,
	useSessionStore,
	useRuntimeConfig,
} from "#imports";

interface UploadOptions {
	type?: "images";
	customMetadata?: Record<string, any>;
	/**
	 * File upload callback
	 *
	 * Runs if not all files were uploaded
	 */
	uploaded?: (paths: string[]) => any;
}

/**
 * upload files, get urls
 *
 * Files should not bother with instances
 */
export default async function useFilesUpload(
	files: File[] = [],
	targetRef: DocumentReference, // Document related to the files
	options: UploadOptions = {}
): Promise<string[]> {
	const APP = useAppStore();
	const SESSION = useSessionStore();
	const INSTANCE = useInstanceStore();
	const { $clientFirestore, $clientAppCheck } = useNuxtApp();
	const { firebaseConfig } = useRuntimeConfig().public;
	const appData = toRaw(firebaseConfig);
	// Upload options
	const { type = "images", customMetadata = {}, uploaded } = options;

	if (!SESSION.token || !$clientFirestore || !$clientAppCheck) {
		throw new Error("Subida no autorizada");
	}

	// Save author
	const memberId = getDocumentId(SESSION.path);
	const memberPath = `${INSTANCE.id}/members/${memberId}`;
	const updatedByRef = memberId ? doc($clientFirestore, memberPath) : undefined;
	// Keep count
	const parentCollection = targetRef.parent;
	const grandParentDocument = parentCollection.parent;
	const counterPath = grandParentDocument?.path || INSTANCE.id; // Prefer subcollection
	const countersCollectionRef = collection($clientFirestore, `${counterPath}/counters`);
	// Document associated file counter
	const counterId = `${type}_${parentCollection.id}_${targetRef.id}`;
	const counterRef = doc(countersCollectionRef, counterId);
	const counterSnapshot = await getDoc(counterRef);
	const { current = 0, createdByRef = updatedByRef } = counterSnapshot.data() || {};
	// App check token
	const { token: appCheckToken } = await getToken($clientAppCheck);

	try {
		// Increase counter in db, do not await
		setDoc(
			counterRef,
			{ current: increment(files.length), createdByRef, updatedByRef },
			{ merge: true }
		);
	} catch (err) {
		// Log counter update error
		useAppLogger("composables:files:useFilesUpload:counter", counterRef.path, err);
	}

	// Upload tracking
	const paths: string[] = [];

	for (let index = 0; index < files.length; index++) {
		const file = files[index];
		const path = `${targetRef.path}_${current + index + 1}`;
		const filePath = `${type}/${path}/original.${file.type.split("/")[1]}`;
		const id = `${targetRef.id}_${file.name}`;

		if (!file.size) {
			// Invalid file
			useAppLogger("composables:files:useFilesUpload:map", new Error("Invalid file"), {
				path,
				size: file.size,
				type: file.type,
				name: file.name,
				lastModified: file.lastModified,
			});

			continue;
		}

		paths.push(path);
		// Save thumbnail as fallback for upload
		await APP.saveThumbnail(path, file);

		// Upload file, set queue for the user, do not await
		APP.useQueue(
			id,
			`Subiendo archivo`,
			async () => {
				try {
					const worker = new Worker("/js/file-upload.js", { type: "module" });
					const uploadedSize = await new Promise<number>((resolve, reject) => {
						// Start background file upload
						worker.postMessage({
							filePath,
							file,
							customMetadata: { filePath, memberPath, ...customMetadata },
							appData,
							appCheckToken,
						});
						// Get result
						worker.onmessage = ({ data }) => {
							const { result, error, message, type } = data;

							switch (type) {
								case "result":
									resolve(result);
									break;
								case "message":
									console.log(message);
									break;
								case "error":
									// Crash if upload error
									console.log(message, error);
									reject(error);
									break;
							}
						};
						// Handle worker errors
						worker.onerror = (err) => reject(err);
						worker.onmessageerror = (err) => reject(err);
					});

					// Expected file size
					if (!uploadedSize) throw `No se subió el archivo ${id}`;

					// Wait for processing (image resizing), 10 seconds
					await new Promise((resolve) => setTimeout(resolve, 1000 * 10));

					return `Archivo subido (${(uploadedSize / 1000000).toFixed(2)}MB)`;
				} catch (err) {
					// Couldn't upload file
					paths.splice(paths.indexOf(path), 1); // Mutate paths
					uploaded?.(paths); // Update db callback
					useAppLogger("composables:files:useFilesUpload:upload", path, err);

					throw `No se subió el archivo ${id}`;
				}
			},
			10 // Minutes per upload
		);
	}

	// Return tentative paths
	return paths;
}
