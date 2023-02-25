import { FREE_ARRAY } from "../memory";
import { Value, ValueArray } from "./types";

/**
 * Used to create a Chunk.
 *
 * @param chunk a Chunk
 */
export function buildValueArray(): ValueArray {
	return {
		values: table.create(8),
	};
}

/**
 * Used to free a Chunk's memory.
 *
 * @param value_array a Chunk
 */
export function freeValueArray(value_array: ValueArray): void {
	FREE_ARRAY(value_array.values);
}

/**
 * Used to write/insert data to a Chunk's code.
 *
 * @param value_array a Chunk
 * @param byte a byte of data
 */
export function writeValueArray(value_array: ValueArray, byte: Value): void {
	value_array.values.push(byte);
}
