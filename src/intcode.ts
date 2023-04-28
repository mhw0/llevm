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
  Block,
  Node,
  VariableStatement,
  ExpressionStatement,
  ParenthesizedExpression,
  LiteralExpression,
  IfStatement,
  WhileStatement,
  DoStatement
} from "typescript";

type IntcodeRelopOpcode = "LT" | "LTE" | "GT" | "GTE" | "EQ" | "NEQ";
type IntcodeBranchOpcode = "BR" | "BLT" | "BLTE" | "BGT" | "BGTE" | "BEQ" | "BNEQ";
type IntcodeExpressionOpcode = "ADD" | "SUB" | "MULT" | "EXP" | "DIV"
  | "AND" | "OR" | "SHL" | "SHR" | "SAR" | "AND" | "OR" | "XOR" | "MOD"
  | "NOT" | "COPY" | "LAB" | "UNP";

type IntcodeOpcode = IntcodeRelopOpcode | IntcodeBranchOpcode | IntcodeExpressionOpcode;
type Intcode = [IntcodeOpcode, string] | [IntcodeOpcode, string, string] | [IntcodeOpcode, string, string, string];

export class IntermediateCode {
  private intcodes: Intcode[] = []
  private labelCounter: number = 0;
  private tempCounter: number = 0;

  constructor(private source: SourceFile) { }

  public allocLabel(): string {
    return "L" + (this.labelCounter++);
  }

  public allocTemp(): string {
    return "@t" + (this.tempCounter++);
  }

