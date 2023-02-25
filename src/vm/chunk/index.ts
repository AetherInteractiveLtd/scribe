import { FREE_ARRAY } from "../memory";
import { int, uint8 } from "../types";
import { buildValueArray, freeValueArray, writeValueArray } from "../value";
import { Value } from "../value/types";
import { Chunk } from "./types";

/**
 * Used to create a Chunk.
 *
 * @param chunk a Chunk
 */
export function buildChunk(): Chunk {
	return {
		code: table.create(8),
		constants: buildValueArray(),
	};
}

/**
 * Used to free a Chunk's memory.
 *
 * @param chunk a Chunk
 */
export function freeChunk(chunk: Chunk): void {
	FREE_ARRAY(chunk.code);
	freeValueArray(chunk.constants);
}

/**
 * Used to write/insert data to a Chunk's code.
 *
 * @param chunk a Chunk
 * @param byte a byte of data
 */
export function writeChunk(chunk: Chunk, byte: uint8): void {
	chunk.code.push(byte);
}

/**
 * Used to store/add constants to the ValueArray.
 *
 * @param chunk a Chunk
 * @param value a valid Value type
 */
export function addConstant(chunk: Chunk, value: Value): int {
	writeValueArray(chunk.constants, value);

	return chunk.constants.values.size() - 1;
}
