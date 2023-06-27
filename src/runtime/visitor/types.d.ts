import { ExpressionVisitor, StatementVisitor } from "@aethergames/mkscribe";
import { TokenLiteral } from "@aethergames/mkscribe/out/mkscribe/scanner/types";

declare type RefNode = {
	ref: string;
	_next: RefNode;
};

export declare type Interpreter = StatementVisitor<void> & ExpressionVisitor<TokenLiteral>;
