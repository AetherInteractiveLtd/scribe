export declare type SourceType = string | StringValue | ModuleScript;

export declare type ModuleSource = { src: string };
export declare type StringValueSource = StringValue;
export declare type StringSource = string;

export declare type ScribeEnviroment = { [x: string]: unknown };

export declare type ExecutionType = "virtual-machine" | "ast-interpreter";
