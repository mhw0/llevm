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