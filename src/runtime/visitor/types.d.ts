import { ExpressionVisitor, StatementVisitor } from "@aethergames/mkscribe";
import { TokenLiteral } from "@aethergames/mkscribe/out/mkscribe/scanner/types";

export declare type RefNode = {
	refValue: TokenLiteral;
	ref: string;
	_next: RefNode;
};

export declare type Interpreter = StatementVisitor<void> & ExpressionVisitor<TokenLiteral>;
