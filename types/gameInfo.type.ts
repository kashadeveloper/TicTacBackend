export default interface gameInfoProps {
  players: string[];
  board: Array<String[]>;
  playsNow: string;
  gameId: string;
  designation: { [index: string]: string };
  nextIndex: number;
}
