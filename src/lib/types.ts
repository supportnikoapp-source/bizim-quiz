export type RoomStatus = "waiting" | "intro" | "rules" | "playing" | "finished";

export type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  host_name: string;
  guest_name: string | null;
  status: RoomStatus;
  question_index: number;
  host_share: boolean;
  guest_share: boolean;
  host_ready: boolean;
  guest_ready: boolean;
  share_request_from: string | null;
  created_at: string;
};

export type SubmissionRow = {
  room_id: string;
  player_id: string;
  question_id: string;
  created_at: string;
};

export type AnswerRow = {
  id: string;
  room_id: string;
  player_id: string;
  question_id: string;
  body: string;
};

export type RatingRow = {
  room_id: string;
  rater_id: string;
  question_id: string;
  score: number;
};

export type AnswerLockRow = {
  room_id: string;
  player_id: string;
  question_id: string;
  created_at: string;
};

export type PeekRoom = {
  exists: boolean;
  full: boolean;
  code?: string;
  host_name?: string;
  status?: RoomStatus;
};

export type SharedAnswerRow = {
  player_id: string;
  player_name: string;
  question_id: string;
  body: string | null;
  locked: boolean;
  shared: boolean;
};

export type SharedAnswersView = {
  exists: boolean;
  code?: string;
  host_name?: string;
  guest_name?: string | null;
  host_share?: boolean;
  guest_share?: boolean;
  answers?: SharedAnswerRow[];
};
