import {test} from "tap"
import {createTestSource} from "./source";
import {IntermediateCode} from "../src/intcode";

test("intermediate code addition", function (testcase) {
  const source = createTestSource("var a=1+2; var b=(a+=4)+(a=2)+a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["ADD", "a", ".%1", ".%2"], // a=1+2
    ["ADD", "a", "a", ".%4"],   // a=a+4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["ADD", "@t0", "a", "a"],   // t0=(a)+(a)
    ["ADD", "b", "@t0", "a"],   // b=@t0+a
  ]);
  testcase.end();
});

test("intermediate code subtraction", function (testcase) {
  const source = createTestSource("var a=1-2; var b=(a-=4)-(a=2)-a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["SUB", "a", ".%1", ".%2"], // a=1-2
    ["SUB", "a", "a", ".%4"],   // a=a-4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["SUB", "@t0", "a", "a"],   // t0=(a)-(a)
    ["SUB", "b", "@t0", "a"],   // b=@t0-a
  ]);
  testcase.end();
});

test("intermediate code multiplication", function (testcase) {
  const source = createTestSource("var a=1*2; var b=(a*=4)*(a=2)*a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["MULT", "a", ".%1", ".%2"], // a=1*2
    ["MULT", "a", "a", ".%4"],   // a=a*4
    ["COPY", "a", "a", ".%2"],   // a=2
    ["MULT", "@t0", "a", "a"],   // t0=(a)*(a)
    ["MULT", "b", "@t0", "a"],   // b=@t0*a
  ]);
  testcase.end();
});

test("intermediate code division", function (testcase) {
  const source = createTestSource("var a=1/2; var b=(a/=4)/(a=2)/a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["DIV", "a", ".%1", ".%2"], // a=1/2
    ["DIV", "a", "a", ".%4"],   // a=a/4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["DIV", "@t0", "a", "a"],   // t0=(a)/(a)
    ["DIV", "b", "@t0", "a"],   // b=@t0/a
  ]);
  testcase.end();
});

test("intermediate code modulo", function (testcase) {
  const source = createTestSource("var a=1%2; var b=(a%=4)%(a=2)%a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["MOD", "a", ".%1", ".%2"], // a=1%2
    ["MOD", "a", "a", ".%4"],   // a=a%4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["MOD", "@t0", "a", "a"],   // t0=(a)%(a)
    ["MOD", "b", "@t0", "a"],   // b=@t0%a
  ]);
  testcase.end();
});

test("intermediate code exponent", function (testcase) {
  const source = createTestSource("var a=1**2; var b=((a**=4)**(a=2))**a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["EXP", "a", ".%1", ".%2"], // a=1**2
    ["EXP", "a", "a", ".%4"],   // a=a**4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["EXP", "@t0", "a", "a"],   // t0=(a)**(a)
    ["EXP", "b", "@t0", "a"],   // b=(@t0)**a
  ]);
  testcase.end();
});

test("intermediate code bitwise left shift", function (testcase) {
  const source = createTestSource("var a=1<<2; var b=((a<<=4)<<(a=2))<<a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["SHL", "a", ".%1", ".%2"], // a=1<<2
    ["SHL", "a", "a", ".%4"],   // a=a<<4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["SHL", "@t0", "a", "a"],   // t0=(a)<<(a)
    ["SHL", "b", "@t0", "a"],   // b=(@t0)<<a
  ]);
  testcase.end();
});

test("intermediate code bitwise right shift", function (testcase) {
  const source = createTestSource("var a=1>>2; var b=((a>>=4)>>(a=2))>>a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["SAR", "a", ".%1", ".%2"], // a=1>>2
    ["SAR", "a", "a", ".%4"],   // a=a>>4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["SAR", "@t0", "a", "a"],   // t0=(a)>>(a)
    ["SAR", "b", "@t0", "a"],   // b=(@t0)>>a
  ]);
  testcase.end();
});

test("intermediate code bitwise unsigned right shift", function (testcase) {
  const source = createTestSource("var a=1>>>2; var b=((a>>>=4)>>>(a=2))>>>a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["SHR", "a", ".%1", ".%2"], // a=1>>>2
    ["SHR", "a", "a", ".%4"],   // a=a>>>4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["SHR", "@t0", "a", "a"],   // t0=(a)>>>(a)
    ["SHR", "b", "@t0", "a"],   // b=(@t0)>>>a
  ]);
  testcase.end();
});

test("intermediate code bitwise AND", function (testcase) {
  const source = createTestSource("var a=1&2; var b=((a&=4)&(a=2))&a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["AND", "a", ".%1", ".%2"], // a=1&2
    ["AND", "a", "a", ".%4"],   // a=a&4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["AND", "@t0", "a", "a"],   // t0=(a)&(a)
    ["AND", "b", "@t0", "a"],   // b=(@t0)&a
  ]);
  testcase.end();
});

test("intermediate code bitwise XOR", function (testcase) {
  const source = createTestSource("var a=1^2; var b=((a^=4)^(a=2))^a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["XOR", "a", ".%1", ".%2"], // a=1^2
    ["XOR", "a", "a", ".%4"],   // a=a^4
    ["COPY", "a", "a", ".%2"],  // a=2
    ["XOR", "@t0", "a", "a"],   // t0=(a)^(a)
    ["XOR", "b", "@t0", "a"],   // b=(@t0)^a
  ]);
  testcase.end();
});

test("intermediate code bitwise OR", function (testcase) {
  const source = createTestSource("var a=1|2; var b=((a|=4)|(a=2))|a");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["OR", "a", ".%1", ".%2"], // a=1|2
    ["OR", "a", "a", ".%4"],   // a=a|4
    ["COPY", "a", "a", ".%2"], // a=2
    ["OR", "@t0", "a", "a"],   // t0=(a)|(a)
    ["OR", "b", "@t0", "a"],   // b=(@t0)|a
  ]);
  testcase.end();
});

test("intermediate code bitwise NOT", function (testcase) {
  const source = createTestSource("var a=1|(~b)");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["NOT", "@t0", "b"],       // t0=~b
    ["OR", "a", ".%1", "@t0"], // a=1|t0
  ]);
  testcase.end();
});
