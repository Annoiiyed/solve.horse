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
  {
    date: "0000-00-01",
    // Same map as first test, but with a different optimal solution that needs 2 walls
    name: "Test: two-wall optimum",
    map: [
      "~~~~~.~",
      "~......",
      "~.....~",
      "~..H..~",
      "~.....~",
      "~.....~",
      "~~~~~~~",
    ].join("\n"),
    budget: 2,
    optimalScore: 25,
  },
];
