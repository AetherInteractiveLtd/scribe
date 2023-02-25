import { ExpressionType, StatementType, TokenType } from "@aether-interactive-ltd/mkscribe";
import {
	ExpressionStatement,
	ActorStatement,
	ObjectiveStatement,
	StoreStatement,
	SetStatement,
	BlockStatement,
	BlockOfConditionsStatement,
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
	EnviromentAccessor,
	LiteralExpression,
	GroupingExpression,
	MetadataExpression,
	StartExpression,
	Statement,
	Expression,
	PropertyStatement,
	EchoStatement,
	InteractStatement,
	ArrayExpression,
} from "@aether-interactive-ltd/mkscribe/out/mkscribe/ast/types";
import { TokenLiteral } from "@aether-interactive-ltd/mkscribe/out/mkscribe/scanner/types";
import { ScribeEnviroment } from "../../types";
import { DialogCallbackInput, OptionStructure, PipeToCallbackInput } from "../types";
import { EventListener } from "../utils";
import { Interpreter, RefNode } from "./types";

export enum StatusInterpretationCode {
	OK,
	FAILED,
	FREEZED,
}

export class ScribeVisitor implements Interpreter {
	public programProperties: Record<string, TokenLiteral>;
	public refs: Record<string, RefNode>;

	public records: {
		actors: Record<string, TokenLiteral>;
		stores: Record<string, [value?: TokenLiteral, metadata?: Array<unknown>]>;

		objectives: {
			current?: TokenLiteral;
		} & { [x: string]: TokenLiteral };

		scenes: Record<string, Statement>;
		interactions: Record<string, Statement>;
		triggers: Record<string, Statement>;
	};

	private readonly tracker: {
		triggers: Array<string>;
		event: EventListener<string>;
	};

	private interpreterCoroutine!: thread;

	constructor(
		private readonly ast: Array<Statement>,
		private readonly callbacks: {
			dialog: (input: DialogCallbackInput) => void;
			storeChange: (config: PipeToCallbackInput) => void;
		},
		private env: ScribeEnviroment,
	) {
		this.programProperties = {};
		this.refs = {};

		this.records = {
			actors: {},
			stores: {},
			objectives: {},

			scenes: {},
			interactions: {},
			triggers: {},
		};

		this.tracker = {
			triggers: [],
			event: new EventListener(),
		};
	}

	public interpret(): StatusInterpretationCode {
		let code: StatusInterpretationCode;

		try {
			this.interpreterCoroutine = coroutine.create(() => {
				for (const node of this.ast) this.resolve(node);
			});

			coroutine.resume(this.interpreterCoroutine);
		} catch (_error) {
			warn(_error);

			code = StatusInterpretationCode.FAILED;
		} finally {
			code = StatusInterpretationCode.OK;
		}

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
		return this.checkTruthiness(left) === this.checkTruthiness(right);
	}

	private isNumber(literal: TokenLiteral): boolean {
		return tonumber(literal) !== undefined;
	}

	private match<T extends TokenType | StatementType | ExpressionType>(
		toMatch: T,
	): {
		with: (...types: Array<T>) => boolean;
	} {
		return {
			with: (...types: Array<T>) => {
				for (const _type of types) {
					if (_type === toMatch) {
						return true;
					}
				}

				return false;
			},
		};
	}

	/**
	 * Expressions
	 */

