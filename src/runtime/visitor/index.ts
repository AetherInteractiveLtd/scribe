import { ExpressionType, StatementType, TokenType } from "@aethergames/mkscribe";
import {
	ExpressionStatement,
	ActorStatement,
	ObjectiveStatement,
	StoreStatement,
	SetStatement,
	BlockStatement,
	DialogueStatement,
	ConditionStatement,
	IfStatement,
	SceneStatement,
	OptionStatement,
	TriggerStatement,
	BinaryExpression,
	UnaryExpression,
	TernaryExpression,
	VariableExpression,
	EnvironmentAccessor,
	LiteralExpression,
	GroupingExpression,
	MetadataExpression,
	StartExpression,
	Statement,
	Expression,
	PropertyStatement,
	InteractStatement,
	ArrayExpression,
	DoStatement,
	ExitExpression,
	OtherwiseStatement,
	MacroExpression,
} from "@aethergames/mkscribe/out/mkscribe/ast/types";
import { TokenLiteral } from "@aethergames/mkscribe/out/mkscribe/scanner/types";
import { ScribeEnviroment } from "../../types";
import {
	DialogCallbackInput,
	ExitCallbackInput,
	Objective,
	ObjectiveChangeCallbackInput,
	OptionStructure,
	PipeToCallbackInput,
	ScribeCallbacks,
} from "../types";
import { EventListener } from "../utils";
import { Interpreter, RefNode } from "./types";
import format from "../utils/macros/format";
import echo from "../utils/macros/echo";

export enum StatusInterpretationCode {
	OK,
	FAILED,
	FREEZED,
}

export class ScribeVisitor implements Interpreter {
	public programProperties: Record<string, TokenLiteral>;
	public refs: Record<string, RefNode>;

	public records: {
		currentId: number;

		actors: Record<string, TokenLiteral>;
		stores: Record<string, [value?: TokenLiteral, metadata?: Array<unknown>]>;

		objectives: {
			current?: string;
		} & { [x: string]: Objective };

		scenes: Record<string, Statement>;
		interactions: Record<string, Statement>;
		triggers: Record<string, Statement>;
	};

	public readonly tracker: EventListener<string>;

	private readonly triggers: Array<string>;

	private interpreterCoroutine!: thread;

	constructor(
		private readonly ast: Array<Statement>,
		private readonly callbacks: ScribeCallbacks,
		private env: ScribeEnviroment,
	) {
		this.programProperties = {};
		this.refs = {};

		this.records = {
			currentId: 0,

			actors: {},
			stores: {},
			objectives: {},

			scenes: {},
			interactions: {},
			triggers: {},
		};

		this.tracker = new EventListener();
		this.triggers = [];
	}

	public interpret(): StatusInterpretationCode {
		let code: StatusInterpretationCode = StatusInterpretationCode.OK;

		for (const node of this.ast) {
			try {
				this.resolve(node);
			} catch (e) {
				code = StatusInterpretationCode.FAILED;

				warn(`There has been an error while trying to interpret Scribe. More information: ${e}`);
			}
		}

		this.callbacks.onEndExecution?.(code);

		return code;
	}

	public evaluate(expr: Expression): TokenLiteral {
		return expr.accept(this);
	}

	public resolve(stmt: Statement): void {
		return stmt.accept(this);
	}

	public resolveBody(stmts: Array<Statement>): void {
		for (const node of stmts) {
			node.accept(this);
		}
	}

	private checkTruthiness(literal: TokenLiteral): boolean {
		if (literal === undefined || literal === 0 || literal === false) return false;
		if (typeOf(literal) === "boolean") return literal as boolean;

		return true;
	}

	private isEqual(left: TokenLiteral, right: TokenLiteral): boolean {
		return left === right;
	}

	private isNumber(literal: TokenLiteral): boolean {
		return tonumber(literal) !== undefined;
	}

	private match<T extends TokenType | StatementType | ExpressionType>(toMatch: T, ...types: Array<T>): boolean {
		for (const _type of types) {
			if (_type === toMatch) {
				return true;
			}
		}

		return false;
	}

	public visitBinaryExpression(expr: BinaryExpression): TokenLiteral {
		let left = this.evaluate(expr.left);
		let right = this.evaluate(expr.right);

		if (
			this.match(
				expr.operator.type,

				TokenType.PLUS,
				TokenType.MINUS,
				TokenType.STAR,
				TokenType.EXPONENTIAL,
				TokenType.MODULUS,
				TokenType.SLASH,
				TokenType.GREATER,
				TokenType.G_E,
				TokenType.LESS,
				TokenType.L_E,
			)
		) {
			if (this.isNumber(left) && this.isNumber(right)) {
				left = tonumber(left) as number;
				right = tonumber(right) as number;

				switch (expr.operator.type) {
					case TokenType.PLUS:
						return left + right;

					case TokenType.MINUS:
						return left - right;

					case TokenType.STAR:
						return left * right;

					case TokenType.EXPONENTIAL:
						return left ** right;

					case TokenType.MODULUS:
						return left % right;

					case TokenType.SLASH:
						return left / right;

					case TokenType.GREATER:
						return left > right;

					case TokenType.G_E:
						return left >= right;

					case TokenType.LESS:
						return left < right;

					case TokenType.L_E:
						return left <= right;
				}
			} else {
				if (expr.operator.type === TokenType.PLUS) {
					return (left as string) + (right as string);
				}

				throw `Operands must be two numbers or two strings.`;
			}
		} else {
			switch (expr.operator.type) {
				case TokenType.E_E:
					return this.isEqual(left, right);

				case TokenType.AND:
					return this.checkTruthiness(left) && this.checkTruthiness(right);

				case TokenType.OR:
					return this.checkTruthiness(left) || this.checkTruthiness(right);
			}

			throw `Operands must be two booleans to evaluate an equality.`;
		}
	}

