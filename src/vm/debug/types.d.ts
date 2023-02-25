import { Chunk } from "../chunk/types";
import { int } from "../types";

declare function disassembleChunk(chunk: Chunk, name: string): void;
declare function disasembleInstruction(chunk: Chunk, offset: int): void;
