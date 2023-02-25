import { ExpressionVisitor, StatementVisitor } from "@aetherinteractiveltd/mkscribe";
import { TokenLiteral } from "@aetherinteractiveltd/mkscribe/out/mkscribe/scanner/types";

export declare type RefNode = {
	refValue: TokenLiteral;
	ref: string;
	_next: RefNode;
};

export declare type Interpreter = StatementVisitor<void> & ExpressionVisitor<TokenLiteral>;
