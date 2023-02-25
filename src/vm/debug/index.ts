import { Chunk } from "../chunk/types";
import { OpCode } from "../op_codes";
import { int, uint8 } from "../types";

function formatInstruction(name: string, offset: int): int {
	print(`| ${"%04d".format(offset)} ${name}\n`);

	return offset + 1;
}

function disasembleInstruction(chunk: Chunk, offset: int): int {
	const instruction: uint8 = chunk.code[offset];

	switch (instruction) {
		case OpCode.OP_RETURN: {
			return formatInstruction("OP_RETURN", offset);
		}

		case OpCode.OP_ADD: {
			return formatInstruction("OP_ADD", offset);
		}

		default: {
			return offset + 1;
		}
	}
}

export function disassembleChunk(chunk: Chunk, name: string): void {
	print(`Disassembling ${name}\n`);

	for (let offset = 0; offset < chunk.code.size(); ) {
		offset = disasembleInstruction(chunk, offset);
	}
}
