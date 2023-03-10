import { Expression } from "../expression/expression";
import { Lexer } from "../../parser/lexer";
import { Statement } from "./statement";

export class Assignment extends Statement {
    private variable: string;
    private expression: Expression;

    constructor(variable: string, expression: Expression) {
        super();
        this.variable = variable;
    }

    static parse(lexer: Lexer): Assignment {
        const variable = lexer.eatIdentifier();
        lexer.eatDelimiter('=');
        const expression = Expression.parse(lexer);
        lexer.eatDelimiter(';');
        return new Assignment(variable, expression);
    }
}