export type List = {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  created_at: string;
};

export type Item = {
  id: string;
  list_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_by: string | null;
  done_by: string | null;
  created_at: string;
};
