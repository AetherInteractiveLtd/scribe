import { MkScribe } from "@aethergames/mkscribe";
import { ScribeEnviroment } from "../types";
import {
	DialogCallbackInput,
	ExitCallbackInput,
	InteractionJob,
	Objective,
	ObjectiveChangeCallbackInput,
	PipeToCallbackInput,
	ScribeProgramProperties,
	ScribeProperties,
	ScribeCallbacks,
} from "./types";
import { TokenLiteral } from "@aethergames/mkscribe/out/mkscribe/scanner/types";
import { ScribeVisitor, StatusInterpretationCode } from "./visitor";

export class Runtime implements ScribeCallbacks {
	public onDialog?: (input: DialogCallbackInput, step: (id?: number) => void) => void;
	public onObjectiveChange?: (input: ObjectiveChangeCallbackInput) => void;
	public onChange?: (config: PipeToCallbackInput) => void;
	public onExit?: (input: ExitCallbackInput) => void;
	public onEndExecution?: (statusCode: StatusInterpretationCode) => void;

	private readonly interpreter: ScribeVisitor;
	private records: ScribeVisitor["records"];

	private interactions: Map<string, InteractionJob> = new Map();
	private interactionsCooldown = 1 / 60;

	constructor(public readonly source: string, public readonly env: ScribeEnviroment) {
		this.interpreter = new ScribeVisitor(
			MkScribe.build(source),
			{
				onDialog: this.onDialog,
				onChange: this.onChange,
				onObjectiveChange: this.onObjectiveChange,
				onExit: this.onExit,
				onEndExecution: this.onEndExecution,
			},
			env,
		);

		this.records = this.interpreter.records;
	}

	/**
	 *
	 */
	public start(): StatusInterpretationCode {
		return this.interpreter.interpret();
	}

	/**
	 * Retrieves an objective's data and metadata.
	 *
	 * @param objective an objectives identifier.
	 */
	public getObjective(objective: string): Objective | undefined {
		return this.interpreter.records.objectives[objective];
	}

	/**
	 * Retrieves current objective (active).
	 */
	public getCurrentObjective(): Objective | undefined {
		const current = this.interpreter.records.objectives.current;

		if (current !== undefined) {
			return this.interpreter.records.objectives[current];
		}
	}

	/**
	 * Sets an objective to the current active one within Scribe.
	 *
	 * @param objective the objective to set to.
	 */
	public setCurrentObjective(objective: string): void {
		const objct = this.interpreter.records.objectives[objective];

		if (objct !== undefined) {
			this.interpreter.records.objectives.current = objective;
		} else {
			throw `Can't set ${objective} to current active objective, because it doesn't exists within the Scribe Program.`;
		}

		return undefined;
	}

	/**
	 * Retrieve's a property's value.
	 *
	 * @param property property's identifier.
	 */
	public getProperty(property: string | ScribeProperties): TokenLiteral {
		return this.interpreter.programProperties[property];
	}

	/**
	 * @returns all the Program properties.
	 */
	public getProperties(): ScribeProgramProperties {
		return this.interpreter.programProperties;
	}

	/**
	 * It retrieves current interactions, actors, stores, etc. which is defined within the Scribe's Program.
	 */
	public getRecords(): ScribeVisitor["records"] {
		return this.records;
	}

