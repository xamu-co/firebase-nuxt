import { createHash } from "node:crypto";
import { type H3Event } from "h3";
import { defineCachedFunction } from "nitropack/runtime";

import type { H3Context } from "../types";
import type { InstanceMember } from "../../client/types";
import { resolveServerRefs } from "./firestore";
import { getServerFirebase } from "./firebase";

/**
 * Get current auth
 *
 * @cache 2 minutes
 */
export const getAuth = defineCachedFunction(
	async function (
		event: H3Event,
		authorization?: string
	): Promise<H3Context["currentAuth"] | undefined> {
		if (!authorization) return;

		const { firebaseAuth } = getServerFirebase("api:getAuth");
		const { currentInstanceRef, currentInstance } = <H3Context>event.context;

		// Instance is required
		if (!currentInstanceRef || !currentInstance) return;

		const membersRef = currentInstanceRef.collection("members");
		const { uid } = await firebaseAuth.verifyIdToken(authorization);
		const snapshot = await membersRef.doc(uid).get();
		const memberData: InstanceMember | undefined = await resolveServerRefs(
			snapshot,
			{ level: 1 },
			false
		);
		const { user, ...member } = memberData || {};

		return { ...user, ...member, uid, id: `${currentInstance.id}/members/${uid}` };
	},
	{
		name: "getAuth",
		maxAge: 60 * 60, // 1 hour
		getKey(_, authorization) {
			if (!authorization) return "guest";

			// Compact hash
			return createHash("sha256").update(authorization).digest("hex");
		},
	}
);