	public visitUnaryExpression(expr: UnaryExpression): TokenLiteral {
		const right = this.evaluate(expr.right);

		switch (expr.operator.type) {
			case TokenType.NOT: {
				return !this.checkTruthiness(right);
			}

			case TokenType.MINUS: {
				if (!this.isNumber(right)) {
					throw "Any other data type which is not a number, can't be negated.";
				}

				return -(right as number);
			}
		}
	}

	public visitTernaryExpression(expr: TernaryExpression): TokenLiteral {
		if (this.checkTruthiness(this.evaluate(expr.condition))) {
			return this.evaluate(expr.ifTrue);
		} else {
			return this.evaluate(expr.ifFalse);
		}
	}

	public visitVariableExpression(expr: VariableExpression): TokenLiteral {
		const identifier = expr.name.lexeme as string;

		if (identifier in this.records.stores) {
			return this.records.stores[identifier][0];
		} else if (identifier in this.records.objectives) {
			return identifier === this.records.objectives.current;
		}
	}

	public visitEnvironmentAccessor(expr: EnvironmentAccessor): TokenLiteral {
		const lexeme = expr.name.literal as string;

		return this.env[lexeme.sub(2, lexeme.size())] as TokenLiteral;
	}

	public visitLiteralExpression(expr: LiteralExpression): TokenLiteral {
		return expr.dataType !== "number" ? expr.value : tonumber(expr.value);
	}

	public visitGroupingExpression(expr: GroupingExpression): TokenLiteral {
		return this.evaluate(expr.expr);
	}

	public visitArrayExpression(expr: ArrayExpression): TokenLiteral {
		const array = [];

		for (const item of expr.expressions) {
			array.push(this.evaluate(item));
		}

		return array;
	}

	public visitMetadataExpression(expr: MetadataExpression): TokenLiteral {
		const metadata = [];

		for (const arg of expr.args) {
			metadata.push(this.evaluate(arg));
		}

		return metadata;
	}

	public visitStartExpression(expr: StartExpression): TokenLiteral {
		const identifier = expr.objective.lexeme as string;

		if (identifier in this.records.objectives) {
			this.records.objectives.current = identifier;
			this.callbacks.onObjectiveChange?.({
				id: identifier,
				description: this.records.objectives[identifier].desc,
			});
		} else {
			this.resolve(this.records.scenes[identifier]);
		}

		return 1;
	}

	public visitMacroExpression(expr: MacroExpression): TokenLiteral {
		const macro = expr.name.lexeme;

		const args = [];
		for (const expression of expr.args) args.push(tostring(this.evaluate(expression)));

		switch (macro) {
			case "$format": {
				const str = args.shift() as string;

				if (str === undefined) {
					throw `Expected a string to format within a $format() macro invoke.`;
				}

				return format(str, ...args);
			}

			default: {
				return echo(...args);
			}
		}
	}

	public visitExitExpression(expr: ExitExpression): TokenLiteral {
		this.callbacks.onExit?.({ output: expr.value !== undefined ? this.evaluate(expr.value) : undefined });

		return coroutine.close(this.interpreterCoroutine);
	}

	public visitExpressionStatement(stmt: ExpressionStatement): void {
		this.evaluate(stmt.expr);
	}

	public visitActorStatement(stmt: ActorStatement): void {
		const ref = stmt.name.lexeme as string;
		const refValue = this.evaluate(stmt.value);

		this.records.actors[ref] = refValue;
	}

	public visitPropertyStatement(stmt: PropertyStatement): void {
		this.programProperties[stmt.name.lexeme as string] = this.evaluate(stmt.value);
	}

	public visitObjectiveStatement(stmt: ObjectiveStatement): void {
		const isDefault = stmt.default;

		const objective = stmt.name.lexeme as string;
		const objectiveDesc = this.evaluate(stmt.value);

		if (isDefault && this.records.objectives.current === undefined) {
			this.records.objectives.current = objective;
		} else if (isDefault && this.records.objectives.current !== undefined) {
			throw `Another objective is already a default one, make sure to not override or have multiple default objectives. ${stmt.name.start}:${stmt.name.end}`;
		}

		this.records.objectives[objective] = {
			id: ++this.records.currentId,
			name: objective,
			desc: objectiveDesc as string,
			active: isDefault ?? false,
		};
	}