	/**
	 * Increments an store's value.
	 *
	 * @param ref the reference, may be an store's identifier or the Linking Reference.
	 * @param increment value of increment.
	 */
	public incrementStore(ref: string, increment: number): void {
		if (typeIs(increment, "number")) throw `Increment value given seems to not be of type number, can't increment.`;

		if (this.records.stores[ref] !== undefined) {
			const [refValue, refMetadata] = this.records.stores[ref];

			if (type(refValue) !== "number") {
				throw `Can't increment [${ref}] since it is not of type number.`;
			}

			const incr = refValue + increment;
			const data = [incr, refMetadata] as never;

			this.records.stores[ref] = data;
			this.notifyChange(ref, {
				identifier: ref,
				metadata: refMetadata as Array<unknown>,
				newValue: incr,
				oldValue: refValue,
			});
		} else {
			let head = this.interpreter.refs[ref];
			if (head === undefined) throw `Reference given doesn't seem to be an store, nor a Linking Reference.`;

			while (head) {
				const ref = head.ref;
				const [refValue, refMetadata] = this.records.stores[ref];

				if (type(refValue)) {
					throw `Can't increment [${ref}] since it is not of type number.`;
				}

				const incr = refValue + increment;
				const data = [incr, refMetadata] as never;

				this.records.stores[ref] = data;
				this.notifyChange(ref, {
					identifier: ref,
					metadata: refMetadata as Array<unknown>,
					newValue: incr,
					oldValue: refValue,
				});

				head = head._next;
			}
		}
	}

	/**
	 * Sets an store's value to the value specified (overrides it).
	 *
	 * @param ref the reference, may be an store's identifier or the Linking Reference.
	 * @param value an override value.
	 */
	public setStore(ref: string, value: unknown): void {
		if (this.records.stores[ref] !== undefined) {
			const [, refMetadata] = this.records.stores[ref];
			const data = [value, refMetadata] as never;

			this.records.stores[ref] = data;
			this.notifyChange(ref, {
				identifier: ref,
				metadata: refMetadata as Array<unknown>,
				newValue: data,
				oldValue: value,
			});
		} else {
			let head = this.interpreter.refs[ref];
			if (head === undefined) throw `Reference given doesn't seem to be an store, nor a Linking Reference.`;

			while (head) {
				ref = head.ref;

				const [, refMetadata] = this.records.stores[ref];
				const data = [value, refMetadata] as never;

				this.records.stores[ref] = data;
				this.notifyChange(ref, {
					identifier: ref,
					metadata: refMetadata as Array<unknown>,
					newValue: data,
					oldValue: value,
				});

				head = head._next;
			}
		}
	}

	/**
	 * Plays a scene, which is specified by the scene's identifier specified.
	 *
	 * @param ref scene's identifier.
	 */
	public play(ref: string): void {
		const scene = this.interpreter.records.scenes[ref];

		if (scene !== undefined) {
			this.interpreter.resolve(this.interpreter.records.scenes[ref]);
		} else {
			throw `Scene specified [${ref ?? "UNDEFINED"}] isn't defined on the Scribe's program.`;
		}
	}

	/**
	 * Triggers an interaction with the actor specified.
	 *
	 * @param actor actor's id.
	 */
	public interact(actor: string) {
		const interaction = this.interpreter.records.interactions[actor];
		if (interaction === undefined) throw `Actor specified [${actor}] isn't defined within the Scribe's program.`;

		if (!this.interactions.has(actor)) {
			this.interactions.set(actor, {
				lastInteraction: 0,
				queue: new Array(),
			});
		}

		// eslint-disable-next-line prefer-const
		let { lastInteraction, queue } = this.interactions.get(actor)!;

		if (os.clock() - lastInteraction > this.interactionsCooldown && queue.size() === 0) {
			lastInteraction = os.clock();

			return this.interpreter.resolve(interaction);
		} else {
			queue.push(interaction);

			while (interaction) {
				if (os.clock() - lastInteraction > this.interactionsCooldown && queue[1] === interaction) {
					return this.interpreter.resolve(interaction);
				} else {
					task.wait();
				}
			}
		}
	}

	/**
	 * Notifies a change to Scribe and to the API.
	 *
	 * @param ref reference.
	 * @param changeData all data needed for invoking an OnChange callback.
	 */
	private notifyChange(ref: string, changeData: PipeToCallbackInput): void {
		this.interpreter.tracker.notify(ref);

		return this.onChange?.(changeData);
	}
}
