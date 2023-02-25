import { MkScribe } from "@aether-interactive-ltd/mkscribe";
import { ScribeEnviroment } from "../types";
import {
	DialogCallbackInput,
	PipeToCallbackInput,
	ScribeProgramProperties,
	ScribeRuntimeImplementation,
} from "./types";
import { TokenLiteral } from "@aether-interactive-ltd/mkscribe/out/mkscribe/scanner/types";
import { ScribeVisitor, StatusInterpretationCode } from "./visitor";

export class Runtime implements ScribeRuntimeImplementation {
	public dialogCallback!: (input: DialogCallbackInput) => void;
	public pipeTo!: (config: PipeToCallbackInput) => void;

	private interpreter!: ScribeVisitor;

	constructor(private readonly source: string, private readonly env: ScribeEnviroment) {}

	public start(): StatusInterpretationCode {
		this.interpreter = new ScribeVisitor(
			MkScribe.build(this.source),
			{
				dialog: this.dialogCallback,
				storeChange: this.pipeTo,
			},
			this.env,
		);

		return this.interpreter.interpret();
	}

	public getObjective(objective: string): TokenLiteral {
		return this.interpreter.records.objectives[objective];
	}

	public getProperty(property: string): TokenLiteral {
		return this.interpreter.programProperties[property];
	}

	public getProperties(): ScribeProgramProperties {
		return this.interpreter.programProperties;
	}

	public incrementStore(valueTo: string, increment: number): void {
		let head = this.interpreter.refs[valueTo];

		while (head !== undefined) {
			const { ref } = head;

			if (typeOf(this.interpreter.records.stores[ref][0]) === "number") {
				(this.interpreter.records.stores[ref][0] as number) += increment;
			} else {
				warn(`[Interpreter:incrementValue]: ${ref} isn't of type number, it can't be incremented.`);
			}

			head = head._next;
		}
	}

	public setStore(valueTo: string, value: unknown): void {
		let head = this.interpreter.refs[valueTo];

		while (head !== undefined) {
			this.interpreter.records.stores[head.ref][0] = value as TokenLiteral;

			head = head._next;
		}
	}

	public setCurrentObjective(objective: string): void {}

	public play(scene: string): void {}

	public interact(id: string): void {
		return this.interpreter.records.interactions[id].accept(this.interpreter);
	}
}
