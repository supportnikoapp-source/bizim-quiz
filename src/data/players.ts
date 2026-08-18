export type PlayerId = "ilkin" | "fidan";

export type Player = {
  id: PlayerId;
  name: string;
  caption: string;
  image: string;
  accent: "lavender" | "sand";
};

export const PLAYERS: Player[] = [
  {
    id: "ilkin",
    name: "İlkin",
    caption: "Mən İlkinəm",
    image: "/players/ilkin.png?v=3",
    accent: "lavender",
  },
  {
    id: "fidan",
    name: "Fidan",
    caption: "Mən Fidanam",
    image: "/players/fidan.png?v=3",
    accent: "sand",
  },
];

export function playerById(id: PlayerId): Player {
  return PLAYERS.find((p) => p.id === id)!;
}
