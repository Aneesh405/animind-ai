export type Concept =
  | "projectile_motion"
  | "linear_function"
  | "quadratic_function"
  | "simple_pendulum"
  | "newtons_second_law"
  | "water_molecule"
  | "animal_cell"
  | "bubble_sort";
export type Subject =
  | "Mathematics"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "Computer Science";
export const subjects: Subject[] = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
];
export const registry: Record<
  Concept,
  {
    subject: Subject;
    title: string;
    question: string;
    defaults: Record<string, number | number[]>;
  }
> = {
  simple_pendulum: {
    subject: "Physics",
    title: "Simple pendulum",
    question: "How does length change a simple pendulum’s period?",
    defaults: { length: 1, angle: 10, gravity: 9.81 },
  },
  newtons_second_law: {
    subject: "Physics",
    title: "Newton’s second law",
    question:
      "How does Newton’s second law relate force, mass, and acceleration?",
    defaults: { mass: 2, force: 6 },
  },
  water_molecule: {
    subject: "Chemistry",
    title: "Water molecule",
    question: "Why is the water molecule bent and polar?",
    defaults: {},
  },
  animal_cell: {
    subject: "Biology",
    title: "Animal cell",
    question: "What do the structures in an animal cell do?",
    defaults: {},
  },
  bubble_sort: {
    subject: "Computer Science",
    title: "Bubble sort",
    question: "How does bubble sort compare and swap numbers?",
    defaults: { values: [5, 1, 4, 2, 8] },
  },
  projectile_motion: {
    subject: "Physics",
    title: "Projectile motion",
    question: "Why is projectile range greatest at 45 degrees?",
    defaults: { angle: 45, speed: 20, gravity: 9.81 },
  },
  linear_function: {
    subject: "Mathematics",
    title: "Linear function",
    question: "How do slope and intercept change a linear function?",
    defaults: { m: 1, b: 0 },
  },
  quadratic_function: {
    subject: "Mathematics",
    title: "Quadratic function",
    question: "How do the coefficients change a quadratic function?",
    defaults: { a: 1, b: 0, c: 0 },
  },
};
export function quadratic(a: number, b: number, c: number) {
  if (a === 0)
    return {
      vertex: null,
      roots: b === 0 ? [] : [-c / b],
      kind:
        b === 0
          ? c === 0
            ? "All real x are zeros"
            : "Constant: no x-intercept"
          : "Linear",
    };
  const x = -b / (2 * a),
    d = b * b - 4 * a * c;
  // Stable roots avoid subtracting nearly equal numbers.
  const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, d)));
  return {
    vertex: [x, a * x * x + b * x + c],
    roots: d < 0 ? [] : d === 0 ? [x] : [q / a, c / q].sort((u, v) => u - v),
    kind: a > 0 ? "Opens upward" : "Opens downward",
  };
}
export const linearValue = (m: number, b: number, x: number) => m * x + b;

export const pendulumPeriod = (length: number, gravity: number) =>
  2 * Math.PI * Math.sqrt(length / gravity);
export const acceleration = (force: number, mass: number) => force / mass;

export interface SortStep {
  values: number[];
  pair: number[];
  kind: "compare" | "swap" | "done";
  text: string;
}
export function bubbleSteps(input: number[]): SortStep[] {
  const values = [...input];
  const steps: SortStep[] = [];
  for (let end = values.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      steps.push({
        values: [...values],
        pair: [i, i + 1],
        kind: "compare",
        text: `Compare ${values[i]} and ${values[i + 1]}. ${values[i] > values[i + 1] ? "The left value is larger; swap next." : "Already in order; keep this pair."}`,
      });
      if (values[i] > values[i + 1]) {
        const left = values[i],
          right = values[i + 1];
        [values[i], values[i + 1]] = [values[i + 1], values[i]];
        swapped = true;
        steps.push({
          values: [...values],
          pair: [i, i + 1],
          kind: "swap",
          text: `Swap ${left} and ${right}.`,
        });
      }
    }
    if (!swapped) break;
  }
  steps.push({
    values: [...values],
    pair: [],
    kind: "done",
    text: "Complete: all values are in ascending order.",
  });
  return steps;
}
export const organelles = {
  "Cell membrane":
    "A selectively permeable boundary that regulates exchange and communication with the surroundings.",
  Cytoplasm:
    "The contents inside the cell membrane, excluding the nucleus; many metabolic reactions occur in its fluid cytosol.",
  Nucleus:
    "Houses most cellular DNA and supports regulation of gene expression.",
  Mitochondria:
    "Support cellular respiration, producing much of the ATP used to power cell processes.",
  Ribosomes: "Translate messenger RNA to synthesize proteins.",
};
export const waterParts = {
  Oxygen:
    "One oxygen atom. It attracts shared electrons more strongly than hydrogen, giving oxygen a partial negative charge.",
  "Hydrogen 1":
    "One of two hydrogen atoms. Each has a partial positive charge in water.",
  "Hydrogen 2":
    "One of two hydrogen atoms. Each shares an electron pair with oxygen.",
  "Bond 1":
    "An O–H polar covalent bond: a shared electron pair attracted more strongly by oxygen.",
  "Bond 2":
    "An O–H polar covalent bond. The two bonds meet at approximately 104.5°.",
};
