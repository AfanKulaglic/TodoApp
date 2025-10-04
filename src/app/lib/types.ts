export type Task = {
    id: string;
    profile_id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "done";
    created_at: string;
    due_at?: string | null;
  };
  
  export type ChangedData = {
    title?: string;
    description?: string;
    status?: "pending" | "in_progress" | "done" | "deleted";
    user_id?: string;
    due_at?: string | null;
  };
  
  export type Revision = {
    id: string;
    task_id: string;
    profile_id: string;
    action: "create" | "update" | "delete";
    changed_data: ChangedData;
    created_at: string;
    profile_username?: string;
  };
  
  export type Profile = {
    id: string;
    username: string;
  };
  