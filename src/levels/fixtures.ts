import type { Level } from "./types";

export const FIXTURE_LEVELS: readonly Level[] = [
  {
    date: "0000-00-00",
    name: "Test: basic pathfinding",
    map: [
      "~~~~~.~",
      "~......",
      "~.....~",
      "~..H..~",
      "~.....~",
      "~.....~",
      "~~~~~~~",
    ].join("\n"),
    budget: 1,
    optimalScore: 24,
  },
];
