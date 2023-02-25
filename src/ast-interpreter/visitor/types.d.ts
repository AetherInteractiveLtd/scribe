import { ExpressionVisitor, StatementVisitor } from "@aether-interactive-ltd/mkscribe";
import { TokenLiteral } from "@aether-interactive-ltd/mkscribe/out/mkscribe/scanner/types";

export declare type RefNode = {
	refValue: TokenLiteral;
	ref: string;
	_next: RefNode;
};

export declare type Interpreter = StatementVisitor<void> & ExpressionVisitor<TokenLiteral>;
