import type { tLogger } from "@open-xamu-co/ui-common-types";

import { makeLogger } from "../client/utils/logger";

import { useInstanceStore, useSessionStore } from "#imports";

export default async function useAppLogger(...args: Parameters<tLogger>) {
	const INSTANCE = useInstanceStore();
	const SESSION = useSessionStore();
	const logger = makeLogger({ instanceId: INSTANCE.id, authId: SESSION.path });

	return logger(...args);
}
