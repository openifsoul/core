import "@ifsoul/example-friendly-21/style.css";
import "@ifsoul/example-dungeon/style.css";
import type { GameCharacter } from "@ifsoul/adapter-sdk";
export const DEMO_CHARACTERS: (GameCharacter & { description: string })[] = [
  {
    id: "mira",
    name: "Mira",
    temperament: "careful",
    description: "A patient gardener: thoughtful, protective and precise.",
  },
  {
    id: "rook",
    name: "Rook",
    temperament: "bold",
    description:
      "A cheerful competitor: decisive, daring and a gracious loser.",
  },
  {
    id: "pip",
    name: "Pip",
    temperament: "curious",
    description:
      "An inquisitive little automaton: playful, observant and fascinated by new worlds.",
  },
];
export const DEMO_GAMES = [
  {
    id: "garden",
    name: "Garden",
    engine: "PixiJS",
    description:
      "Watch your companion fetch water, tend plants and gather fruit.",
    load: () => import("@ifsoul/example-garden"),
  },
  {
    id: "cards",
    name: "Friendly 21",
    engine: "HTML · CSS · JavaScript",
    description:
      "Play five rounds against your companion. Hit or stand; closest to 21 wins.",
    load: () => import("@ifsoul/example-friendly-21"),
  },
  {
    id: "dungeon",
    name: "Dungeon",
    engine: "Phaser",
    description:
      "Choose tank or healer. Clear three rooms and face the boss together.",
    load: () => import("@ifsoul/example-dungeon"),
  },
] as const;
