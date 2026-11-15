import { calculate } from "./physics";
import type { Lesson, Parameters, SceneType, TopicId } from "./types";

export type GuidedVisualCue =
  | "show_initial_state"
  | "play_ascent"
  | "highlight_gravity"
  | "hold_at_apex"
  | "play_descent"
  | "show_angle_comparison";

export type GuidedHighlightTarget =
  | "projectile"
  | "initial_velocity"
  | "horizontal_velocity"
  | "vertical_velocity"
  | "gravity_arrow"
  | "angle_comparison";

export interface GuidedScene {
  id: string;
  subject: "physics";
  conceptId: TopicId;
  title: string;
  narration: string;
  caption: string;
  visualizationId: SceneType;
  parameters: Parameters;
  visualCue: GuidedVisualCue;
  highlightTargets: GuidedHighlightTarget[];
  progressStart: number;
  progressEnd: number;
  visualDurationMs: number;
  interactionPrompt?: string;
}

export interface GuidedLessonDefinition {
  conceptId: TopicId;
  subject: "physics";
  scenes: GuidedScene[];
}

type GuidedLessonBuilder = (lesson: Lesson, parameters: Parameters) => GuidedLessonDefinition;

function projectileLesson(lesson: Lesson, parameters: Parameters): GuidedLessonDefinition {
  const metrics = calculate(parameters);
  const shared = { subject: "physics" as const, conceptId: lesson.topic, parameters };
  return {
    conceptId: lesson.topic,
    subject: "physics",
    scenes: [
      {
        ...shared,
        id: "launch",
        title: "The launch",
        narration: `Watch the ball launch at ${parameters.angle} degrees. Its initial velocity has a horizontal part of ${metrics.horizontal_velocity.toFixed(1)} meters per second and a vertical part of ${metrics.vertical_velocity.toFixed(1)} meters per second.`,
        caption: "One launch velocity. Two components with different jobs.",
        visualizationId: "components",
        visualCue: "show_initial_state",
        highlightTargets: ["initial_velocity", "horizontal_velocity", "vertical_velocity"],
        progressStart: 0,
        progressEnd: 0,
        visualDurationMs: 0,
      },
      {
        ...shared,
        id: "ascent",
        title: "Moving upward",
        narration: "Watch the ball rise. It keeps moving forward while its upward velocity gets smaller.",
        caption: "Horizontal velocity stays constant while upward velocity shrinks.",
        visualizationId: "components",
        visualCue: "play_ascent",
        highlightTargets: ["projectile", "horizontal_velocity", "vertical_velocity"],
        progressStart: 0.04,
        progressEnd: 0.43,
        visualDurationMs: 3600,
      },
      {
        ...shared,
        id: "gravity",
        title: "Gravity never switches off",
        narration: `Gravity points downward at ${parameters.gravity} meters per second squared during the entire flight, even while the ball is rising.`,
        caption: "Gravity is downward during ascent, at the apex, and during descent.",
        visualizationId: "components",
        visualCue: "highlight_gravity",
        highlightTargets: ["gravity_arrow", "projectile"],
        progressStart: 0.24,
        progressEnd: 0.43,
        visualDurationMs: 2600,
      },
      {
        ...shared,
        id: "apex",
        title: "The highest point",
        narration: `At the highest point, vertical velocity is zero for an instant. Horizontal velocity is still ${metrics.horizontal_velocity.toFixed(1)} meters per second.`,
        caption: "At the apex: vertical velocity is zero; horizontal velocity remains.",
        visualizationId: "components",
        visualCue: "hold_at_apex",
        highlightTargets: ["projectile", "horizontal_velocity", "vertical_velocity"],
        progressStart: 0.5,
        progressEnd: 0.5,
        visualDurationMs: 0,
      },
      {
        ...shared,
        id: "descent",
        title: "Falling",
        narration: "Now the ball falls. Its downward speed increases while it continues moving horizontally.",
        caption: "Vertical velocity points down and grows; horizontal velocity stays constant.",
        visualizationId: "components",
        visualCue: "play_descent",
        highlightTargets: ["projectile", "horizontal_velocity", "vertical_velocity", "gravity_arrow"],
        progressStart: 0.57,
        progressEnd: 1,
        visualDurationMs: 3800,
      },
      {
        ...shared,
        id: "angles",
        title: "Comparing angles",
        narration: "Under ideal conditions with equal launch and landing heights, 45 degrees gives the greatest horizontal range. Thirty and 60 degrees travel the same distance because sideways speed and airtime trade places.",
        caption: "Fixed speed and gravity: 45° is farthest; 30° and 60° have equal range.",
        visualizationId: "range_comparison",
        visualCue: "show_angle_comparison",
        highlightTargets: ["angle_comparison"],
        progressStart: 0,
        progressEnd: 1,
        visualDurationMs: 4200,
        interactionPrompt: "After the guide, change the angle in Explore Freely and compare the result.",
      },
    ],
  };
}

const GUIDED_LESSON_REGISTRY: Record<TopicId, GuidedLessonBuilder> = {
  projectile_motion: projectileLesson,
  launch_angles: projectileLesson,
  velocity_components: projectileLesson,
};

export function buildGuidedLesson(lesson: Lesson, parameters: Parameters) {
  return GUIDED_LESSON_REGISTRY[lesson.topic]?.(lesson, parameters) ?? null;
}

export function supportsGuidedLesson(topic: string): topic is TopicId {
  return topic in GUIDED_LESSON_REGISTRY;
}
