import { createElement, type ReactNode } from "react";
import type { Step } from "../lib/types";

// Native MathML keeps canonical equations semantic, selectable, and dependency-free.
// All expressions below are server-owned equation keys, never generated markup.
const node = (tag: string, ...children: ReactNode[]) => createElement(tag, null, ...children);
const v = (sub: string) => node("msub", node("mi", "v"), node("mi", sub));
const power = (base: ReactNode, exponent: string) => node("msup", base, node("mn", exponent));
const theta = () => node("mi", "θ");
const sin = (angle: ReactNode) => node("mrow", node("mi", "sin"), node("mo", "("), angle, node("mo", ")"));
const cos = () => node("mrow", node("mi", "cos"), node("mo", "("), theta(), node("mo", ")"));

export default function Equation({ equationKey }: { equationKey: Step["equation_key"] }) {
  const expressions = {
    components: {
      label: "Horizontal velocity equals initial speed times cosine theta. Initial vertical velocity equals initial speed times sine theta.",
      value: node("mrow", v("x"), node("mo", "="), v("0"), cos(), node("mspace", ""), node("mo", ","), v("y0"), node("mo", "="), v("0"), sin(theta())),
    },
    flight_time: {
      label: "Flight time equals two times initial speed times sine theta, divided by gravity.",
      value: node("mrow", node("mi", "T"), node("mo", "="), node("mfrac", node("mrow", node("mn", "2"), v("0"), sin(theta())), node("mi", "g"))),
    },
    range: {
      label: "Range equals initial speed squared times sine two theta, divided by gravity. Range also equals horizontal speed times flight time.",
      value: node("mrow", node("mi", "R"), node("mo", "="), node("mfrac", node("mrow", power(v("0"), "2"), sin(node("mrow", node("mn", "2"), theta()))), node("mi", "g")), node("mo", "="), v("x"), node("mi", "T")),
    },
    height: {
      label: "Maximum height equals initial speed squared times sine squared theta, divided by two times gravity.",
      value: node("mrow", node("mi", "H"), node("mo", "="), node("mfrac", node("mrow", power(v("0"), "2"), power(sin(theta()), "2")), node("mrow", node("mn", "2"), node("mi", "g")))),
    },
  };
  const equation = expressions[equationKey];
  return createElement("math", { display: "block", "aria-label": equation.label, className: "equation" }, equation.value);
}
