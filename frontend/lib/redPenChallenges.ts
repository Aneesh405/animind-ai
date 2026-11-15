import type { Parameters, SceneType } from "./types";

export type RedPenTopic =
  | "maximum_range"
  | "velocity_components"
  | "complementary_angles";

export interface RedPenStatement {
  text: string;
  rationale: string;
}

export interface RedPenVisualization {
  mode: SceneType;
  angle: number;
  compare: boolean;
  comparisonAngles?: number[];
  caption: string;
  prompt: string;
}

export interface RedPenChallenge {
  id: string;
  title: string;
  topic: RedPenTopic;
  assumptions: string[];
  statements: [RedPenStatement, RedPenStatement, RedPenStatement];
  incorrectStatementIndex: number;
  misconceptionExplanation: string;
  correctExplanation: string;
  hint: string;
  visualization: RedPenVisualization;
}

export const RED_PEN_CHALLENGES: readonly RedPenChallenge[] = [
  {
    id: "maximum-range",
    title: "Which angle wins?",
    topic: "maximum_range",
    assumptions: [
      "Same launch speed",
      "Equal launch and landing heights",
      "No air resistance",
      "Constant downward gravity",
    ],
    statements: [
      {
        text: "A 45° launch produces the greatest horizontal range.",
        rationale:
          "This is accurate under the stated assumptions because range is proportional to sin(2θ), which reaches its maximum at 45°.",
      },
      {
        text: "A 60° launch travels farther than 45° because it stays in the air longer.",
        rationale:
          "This is the misconception. The extra airtime at 60° does not compensate for its lower horizontal velocity.",
      },
      {
        text: "Horizontal range depends on both sideways speed and time in the air.",
        rationale:
          "This is accurate: for this equal-height model, horizontal range is horizontal velocity multiplied by flight time.",
      },
    ],
    incorrectStatementIndex: 1,
    misconceptionExplanation:
      "Airtime alone does not determine range. Tilting the launch upward gives the projectile more airtime while reducing the part of its speed that carries it sideways.",
    correctExplanation:
      "At the same speed and gravity, 45° gives the greatest ideal equal-height range. The 30° and 60° launches travel the same shorter horizontal distance for different reasons.",
    hint: "Compare sideways speed and airtime together, not either quantity alone.",
    visualization: {
      mode: "trajectories",
      angle: 45,
      compare: true,
      comparisonAngles: [30, 45, 60],
      caption: "Three launches · one speed",
      prompt: "Watch where each calculated path lands. The 45° path reaches farthest.",
    },
  },
  {
    id: "velocity-at-apex",
    title: "What stops at the top?",
    topic: "velocity_components",
    assumptions: [
      "No air resistance",
      "Constant downward gravity",
      "No horizontal force during flight",
      "Motion shown before impact",
    ],
    statements: [
      {
        text: "Horizontal velocity remains constant during ideal flight.",
        rationale:
          "This is accurate because no horizontal force acts in the ideal no-drag model.",
      },
      {
        text: "At the highest point, both horizontal and vertical velocity are zero.",
        rationale:
          "This is the misconception. Only the vertical component is zero at the apex; the projectile is still moving horizontally.",
      },
      {
        text: "Gravity changes vertical velocity throughout the flight, including at the highest point.",
        rationale:
          "This is accurate. Gravity remains downward at the apex and immediately makes the vertical velocity negative afterward.",
      },
    ],
    incorrectStatementIndex: 1,
    misconceptionExplanation:
      "The apex is a turning point for vertical motion, not a moment when the projectile stops completely. Its vertical velocity is zero for an instant while its horizontal velocity remains nonzero.",
    correctExplanation:
      "Without air resistance, horizontal velocity stays constant. Gravity steadily changes vertical velocity from upward, to zero at the apex, to downward on descent.",
    hint: "Treat the horizontal and vertical components as separate jobs.",
    visualization: {
      mode: "components",
      angle: 45,
      compare: false,
      caption: "One flight · two velocity components",
      prompt: "Scrub to 50% to inspect the apex: vᵧ is zero while vₓ remains nonzero and gravity still points down.",
    },
  },
  {
    id: "complementary-ranges",
    title: "Same landing, same journey?",
    topic: "complementary_angles",
    assumptions: [
      "Same launch speed",
      "Equal launch and landing heights",
      "No air resistance",
      "Constant downward gravity",
    ],
    statements: [
      {
        text: "The 30° and 60° launches have the same horizontal range.",
        rationale:
          "This is accurate because complementary launch angles have the same value of sin(2θ) in the ideal equal-height range equation.",
      },
      {
        text: "The 60° launch reaches a greater height and stays in the air longer than the 30° launch.",
        rationale:
          "This is accurate because 60° has a larger initial vertical velocity component.",
      },
      {
        text: "Because their ranges are equal, the 30° and 60° launches follow the same path.",
        rationale:
          "This is the misconception. Equal landing distance does not mean equal height, airtime, sideways speed, or trajectory shape.",
      },
    ],
    incorrectStatementIndex: 2,
    misconceptionExplanation:
      "Two projectiles can land at the same horizontal position while taking very different routes. The lower launch moves sideways faster; the steeper launch spends longer in the air.",
    correctExplanation:
      "At equal speed, 30° and 60° have equal ideal range. The 60° path is higher and longer in time, while the 30° path has greater horizontal velocity.",
    hint: "Compare the endpoints first, then compare the path shapes and flight times.",
    visualization: {
      mode: "trajectories",
      angle: 30,
      compare: true,
      comparisonAngles: [30, 60],
      caption: "Complementary angles · equal range",
      prompt: "Both paths land together horizontally, but the 60° path climbs higher and remains airborne longer.",
    },
  },
] as const;

export function challengeParameters(
  challenge: RedPenChallenge,
  current: Parameters,
): Parameters {
  return { ...current, angle: challenge.visualization.angle };
}

export function validateRedPenBank(
  challenges: readonly RedPenChallenge[] = RED_PEN_CHALLENGES,
): boolean {
  return (
    challenges.length >= 3 &&
    new Set(challenges.map((challenge) => challenge.id)).size === challenges.length &&
    challenges.every(
      (challenge) =>
        challenge.statements.length === 3 &&
        Number.isInteger(challenge.incorrectStatementIndex) &&
        challenge.incorrectStatementIndex >= 0 &&
        challenge.incorrectStatementIndex < challenge.statements.length,
    )
  );
}
