import { Statement } from "@aethergames/mkscribe";
import { TokenLiteral } from "@aethergames/mkscribe/out/mkscribe/scanner/types";
import { StatusInterpretationCode } from "./visitor";

declare type ScribeProperties = "title" | "description";

export declare type ScribeProgramProperties = Record<string | ScribeProperties, TokenLiteral>;

export declare type OptionStructure = {
	text?: TokenLiteral;
	metadata?: TokenLiteral;

	/** @hidden */
	_body: Statement;
};

export declare type DialogCallbackInput = {
	characterIdentifier: string;
	text: TokenLiteral;
	metadata: TokenLiteral;
	options: Array<OptionStructure>;

	step: (id?: number) => void;
};

export declare type PipeToCallbackInput = {
	identifier: string;
	data: unknown;
	metadata: Array<unknown>;
};

export interface ScribeRuntimeImplementation {
	/**
	 * A callback to handle dialog.
	 *
	 * @param input DialogCallbackInput (an object containing all of the dialog info)
	 */
	dialogCallback: (input: DialogCallbackInput, step: (id: number) => void) => void;

	/**
	 * A callback binded to handle store's values changes.
	 *
	 * @param config PipeToCallbackInput (an object containing all of the store's change)
	 * @returns
	 */
	pipeTo: (config: PipeToCallbackInput) => void;

	/**
	 * Starts the Runtime.
	 *
	 * Workflow is to set `pipeTo` and `dialogCallback` before running `.start`.
	 */
	start(): StatusInterpretationCode;

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
