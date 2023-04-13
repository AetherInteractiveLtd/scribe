import { Statement } from "@aethergames/mkscribe";
import { TokenLiteral } from "@aethergames/mkscribe/out/mkscribe/scanner/types";
import { StatusInterpretationCode } from "./visitor";

export declare type ScribeMetadata = Array<unknown>;

export declare type InteractionJob = {
	lastInteraction: number;
	queue: Array<Statement>;
};

export declare type ScribeProperties = "title" | "description";

export declare type Objective = {
	id: number;
	name: string;
	desc: string;
	active: boolean;
};

export declare type ScribeProgramProperties = Record<string | ScribeProperties, TokenLiteral>;

export declare type OptionStructure = {
	text?: TokenLiteral;
	metadata?: ScribeMetadata;

	/** @hidden */
	_body: Statement;
};

export declare type DialogCallbackInput = {
	characterIdentifier: string;
	text: TokenLiteral;
	metadata: ScribeMetadata;
	options: Array<OptionStructure>;

	step: (id?: number) => void;
};

export declare type PipeToCallbackInput = {
	identifier: string;
	data: unknown;
	metadata: ScribeMetadata;
};

export declare type ObjectiveChangeCallbackInput = {
	id: string;
	description: string;
};

export declare type ExitCallbackInput = {
	output: TokenLiteral | undefined;
};

export interface ScribeRuntimeImplementation {
	/**
	 * A callback to handle dialog.
	 *
	 * @param input DialogCallbackInput (an object containing all of the dialog info)
	 */
	onDialog?: (input: DialogCallbackInput, step: (id: number) => void) => void;

	/**
	 * A callback binded to handle store's values changes.
	 *
	 * @param config PipeToCallbackInput (an object containing all of the store's change)
	 */
	onChange?: (config: PipeToCallbackInput) => void;

	/**
	 * A callback binded to handle objective changes.
	 *
	 * @param input ObjectiveChangeCallbackInput (an object containing the newest objective)
	 */
	onObjectiveChange?: (input: ObjectiveChangeCallbackInput) => void;

	/**
	 * A callback binded to handle the exit of the program and return an optional output given from
	 * the Scribe program.
	 *
	 * @param input ExitCallbackInput (an object containing the optional output of the program)
	 * @returns
	 */
	onExit?: (input: ExitCallbackInput) => void;

	onEndExecution?: () => void;

	/**
	 * Starts the Runtime.
	 *
	 * Workflow is to set `pipeTo` and `dialogCallback` before running `.start`.
	 */
	start(): StatusInterpretationCode;

	getObjective(objective: string): Objective | undefined;

	/**
	 *
	 */
	getCurrentObjective(): Objective | undefined;

	/**
	 * Retrieve's a property's value.
	 *
	 * @param property string
	 */
	getProperty(property: string): TokenLiteral;

	/**
	 * @returns all the Program properties.
	 */
	getProperties(): ScribeProgramProperties;

	/**
	 * Method to increment a store's value.
	 *
	 * @param valueTo string
	 * @param increment number
	 */
	incrementStore(valueTo: string, increment: number): void;

	/**
	 * Method to set a store's value.
	 *
	 * @param valueTo string
	 * @param value unknown
	 */
	setStore(valueTo: string, value: unknown): void;

	/**
	 * Sets the current objective, another util function.
	 *
	 * @param objective string
	 */
	setCurrentObjective(objective: string): void;

	/**
	 * Resolves a scene by "playing" it.
	 *
	 * @param scene string
	 */
	play(scene: string): void;

	/**
	 * Initialises an interaction statement.
	 *
	 * @param id actor's id.
	 */
	interact(id: string): void;
}
