import { Runtime } from "./runtime";
import { ModuleSource, ScribeEnviroment, StringSource, StringValueSource } from "./types";

export namespace Scribe {
	export function load(file: string | StringValue | ModuleScript, env: ScribeEnviroment): Runtime {
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

		return new Runtime(source, env);
	}
}

export { StatusInterpretationCode } from "./runtime/visitor";
