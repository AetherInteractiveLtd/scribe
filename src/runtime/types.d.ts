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
};

export declare type PipeToCallbackInput = {
	identifier: string;
	newValue: unknown;
	oldValue?: unknown;
	metadata: ScribeMetadata;
};

export declare type ObjectiveChangeCallbackInput = {
	id: string;
	description: string;
};

export declare type ExitCallbackInput = {
	output: TokenLiteral | undefined;
};

export interface ScribeCallbacks {
	/**
	 * A callback binded to handle dialog.
	 *
	 * @param input DialogCallbackInput (an object containing all of the dialog info)
	 */
	onDialog?: (input: DialogCallbackInput, step: (id?: number) => void) => void;

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
	 */
	onExit?: (input: ExitCallbackInput) => void;

	/**
	 * A callback binded to handle the end execution of the program, when Scribe it is done running.
	 */
	onEndExecution?: (statusCode: StatusInterpretationCode) => void;
}
