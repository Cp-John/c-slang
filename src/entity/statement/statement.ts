import { Lexer } from "../../parser/lexer";
import { Assignment } from "./assignment";
import { Declaration } from "./declaration";
import { Return } from "./return";
import { Break, Continue } from "./simpleStatement";
import { While } from "./while";

export abstract class Statement {
    static parse(lexer: Lexer): Statement {
        if (lexer.matchKeyword('while')) {
            return While.parse(lexer);
        }else if (lexer.matchKeyword('return')) {
            return Return.parse(lexer);
        } else if (lexer.matchKeyword('continue')) {
            return Continue.parse(lexer);
        } else if (lexer.matchKeyword('break')) {
            return Break.parse(lexer);
        } else if (lexer.matchDataType()) {
            return Declaration.parse(lexer);
        } else {
            return Assignment.parse(lexer);
        }
    }
}