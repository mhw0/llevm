import assert from "assert";
import {
  SourceFile,
  SyntaxKind,
  ParameterDeclaration,
  VariableDeclaration,
  Identifier,
  QualifiedName,
  StringLiteral,
  NumericLiteral,
  Expression,
  ElementAccessExpression,
  PropertyAccessExpression,
  PostfixUnaryExpression,
  PrefixUnaryExpression,
  BinaryExpression,
  Statement,
  VariableStatement,
  ExpressionStatement,
  ParenthesizedExpression,
  LiteralExpression
} from "typescript";

type IntcodeOp = "LAB" | "CLS" | "ADD" | "SUB" | "DIV" | "MULT" | "MOD" | "EXP" | "XOR"
  | "SHL" | "SHR" | "SAR" | "SHA3" | "BAL" | "ORIG" | "CALR" | "CSIZ" | "GASP"
  | "BLSH" | "CINB" | "TMSP" | "BNUM" | "GASL" | "CHID" | "SFBL" | "BFEE" | "GAS"
  | "COPY" | "MCOP" | "UNP" | "AND" | "OR" | "NOT" | "GT" | "LT" | "EQ";

type Intcode = [IntcodeOp, ...string[]]

export class IntermediateCode {
  private intcodes: Intcode[] = [];
  private tempCounter: number = 0;

  constructor(private source: SourceFile) { }

  private allocTemp(): string {
    return "@t" + (this.tempCounter++);
  }

  private obtainNameOf(node: VariableDeclaration | ParameterDeclaration | Identifier | QualifiedName): string {
    switch (node.kind) {
      case SyntaxKind.VariableDeclaration:
        return this.obtainNameOf(node.name as Identifier);
      case SyntaxKind.Parameter:
        return this.obtainNameOf(node.name as Identifier);
      case SyntaxKind.Identifier:
        return node.escapedText.toString();
      case SyntaxKind.QualifiedName:
        return this.obtainNameOf(node.right);
      default:
        return "";
    }
  }

  private intcode(intcode: Intcode): void {
    this.intcodes.push(intcode);
  }

  private intcodeVariableStatement(statement: VariableStatement): void {
    assert(statement.kind == SyntaxKind.VariableStatement);
    for (const declaration of statement.declarationList.declarations)
      this.intcodeVariableDeclaration(declaration);
  }

  private intcodeVariableDeclaration(decl: VariableDeclaration): void {
    assert(decl.kind == SyntaxKind.VariableDeclaration);
    const variableName = this.obtainNameOf(decl);

    const initializer = decl.initializer;
    if (initializer == undefined)
      return

    switch (initializer.kind) {
      case SyntaxKind.Identifier:
      case SyntaxKind.NumericLiteral:
      case SyntaxKind.StringLiteral:
        const literal = this.intcodeFormatFor(initializer as LiteralExpression);
        return this.intcode(["COPY", variableName, literal]);
      default:
        this.intcodeExpression(initializer, variableName);
    }
  }

  private obtainOpcodeFrom(kind: number): IntcodeOp {
    switch (kind) {
      case SyntaxKind.PlusToken:
      case SyntaxKind.PlusEqualsToken:
        return "ADD"; // a + b
      case SyntaxKind.MinusToken:
      case SyntaxKind.MinusEqualsToken:
        return "SUB"; // a - b
      case SyntaxKind.AsteriskToken:
      case SyntaxKind.AsteriskEqualsToken:
        return "MULT"; // a * b
      case SyntaxKind.AsteriskAsteriskToken:
      case SyntaxKind.AsteriskAsteriskEqualsToken:
        return "EXP"; // a ** b or a **= b
      case SyntaxKind.SlashToken:
      case SyntaxKind.SlashEqualsToken:
        return "DIV"; // a / b
      case SyntaxKind.LessThanLessThanToken:
      case SyntaxKind.LessThanLessThanEqualsToken:
        return "SHL"; // a << b or a <<= b
      // in typescript, right shift (>>) is signed by default
      // so the position of "SAR" and "SHR" opcodes should be swapped
      case SyntaxKind.GreaterThanGreaterThanToken:
      case SyntaxKind.GreaterThanGreaterThanEqualsToken:
        return "SAR"; // a >> b or a >>= b
      case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
        return "SHR"; // a >>> b or a >>>= b
      case SyntaxKind.AmpersandToken:
      case SyntaxKind.AmpersandEqualsToken:
        return "AND"; // a & b
      case SyntaxKind.BarToken:
      case SyntaxKind.BarEqualsToken:
        return "OR"; // a | b
      case SyntaxKind.CaretToken:
      case SyntaxKind.CaretEqualsToken:
        return "XOR"; // a ^ b
      case SyntaxKind.PercentToken:
      case SyntaxKind.PercentEqualsToken:
        return "MOD"; // a % b or a %= b
      case SyntaxKind.TildeToken:
        return "NOT"; // ~a
      case SyntaxKind.EqualsToken:
        return "COPY";
      default:
        assert(0, "Invalid token kind: " + kind);
        return "" as IntcodeOp; // TODO: not safe
    }
  }

