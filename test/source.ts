import { ScriptTarget, SourceFile, createSourceFile } from "typescript";

export function createTestSource(code: string): SourceFile {
  return createSourceFile("__code__", code, ScriptTarget.ES2022);
}