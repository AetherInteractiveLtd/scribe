import { ScribeEnviroment } from "../types";
import { Chunk } from "./chunk/types";
import { OpCode } from "./op_codes";
import { uint8 } from "./types";
import { Value } from "./value/types";

enum InterpreterStatusCode {
	SUCCESS,
	ERROR,
	RUNTIME_ERROR,
}

export class ScribeVM {
	private chunk!: Chunk;
	private ip: uint8 = 0;

	// public status_code: InterpreterStatusCode;

	constructor(private readonly source: string, env: ScribeEnviroment) {
		// this.status_code = this.interpret();
	}

	public interpret(chunk: Chunk): InterpreterStatusCode {
		this.chunk = chunk;

		for (;;) {
			let instruction: uint8;

			switch ((instruction = this.read_byte())) {
				case OpCode.OP_CONSTANT: {
					const constant: Value = this.read_constant();
					print(constant);

					break;
				}

				case OpCode.OP_RETURN: {
					return InterpreterStatusCode.SUCCESS;
				}
			}
		}
	}

	private freeze(): void {}

	private cache(): void {}

	private read_byte(): uint8 {
		const byte = this.chunk.code[this.ip];
		this.ip++;

		return byte;
	}

	private read_constant(): Value {
		return this.chunk.constants.values[this.ip];
	}
}