	public visitStoreStatement(stmt: StoreStatement): void {
		let value: TokenLiteral | undefined;
		let metadata: TokenLiteral | undefined;

		if (stmt.value !== undefined) {
			value = this.evaluate(stmt.value);
		}

		if (stmt.metadata !== undefined) {
			metadata = this.evaluate(stmt.metadata);
		}

		const ref = stmt.name.lexeme as string;
		const refIdentifier = stmt.identifier.lexeme as string;
		const refValue = [value, metadata] as never;

		this.records.stores[ref] = refValue;

		this.refs[refIdentifier] = {
			ref,
			_next: this.refs[refIdentifier],
		};
	}

	public visitSetStatement(stmt: SetStatement): void {
		const ref = stmt.name.lexeme as string;

		let refValue: TokenLiteral | undefined;
		if (stmt.value !== undefined) {
			refValue = this.evaluate(stmt.value);
		}

		this.records.stores[ref][0] = refValue;

		{
			this.tracker.notify(ref);
			this.callbacks.onChange?.({
				identifier: ref,
				newValue: refValue,
				metadata: this.records.stores[ref][1] as never,
			});
		}
	}

	public visitBlockStatement(stmt: BlockStatement): void {
		this.resolveBody(stmt.statements);
	}

	public visitDoStatement(stmt: DoStatement): void {
		this.resolve(stmt.body);
	}

	public visitDialogueStatement(stmt: DialogueStatement): void {
		const characterIdentifier = stmt.actor.lexeme as string;
		const text = this.evaluate(stmt.text) as string;

		let metadata: Array<unknown>;
		if (stmt.metadata !== undefined) {
			metadata = this.evaluate(stmt.metadata) as never;
		}

		const options: Array<OptionStructure> = [];
		for (const option of stmt.options) {
			options.push(this.resolve(option) as never);
		}

		this.callbacks.onDialog?.(
			{
				characterIdentifier,
				text,
				metadata: metadata!,
				options,
			},
			(id?: number) => {
				if (id !== undefined) {
					this.resolve(options[id - 1]._body);
				}
			},
		);
	}

	public visitIfStatement(stmt: IfStatement): void {
		let check: TokenLiteral;

		if (stmt.condition !== undefined) {
			check = this.evaluate(stmt.condition);

			if (this.checkTruthiness(check)) {
				return this.resolve(stmt.body);
			} else {
				if (stmt.else !== undefined) {
					this.resolve(stmt.else);
				}

				return;
			}
		}

		for (const node of (stmt.body as BlockStatement).statements) {
			let nodeType = node.type;

			if (this.match(nodeType, StatementType.EXPRESSION_STATEMENT)) {
				nodeType = (node as ExpressionStatement).expr.type as unknown as StatementType;
			}

			switch (nodeType) {
				case StatementType.CONDITION: {
					const conditionStatement = (node as ExpressionStatement).expr as unknown as ConditionStatement;
					const check = this.evaluate(conditionStatement.condition);

					if (this.checkTruthiness(check)) {
						return this.resolve(conditionStatement.body);
					}

					break;
				}

				case StatementType.OTHERWISE: {
					return this.resolve((node as OtherwiseStatement).body);
				}

				default: {
					throw "In a switch-case statement it's only permitted to have conditions.";
				}
			}
		}
	}

	public visitSceneStatement(stmt: SceneStatement): void {
		const ref = stmt.name.lexeme as string;
		const refValue = stmt.body;

		this.records.scenes[ref] = refValue;
	}

	public visitOptionStatement(stmt: OptionStatement): void {
		let text: TokenLiteral;
		if (stmt.value) {
			text = this.evaluate(stmt.value);
		}

		let metadata: TokenLiteral;
		if (stmt.metadata) {
			metadata = this.evaluate(stmt.metadata);
		}

		return {
			text,
			metadata,
			_body: stmt.body,
		} as never;
	}

	public visitTriggerStatement(stmt: TriggerStatement): void {
		const valueType = stmt.values.type;

		let expressions = [];
		switch (valueType) {
			case ExpressionType.ARRAY: {
				expressions = (stmt.values as ArrayExpression).expressions;

				break;
			}

			case ExpressionType.VARIABLE: {
				expressions = [stmt.values];

				break;
			}

			default: {
				throw `Can't keep track of anything that it is not an array of stores or a store.`;
			}
		}

		for (const expr of expressions) {
			if (this.match(expr.type, ExpressionType.VARIABLE)) {
				const ref = (expr as VariableExpression).name.lexeme as string;

				this.triggers.push(ref);
				this.tracker.do((refId: string) => {
					if (refId === ref) this.resolve(stmt.body);
				});
			} else {
				throw `Can't keep track of anything that it is not a store.`;
			}
		}
	}

	public visitInteractStatement(stmt: InteractStatement): void {
		const ref = stmt.identifier.lexeme as string;
		const actor = this.records.actors[ref];
		const refValue = stmt.body;

		this.records.interactions[actor as string] = refValue;
	}
}