  private intcode(intcode: Intcode): void {
    this.intcodes.push(intcode);
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
        throw Error("Invalid node kind: " + node);
    }
  }

  private intcodeBlock(block: Block): void {
    for(const statement of block.statements)
      this.intcodeStatement(statement);
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

    // TODO: also handle +x, -x
    switch (expr.operator) {
      case SyntaxKind.PlusPlusToken:
        this.intcode(["ADD", operandDest, operandDest, ".%1"]);
        return operandDest;
      case SyntaxKind.MinusMinusToken:
        this.intcode(["SUB", operandDest, operandDest, ".%1"]);
        return operandDest;
      case SyntaxKind.TildeToken:
        const dest = this.allocTemp();
        this.intcode(["NOT", dest, operandDest]);
        return dest;
      default:
        throw Error("Invalid operator kind: " + expr.operator);
    }
  }

  private obtainExpressionOpcodeFor(node: Node): IntcodeExpressionOpcode | IntcodeRelopOpcode {
    switch (node.kind) {
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
      case SyntaxKind.LessThanToken:
        return "LT"; // a < b
      case SyntaxKind.LessThanEqualsToken:
        return "LTE"; // a <= b
      case SyntaxKind.GreaterThanToken:
        return "GT"; // a > b
      case SyntaxKind.GreaterThanEqualsToken:
        return "GTE"; // a >= b
      case SyntaxKind.EqualsEqualsToken:
      case SyntaxKind.EqualsEqualsEqualsToken: // TODO
        return "EQ"; // a == b
      case SyntaxKind.AmpersandAmpersandToken:
      case SyntaxKind.AmpersandAmpersandEqualsToken:
        return "AND"; // a && b
      case SyntaxKind.ExclamationEqualsToken:
        return "NEQ"; // a != b
      case SyntaxKind.BarBarToken:
      case SyntaxKind.BarBarEqualsToken:
        return "OR"; // a || b
      case SyntaxKind.LessThanLessThanToken:
      case SyntaxKind.LessThanLessThanEqualsToken:
        return "SHL"; // a << b or a <<= b
      case SyntaxKind.GreaterThanGreaterThanToken:
      case SyntaxKind.GreaterThanGreaterThanEqualsToken:
        return "SAR"; // a >>> b or a >>>= b
      case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
        return "SHR"; // a >> b or a >>= b
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
        throw Error("Invalid expression opcode node kind: " + node.kind);
    }
  }

  private obtainBranchOpcodeFor(node: Node): IntcodeBranchOpcode {
    switch (node.kind) {
      case SyntaxKind.LessThanToken:
        return "BLT"; // branch if less than
      case SyntaxKind.LessThanEqualsToken:
        return "BLTE"; // branch if less than or equals
      case SyntaxKind.GreaterThanToken:
        return "BGT"; // branch if greater than
      case SyntaxKind.GreaterThanEqualsToken:
        return "BGTE"; // branch if greater than or equals
      case SyntaxKind.EqualsEqualsToken:
        return "BEQ"; // branch if equals
      case SyntaxKind.ExclamationEqualsToken:
        return "BNEQ"; // branch if not equals
      default:
        throw Error("Invalid branch opcode node kind: " + node.kind);
    }
  }

  private intcodeControlFlowBinaryExpression(expr: BinaryExpression, ltrue: string, lfalse?: string): void {
    assert(expr.kind == SyntaxKind.BinaryExpression);
    const operatorToken = expr.operatorToken;

    switch (operatorToken.kind) {
      case SyntaxKind.BarBarToken:
        const falseLabel = this.allocLabel();
        this.intcodeControlFlowExpression(expr.left, ltrue, falseLabel);
        this.intcode(["LAB", falseLabel]);
        this.intcodeControlFlowExpression(expr.right, ltrue, lfalse);
        return
      case SyntaxKind.AmpersandAmpersandToken:
        const trueLabel = this.allocLabel();
        this.intcodeControlFlowExpression(expr.left, trueLabel, lfalse);
        this.intcode(["LAB", trueLabel]);
        this.intcodeControlFlowExpression(expr.right, ltrue, lfalse);
        return
      case SyntaxKind.GreaterThanToken:
      case SyntaxKind.GreaterThanEqualsToken:
      case SyntaxKind.LessThanToken:
      case SyntaxKind.LessThanEqualsToken:
      case SyntaxKind.EqualsEqualsToken:
      case SyntaxKind.EqualsEqualsEqualsToken: // TODO: should it be handled separately?
      case SyntaxKind.ExclamationEqualsToken:
        const branchOpcode = this.obtainBranchOpcodeFor(operatorToken);
        const left = this.intcodeExpression(expr.left);
        const right = this.intcodeExpression(expr.right);
        this.intcode([branchOpcode, ltrue, left, right]);
        if (lfalse != undefined)
          this.intcode(["BR", lfalse]);
        return
      default:
        const exprdest = this.intcodeExpression(expr);
        this.intcode(["BNEQ", ltrue, exprdest, ".%0"]);
        if (lfalse != undefined)
          this.intcode(["BR", lfalse]);
    }
  }

  private intcodeControlFlowExpression(expr: Expression, ltrue: string, lfalse?: string): string | void {
    switch (expr.kind) {
      case SyntaxKind.BinaryExpression:
        return this.intcodeControlFlowBinaryExpression((expr as BinaryExpression), ltrue, lfalse);
      case SyntaxKind.TrueKeyword:
        return this.intcode(["BR", ltrue]);
      case SyntaxKind.FalseKeyword:
        if (lfalse != undefined)
          this.intcode(["BR", lfalse]);
        break
      // a && b is the same as a != 0 && b != 0
      case SyntaxKind.Identifier:
        const identifier = this.obtainNameOf(expr as Identifier);
        this.intcode(["BNEQ", ltrue, identifier, ".%0"]);
        if (lfalse != undefined)
          this.intcode(["BR", lfalse]);
        break
      case SyntaxKind.NumericLiteral:
      case SyntaxKind.StringLiteral:
      case SyntaxKind.NullKeyword:
        const literal = this.intcodeFormatLiteral(expr as NumericLiteral);
        this.intcode(["BNEQ", ltrue, literal, ".%0"]);
        if (lfalse != undefined)
          this.intcode(["BR", lfalse]);
        break
      case SyntaxKind.ParenthesizedExpression:
        const expression = (expr as ParenthesizedExpression).expression
        this.intcodeControlFlowExpression(expression, ltrue, lfalse);
        break
    }
  }

  private intcodeFormatLiteral(node: Node): string {
    switch (node.kind) {
      case SyntaxKind.NumericLiteral:
        // node.text would return "computed" value if the numeric literal is a big integer
        // (999999999999999999999 -> 1e+21). Therefore, node.getText has to be used to get
        // the raw literal
        return ".%" + node.getText(this.source);
      case SyntaxKind.Identifier:
        return (node as Identifier).text;
      case SyntaxKind.StringLiteral:
        return "%" + (node as StringLiteral).text;
      case SyntaxKind.TrueKeyword:
        return ".%1";
      case SyntaxKind.NullKeyword:
      case SyntaxKind.FalseKeyword:
      case SyntaxKind.UndefinedKeyword:
        return ".%0";
      default:
        throw Error("Invalid literal node kind: " + node.kind);
    }
  }

  private intcodeBinaryExpression(expr: BinaryExpression, dest?: string): string {
    assert(expr.kind == SyntaxKind.BinaryExpression);
    const operatorToken = expr.operatorToken;
    const operatorOpcode = this.obtainExpressionOpcodeFor(operatorToken);

    switch (operatorToken.kind) {
      case SyntaxKind.EqualsToken: {
        const leftdest = this.intcodeExpression(expr.left, dest);
        const rightdest = this.intcodeExpression(expr.right, dest);
        this.intcode(["COPY", leftdest, rightdest]);
        return leftdest;
      }
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
      case SyntaxKind.PercentEqualsToken: {
        const leftdest = this.intcodeExpression(expr.left, dest);
        const rightdest = this.intcodeExpression(expr.right, dest);
        this.intcode([operatorOpcode, leftdest, leftdest, rightdest])
        return leftdest;
      }
      case SyntaxKind.PlusToken:
      case SyntaxKind.MinusToken:
      case SyntaxKind.SlashToken:
      case SyntaxKind.AsteriskToken:
      case SyntaxKind.AsteriskAsteriskToken:
      case SyntaxKind.GreaterThanGreaterThanToken:
      case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      case SyntaxKind.LessThanLessThanToken:
      case SyntaxKind.BarToken:
      case SyntaxKind.AmpersandToken:
      case SyntaxKind.CaretToken:
      case SyntaxKind.PercentToken:
      case SyntaxKind.GreaterThanToken:
      case SyntaxKind.GreaterThanEqualsToken:
      case SyntaxKind.LessThanToken:
      case SyntaxKind.LessThanEqualsToken:
      case SyntaxKind.EqualsEqualsToken:
      case SyntaxKind.EqualsEqualsEqualsToken: // TODO
      case SyntaxKind.ExclamationEqualsToken: {
        dest = dest || this.allocTemp();
        const leftdest = this.intcodeExpression(expr.left);
        const rightdest = this.intcodeExpression(expr.right);
        this.intcode([operatorOpcode, dest, leftdest, rightdest]);
        return dest;
      }
      case SyntaxKind.AmpersandAmpersandToken: {
        dest = dest || this.allocTemp();
        const lleft = this.allocLabel();
        const lexit = this.allocLabel();

        const leftdest = this.intcodeExpression(expr.left);
        this.intcode(["BEQ", lleft, leftdest, ".%0"]);
        const rightdest = this.intcodeExpression(expr.right);
        this.intcode(["COPY", dest, rightdest]);
        this.intcode(["BR", lexit]);
        this.intcode(["LAB", lleft]);
        this.intcode(["COPY", dest, leftdest]);
        this.intcode(["LAB", lexit]);
        return dest;
      }
      case SyntaxKind.BarBarToken: {
        dest = dest || this.allocTemp();
        const lleft = this.allocLabel();
        const lexit = this.allocLabel();

        const leftdest = this.intcodeExpression(expr.left);
        this.intcode(["BNEQ", lleft, leftdest, ".%0"]);
        const rightdest = this.intcodeExpression(expr.right);
        this.intcode(["COPY", dest, rightdest]);
        this.intcode(["BR", lexit]);
        this.intcode(["LAB", lleft]);
        this.intcode(["COPY", dest, leftdest]);
        this.intcode(["LAB", lexit]);
        return dest;
      }
      default:
        throw Error("Invalid binary expression node kind: " + expr.kind);
    }
  }

  private intcodeExpression(expr: Expression, dest?: string): string {
    switch (expr.kind) {
      case SyntaxKind.BinaryExpression:
        return this.intcodeBinaryExpression(expr as BinaryExpression, dest);
      case SyntaxKind.ParenthesizedExpression:
        const expression = (expr as ParenthesizedExpression).expression;
        return this.intcodeExpression(expression, dest);
      case SyntaxKind.Identifier:
      case SyntaxKind.NumericLiteral:
      case SyntaxKind.StringLiteral:
      case SyntaxKind.NumericLiteral:
      case SyntaxKind.TrueKeyword:
      case SyntaxKind.FalseKeyword:
      case SyntaxKind.NullKeyword:
      case SyntaxKind.UndefinedKeyword:
        return this.intcodeFormatLiteral(expr);
      case SyntaxKind.ElementAccessExpression:
        return this.intcodeElementAccessExpression(expr as ElementAccessExpression);
      case SyntaxKind.PropertyAccessExpression:
        return this.intcodePropertyAccessExpression(expr as PropertyAccessExpression);
      case SyntaxKind.PrefixUnaryExpression:
        return this.intcodeUnaryExpression(expr as PrefixUnaryExpression);
      case SyntaxKind.PostfixUnaryExpression:
        return this.intcodeUnaryExpression(expr as PostfixUnaryExpression);
      default:
        throw Error("Invalid expression node kind: " + expr.kind);
    }
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
        const literal = this.intcodeFormatLiteral(initializer as LiteralExpression);
        return this.intcode(["COPY", variableName, literal]);
      default:
        this.intcodeExpression(initializer, variableName);
    }
  }

  private intcodeIfStatement(statement: IfStatement): void {
    assert(statement.kind == SyntaxKind.IfStatement);
    const trueLabel = this.allocLabel();
    const falseLabel = this.allocLabel();

    if (statement.elseStatement) {
      const nextLabel = this.allocLabel();

      this.intcodeControlFlowExpression(statement.expression, trueLabel, falseLabel);
      this.intcode(["LAB", trueLabel]);
      this.intcodeStatement(statement.thenStatement);
      this.intcode(["BR", nextLabel]);
      this.intcode(["LAB", falseLabel]);
      this.intcodeStatement(statement.elseStatement);
      this.intcode(["LAB", nextLabel]);
      return;
    }

    this.intcodeControlFlowExpression(statement.expression, trueLabel, falseLabel);
    this.intcode(["LAB", trueLabel]);
    this.intcodeStatement(statement.thenStatement)
    this.intcode(["LAB", falseLabel]);
  }

  private intcodeWhileStatement(statement: WhileStatement): void {
    assert(statement.kind == SyntaxKind.WhileStatement);
    const lbegin = this.allocLabel();
    const ltrue = this.allocLabel();
    const lnext = this.allocLabel();

    this.intcode(["LAB", lbegin]);
    this.intcodeControlFlowExpression(statement.expression, ltrue, lnext);
    this.intcode(["LAB", ltrue]);
    this.intcodeStatement(statement.statement);
    this.intcode(["BR", lbegin]);
    this.intcode(["LAB", lnext]);
  }

  private intcodeDoStatement(statement: DoStatement): void {
    assert(statement.kind == SyntaxKind.DoStatement);
    const lbegin = this.allocLabel();

    // TODO: this label does nothing when the expression is:
    // do {...} while(<any truthy value>)
    this.intcode(["LAB", lbegin]);
    this.intcodeStatement(statement.statement);
    this.intcodeControlFlowExpression(statement.expression, lbegin);
  }

  private intcodeStatement(statement: Statement): void {
    switch (statement.kind) {
      case SyntaxKind.VariableStatement:
        this.intcodeVariableStatement(statement as VariableStatement);
        break
      case SyntaxKind.ExpressionStatement:
        this.intcodeExpression((statement as ExpressionStatement).expression);
        break
      case SyntaxKind.IfStatement:
        this.intcodeIfStatement(statement as IfStatement);
        break
      case SyntaxKind.WhileStatement:
        this.intcodeWhileStatement(statement as WhileStatement);
        break
      case SyntaxKind.DoStatement:
        this.intcodeDoStatement(statement as DoStatement);
        break
      case SyntaxKind.Block:
        this.intcodeBlock(statement as Block);
        break
    }
  }

  public generate() {
    for (const statement of this.source.statements)
      this.intcodeStatement(statement);
    return this.intcodes;
  }
}
