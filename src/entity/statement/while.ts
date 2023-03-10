import { Lexer } from "../../parser/lexer";
import { Block } from "../block";
import { Expression } from "../expression/expression";
import { Statement } from "./statement";

export class While extends Statement {
    private expression: Expression;
    private body: Block;

    constructor(expression: Expression, body: Block) {
        super();
        this.expression = expression;
        this.body = body;
    }

    static parse(lexer: Lexer) {
        lexer.eatKeyword('while');
        lexer.eatDelimiter('(');
        const expression = Expression.parse(lexer);
        lexer.eatDelimiter(')');
        const body = Block.parse(lexer);
        return new While(expression, body);
    }
}