	public visitBinaryExpression(expr: BinaryExpression): TokenLiteral {
		let left = this.evaluate(expr.left);
		let right = this.evaluate(expr.right);

		if (
			this.match(expr.operator.type).with(
				TokenType.PLUS,
				TokenType.MINUS,
				TokenType.STAR,
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
		const right = this.evaluate(expr);

		switch (expr.operator.type) {
			case TokenType.NOT: {
				return !this.checkTruthiness(right);
			}

			case TokenType.MINUS: {
				if (this.isNumber(right)) {
					warn("Expected a number in the unary operation.");
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

	public visitEnviromentAccessor(expr: EnviromentAccessor): TokenLiteral {
		const lexeme = expr.name.literal as string;
		return this.env[lexeme.sub(2, lexeme.size())] as TokenLiteral;
	}

	public visitLiteralExpression(expr: LiteralExpression): TokenLiteral {
		return expr.value;
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
		} else {
			this.resolve(this.records.scenes[identifier]);
		}

		return 1;
	}

	/**
	 * Statements
	 */

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

		this.records.objectives[objective] = objectiveDesc;

		if (isDefault && this.records.objectives.current === undefined) {
			this.records.objectives.current = objective;
		} else {
			throw `Another objective is already a default one, make sure to not override or have multiple default objectives. ${stmt.name.start}:${stmt.name.end}`;
		}
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
		const refValue = [value, metadata];

		this.records.stores[ref] = refValue as never;
		this.refs[refIdentifier] = {
			refValue,
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

		const store = this.records.stores[ref];

		let metadata: TokenLiteral;
		if (store[1] !== undefined) {
			metadata = store[1];
		}

		this.records.stores[ref][0] = refValue;
		this.callbacks.storeChange({ identifier: ref, data: refValue, metadata: metadata as never });
		this.tracker.event.notify(ref);
	}

	public visitBlockStatement(stmt: BlockStatement): void {
		this.resolveBody(stmt.statements);
	}

	public visitBlockOfConditionsStatement(stmt: BlockOfConditionsStatement): void {
		this.resolveBody(stmt.conditions);
	}

	public visitDialogueStatement(stmt: DialogueStatement): never {
		const characterIdentifier = stmt.actor.lexeme as string;
		const text = this.evaluate(stmt.text) as string;

		let metadata: TokenLiteral;
		if (stmt.metadata !== undefined) {
			metadata = this.evaluate(stmt.metadata);
		}

		// eslint-disable-next-line prefer-const
		let options: Array<OptionStructure> = [];
		for (const option of stmt.options) {
			options.push(this.resolve(option) as never);
		}

		task.spawn(() => {
			this.callbacks.dialog({
				characterIdentifier,
				text,
				metadata,
				options,
				step: (id?: number) => {
					if (id !== undefined) {
						this.resolve(options[id - 1]._body);
					}

					print("Wtf");

					return coroutine.resume(this.interpreterCoroutine);
				},
			});
		});

		return coroutine.yield() as never;
	}

	public visitConditionStatement(stmt: ConditionStatement): void {
		const check = this.evaluate(stmt.condition);

		if (this.checkTruthiness(check)) {
			this.resolve(stmt.body);
		}
	}

	public visitIfStatement(stmt: IfStatement): void {
		let check: TokenLiteral;

		if (stmt.condition !== undefined) {
			check = this.evaluate(stmt.condition);

			if (this.checkTruthiness(check)) {
				return this.resolve(stmt.body);
			} else return;
		}

		this.resolve(stmt.body);
	}

	public visitSceneStatement(stmt: SceneStatement): void {
		const isDefault = stmt.default;

		if (isDefault) {
			this.resolve(stmt.body);
		} else {
			const ref = stmt.name.lexeme as string;
			const refValue = stmt.body;

			this.records.scenes[ref] = refValue;
		}
	}

	public visitOptionStatement(stmt: OptionStatement): never {
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
		if (this.match(stmt.values.type).with(ExpressionType.ARRAY)) {
			const expressions = (stmt.values as ArrayExpression).expressions;

			for (const expr of expressions) {
				if (this.match(expr.type).with(ExpressionType.VARIABLE)) {
					const ref = (expr as VariableExpression).name.lexeme as string;

					this.tracker.triggers.push(ref);
					this.tracker.event.do((refId: string) => {
						if (refId === ref) this.resolve(stmt.body);
					});
				}
			}
		} else if (this.match(stmt.values.type).with(ExpressionType.VARIABLE)) {
			const ref = (stmt.values as VariableExpression).name.lexeme as string;

			this.tracker.triggers.push(ref);
			this.tracker.event.do((refId: string) => {
				if (refId === ref) this.resolve(stmt.body);
			});
		} else {
			throw `Can't keep track of anything that it is not an identifier.`;
		}
	}

	public visitInteractStatement(stmt: InteractStatement): void {
		const ref = stmt.identifier.lexeme as string;
		const refValue = stmt.body;

		this.records.interactions[ref] = refValue;
	}

	public visitEchoStatement(stmt: EchoStatement): void {
		print(this.evaluate(stmt.expr));
	}
}
