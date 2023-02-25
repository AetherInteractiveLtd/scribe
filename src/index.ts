import { Runtime } from "./ast-interpreter";
import { ExecutionType, ModuleSource, ScribeEnviroment, StringSource, StringValueSource } from "./types";
import { ScribeVM } from "./vm";

export namespace Scribe {
	export function load<T extends ExecutionType>(
		file: string | StringValue | ModuleScript,
		env: ScribeEnviroment,
		executionType: T,
	): T extends "ast-interpreter" ? Runtime : ScribeVM {
		const toRetrieveFrom = typeOf(file);
		let source!: string;

		switch (toRetrieveFrom) {
			case "Instance": {
				if ((file as Instance).IsA("ModuleScript")) {
					source = (require(file as ModuleScript) as ModuleSource).src;
				} else if ((file as Instance).IsA("StringValue")) {
					source = (file as StringValueSource).Value;
				} else {
					throw `Expected a ModuleScript (with a src field) or a StringValue, no other Instance is accepted.`;
				}

				break;
			}

			default: {
				source = file as StringSource;
			}
		}

		return (executionType === "ast-interpreter" ? new Runtime(source, env) : new ScribeVM(source, env)) as never;
	}
}
