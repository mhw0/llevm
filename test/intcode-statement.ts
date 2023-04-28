import {test} from "tap"
import {createTestSource} from "./source";
import {IntermediateCode} from "../src/intcode";

test("intermediate code variable declaration", function (testcase) {
  const source = createTestSource("var a=3; var b=a;");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["COPY", "a", ".%3"],
    ["COPY", "b", "a"]
  ]);
  testcase.end();
});

test("intermediate code if statement", function (testcase) {
  const source = createTestSource("if (i > 8) {b=3}");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["BGT", "L0", "i", ".%8"],
    ["BR", "L1"],
    ["LAB", "L0"],
    ["COPY", "b", ".%3"],
    ["LAB", "L1"]
  ]);
  testcase.end();
});

test("intermediate code if else statement", function (testcase) {
  const source = createTestSource("if (i > a) {b=3} else {b=2}");
  const intcodes = new IntermediateCode(source).generate();
  testcase.same(intcodes, [
    ["BGT", "L0", "i", "a"],
    ["BR", "L1"],
    ["LAB", "L0"],
    ["COPY", "b", ".%3"],
    ["BR", "L2"],
    ["LAB", "L1"],
    ["COPY", "b", ".%2"],
    ["LAB", "L2"]
  ]);
  testcase.end();
});
