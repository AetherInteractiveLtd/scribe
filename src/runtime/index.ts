import { MkScribe } from "@aethergames/mkscribe";
import { ScribeEnviroment } from "../types";
import {
	DialogCallbackInput,
	InteractionJob,
	Objective,
	ObjectiveChangeCallbackInput,
	PipeToCallbackInput,
	ScribeProgramProperties,
	ScribeRuntimeImplementation,
} from "./types";
import { TokenLiteral } from "@aethergames/mkscribe/out/mkscribe/scanner/types";
import { ScribeVisitor, StatusInterpretationCode } from "./visitor";

export class Runtime implements ScribeRuntimeImplementation {
	public dialogCallback!: (input: DialogCallbackInput) => void;
	public objectiveChangeCallback!: (input: ObjectiveChangeCallbackInput) => void;
	public pipeTo!: (config: PipeToCallbackInput) => void;

	private interpreter!: ScribeVisitor;

	private interactions: Map<string, InteractionJob> = new Map();
	private interactionsCooldown = 1 / 60;

	constructor(private readonly source: string, private readonly env: ScribeEnviroment) {}

	public start(): StatusInterpretationCode {
		this.interpreter = new ScribeVisitor(
			MkScribe.build(this.source),
			{
				onDialog: this.dialogCallback,
				onStoreChange: this.pipeTo,
				onObjectiveChange: this.objectiveChangeCallback,
			},
			this.env,
		);

		return this.interpreter.interpret();
	}

	public getObjective(objective: string): Objective | undefined {
		return this.interpreter.records.objectives[objective];
	}

	public getCurrentObjective(): Objective | undefined {
		const current = this.interpreter.records.objectives.current;

		if (current !== undefined) {
			return this.interpreter.records.objectives[current];
		}
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

	public setCurrentObjective(objective: string): void {
		this.interpreter.records.objectives.current = objective;
	}

	public play(id: string): void {
		const scene = this.interpreter.records.scenes[id];

		if (scene !== undefined) {
			this.interpreter.resolve(this.interpreter.records.scenes[id]);
		} else {
			throw `Scene specified [${id}] isn't defined on the Scribe's program.`;
		}
	}

	public async interact(id: string): Promise<void> {
		if (this.interactions.has(id) === false) {
			this.interactions.set(id, {
				lastInteraction: 0,
				queue: new Array(),
			});
		}

		// eslint-disable-next-line prefer-const
		let { lastInteraction, queue } = this.interactions.get(id)!;

		const interaction = this.interpreter.records.interactions[id];
		if (os.clock() - lastInteraction > this.interactionsCooldown && queue.size() === 0) {
			lastInteraction = os.clock();

			return this.interpreter.resolve(interaction);
		} else {
			queue.push(interaction);

			// eslint-disable-next-line no-constant-condition
			while (true) {
				if (os.clock() - lastInteraction > this.interactionsCooldown && queue[1] === interaction) {
					return this.interpreter.resolve(interaction);
				} else {
					task.wait();
				}
			}
		}
	}

	public getRecords(): ScribeVisitor["records"] {
		return this.interpreter.records;
	}
}
