import type { DocumentReference } from "firebase/firestore";
import type { LogData, OffenderData } from "../../../functions/types";
import type { FromData } from "./base";
import type { GetSharedRef } from "./user";

/** @output Log */
export interface Log extends FromData<LogData> {}
/** @input Omit automation */
export interface LogRef extends GetSharedRef<Log> {}

/** @output Offender */
export interface Offender extends FromData<OffenderData> {
	lastLog?: Log;
}
/** @input Omit automation */
export interface OffenderRef extends GetSharedRef<Offender> {
	lastLogRef?: DocumentReference<LogData>;
}
