import type { LogData } from "../../../functions/types";
import type { FromData } from "./base";
import type { GetSharedRef } from "./user";

/** @output Log */
export interface Log extends FromData<LogData> {}
/** @input Omit automation */
export interface LogRef extends GetSharedRef<Log> {}
