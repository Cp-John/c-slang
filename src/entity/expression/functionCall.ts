export class FunctionCall {
    private functionName: string;
    private parameterList: string[];

    constructor(functionName: string, parameterList: string[]) {
        this.functionName = functionName;
        this.parameterList = parameterList;
    }
    
}