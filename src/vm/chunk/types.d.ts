import { uint8_t } from "../types";
import { ValueArray } from "../value/types";

export declare interface Chunk {
	code: uint8_t;
	constants: ValueArray;
}