  private intcodeFormatFor(node: LiteralExpression | Identifier): string {
    if (node.kind == SyntaxKind.NumericLiteral)
      return ".%" + node.getText(this.source);
    else if (node.kind == SyntaxKind.StringLiteral)
      return "%" + node.text;
    else if (node.kind == SyntaxKind.Identifier)
      return node.text;
    return "";
  }

  private intcodeElementAccessExpression(expr: ElementAccessExpression): string {
    assert(expr.kind == SyntaxKind.ElementAccessExpression);
    const source = this.intcodeExpression(expr.expression);
    const target = this.intcodeExpression(expr.argumentExpression);
    const dest = this.allocTemp();
    this.intcode(["UNP", dest, source, target]);
    return dest;
  }

  private intcodePropertyAccessExpression(expr: PropertyAccessExpression): string {
    assert(expr.kind == SyntaxKind.PropertyAccessExpression);
    const source = this.intcodeExpression(expr.expression);
    const target = this.obtainNameOf(expr.name as any); // TODO: not safe
    const dest = this.allocTemp();
    this.intcode(["UNP", dest, source, target]);
    return dest;
  }

  private intcodeUnaryExpression(expr: PrefixUnaryExpression | PostfixUnaryExpression): string {
    const operandDest = this.intcodeExpression(expr.operand);
    const opcode = this.obtainOpcodeFrom(expr.operator);

    // TODO: also handle +x, -x
    switch (expr.operator) {
      case SyntaxKind.PlusPlusToken:
      case SyntaxKind.MinusMinusToken:
        this.intcode([opcode, operandDest, operandDest, ".%1"]);
        return operandDest;
      case SyntaxKind.TildeToken:
        const dest = this.allocTemp();
        this.intcode([opcode, dest, operandDest]);
        return dest;
      default:
        assert(0, "Invalid operator:" + expr.operator);
        return ""
    }
  }

  private intcodeBinaryExpression(expr: BinaryExpression, dest?: string): string {
    assert(expr.kind == SyntaxKind.BinaryExpression);

    const operatorToken = expr.operatorToken;
    const leftdest = this.intcodeExpression(expr.left);
    const rightdest = this.intcodeExpression(expr.right);
    const operatorOpcode = this.obtainOpcodeFrom(operatorToken.kind);

    switch (operatorToken.kind) {
      case SyntaxKind.EqualsToken:
      case SyntaxKind.PlusEqualsToken:
      case SyntaxKind.MinusEqualsToken:
      case SyntaxKind.SlashEqualsToken:
      case SyntaxKind.AsteriskEqualsToken:
      case SyntaxKind.AsteriskAsteriskEqualsToken:
      case SyntaxKind.LessThanLessThanEqualsToken:
      case SyntaxKind.GreaterThanGreaterThanEqualsToken:
      case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
      case SyntaxKind.AmpersandEqualsToken:
      case SyntaxKind.BarEqualsToken:
      case SyntaxKind.CaretEqualsToken:
      case SyntaxKind.PercentEqualsToken:
        this.intcode([operatorOpcode, leftdest, leftdest, rightdest])
        return leftdest;
    }

    dest = dest || this.allocTemp();
    const opcode = this.obtainOpcodeFrom(operatorToken.kind); // TODO: not safe
    this.intcode([opcode, dest, leftdest, rightdest]);
    return dest
  }

  private unpackParenthesizedExpression(expr: Expression): Expression {
    if (expr.kind == SyntaxKind.ParenthesizedExpression)
      return this.unpackParenthesizedExpression((expr as ParenthesizedExpression).expression);
    return expr;
  }

  private intcodeExpression(expr: Expression, dest?: string): string {
    if (expr.kind == SyntaxKind.ParenthesizedExpression)
      expr = this.unpackParenthesizedExpression(expr);

    if (expr.kind == SyntaxKind.BinaryExpression)
      return this.intcodeBinaryExpression(expr as BinaryExpression, dest);

    if (expr.kind == SyntaxKind.Identifier)
      return this.obtainNameOf(expr as Identifier);

    if (expr.kind == SyntaxKind.ElementAccessExpression)
      return this.intcodeElementAccessExpression(expr as ElementAccessExpression);

    if (expr.kind == SyntaxKind.PropertyAccessExpression)
      return this.intcodePropertyAccessExpression(expr as PropertyAccessExpression);

    if (expr.kind == SyntaxKind.PrefixUnaryExpression)
      return this.intcodeUnaryExpression(expr as PrefixUnaryExpression);

    if (expr.kind == SyntaxKind.PostfixUnaryExpression)
      return this.intcodeUnaryExpression(expr as PostfixUnaryExpression);

    if (expr.kind == SyntaxKind.NumericLiteral)
      return this.intcodeFormatFor(expr as NumericLiteral);

    if (expr.kind == SyntaxKind.StringLiteral)
      return this.intcodeFormatFor(expr as StringLiteral);

    assert(0);
    return "";
  }

  private intcodeStatement(statement: Statement): void {
    if (statement.kind == SyntaxKind.VariableStatement)
      this.intcodeVariableStatement(statement as VariableStatement);
    else if (statement.kind == SyntaxKind.ExpressionStatement)
      this.intcodeExpression((statement as ExpressionStatement).expression);
  }

  public generate() {
    for (const statement of this.source.statements)
      this.intcodeStatement(statement);
    return this.intcodes;
  }
}
