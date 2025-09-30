"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSearchParams } from "next/navigation";

type Task = {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "done";
  created_at: string;
};

type ChangedData = {
  title?: string;
  description?: string;
  status?: "pending" | "in_progress" | "done" | "deleted";
  user_id?: string; 
};

type Revision = {
  id: string;
  task_id: string;
  profile_id: string;
  action: "create" | "update" | "delete";
  changed_data: ChangedData;
  created_at: string;
  profile_username?: string;
};

type Profile = {
  id: string;
  username: string;
};

export default function AdminTodosPage() {
  const searchParams = useSearchParams();
  const profileIdFromUrl = searchParams.get("profileId") || "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  
  useEffect(() => {
    if (!profileIdFromUrl) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", profileIdFromUrl)
        .single();

      if (error) console.error(error);
      else setProfile(data);
    };

    fetchProfile();
  }, [profileIdFromUrl]);

  
  useEffect(() => {
    if (!profileIdFromUrl) return;

    const fetchTasksAndRevisions = async () => {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("profile_id", profileIdFromUrl)
        .order("created_at", { ascending: true });

      if (taskError) console.error(taskError);
      else setTasks(taskData || []);

      
      const { data: revData, error: revError } = await supabase
        .from("revisions")
        .select("*, profile_id")
        .eq("profile_id", profileIdFromUrl)
        .order("created_at", { ascending: true });

      if (revError) {
        console.error(revError);
        setRevisions([]);
        return;
      }

      
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, username");

      const revWithUsername: Revision[] = (revData || []).map((r) => {
        const prof = allProfiles?.find((p) => p.id === r.profile_id);
        return { ...r, profile_username: prof?.username || "Nepoznat" };
      });

      setRevisions(revWithUsername);
    };

    fetchTasksAndRevisions();
  }, [profileIdFromUrl]);

  const handleAddTask = async () => {
    if (!newTitle.trim() || !profileIdFromUrl) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("tasks")
      .insert([{ profile_id: profileIdFromUrl, title: newTitle, description: newDescription }])
      .select();

    setLoading(false);

    if (error) console.error(error);
    else if (data && data[0]) {
      setTasks([...tasks, data[0]]);

      
      await supabase.from("revisions").insert([{
        task_id: data[0].id,
        profile_id: profileIdFromUrl,
        action: "create",
        changed_data: { title: newTitle, description: newDescription }
      }]);
    }

    setNewTitle("");
    setNewDescription("");
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "pending" : "done";
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, updated_at: new Date() })
      .eq("id", task.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      await supabase.from("revisions").insert([{
        task_id: task.id,
        profile_id: profileIdFromUrl,
        action: "update",
        changed_data: { status: newStatus }
      }]);
    } else console.error(error);
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId));
      await supabase.from("revisions").insert([{
        task_id: taskId,
        profile_id: profileIdFromUrl,
        action: "delete",
        changed_data: {}
      }]);
    } else console.error(error);
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description || "");
  };

  const saveEditing = async () => {
    if (!editingTaskId) return;
    const { error } = await supabase
      .from("tasks")
      .update({ title: editingTitle, description: editingDescription, updated_at: new Date() })
      .eq("id", editingTaskId);

    if (!error) {
      setTasks(tasks.map(t =>
        t.id === editingTaskId ? { ...t, title: editingTitle, description: editingDescription } : t
      ));

      await supabase.from("revisions").insert([{
        task_id: editingTaskId,
        profile_id: profileIdFromUrl,
        action: "update",
        changed_data: { title: editingTitle, description: editingDescription }
      }]);

      setEditingTaskId(null);
      setEditingTitle("");
      setEditingDescription("");
    } else console.error(error);
  };

  return (
    <div className="admin-dashboard">
  <h1>Admin - Zadaci za profil: {profile?.username || "Nepoznat profil"}</h1>

  <div className="task-add-form">
    <input
      type="text"
      placeholder="Naslov zadatka"
      value={newTitle}
      onChange={(e) => setNewTitle(e.target.value)}
    />
    <input
      type="text"
      placeholder="Opis zadatka"
      value={newDescription}
      onChange={(e) => setNewDescription(e.target.value)}
    />
    <button onClick={handleAddTask} disabled={loading}>
      {loading ? "Dodavanje..." : "Dodaj zadatak"}
    </button>
  </div>

  <ul className="task-list">
    {tasks.map((task) => (
      <li key={task.id} className="task-item">
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={() => toggleTaskStatus(task)}
      />
      {editingTaskId === task.id ? (
        <>
          <input
            style={{marginTop: "18px"}}
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
          />
          <input
            style={{marginTop: "5px"}}
            type="text"
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
          />
          <div className="task-actions">
            <button onClick={saveEditing}>Spremi</button>
            <button onClick={() => setEditingTaskId(null)}>Odustani</button>
          </div>
        </>
      ) : (
        <>
          <span className="task-info">
            <strong>{task.title}</strong>: {task.description} ({task.status})
          </span>
    
          <div className="task-actions">
            <button onClick={() => startEditing(task)}>Uredi</button>
            <button onClick={() => handleDeleteTask(task.id)}>Izbriši</button>
            <span
              className="revisions-toggle"
              onClick={() =>
                document
                  .getElementById(`revisions-${task.id}`)
                  ?.classList.toggle("open")
              }
            >
              ▼
            </span>
          </div>
    
          <ul id={`revisions-${task.id}`} className="revisions-dropdown">
            {revisions
              .filter((r) => r.task_id === task.id)
              .map((r) => (
                <li key={r.id}>
                  [{new Date(r.created_at).toLocaleString()}] {r.action} -{" "}
                  {JSON.stringify(r.changed_data)}
                </li>
              ))}
          </ul>
        </>
      )}
    </li>
    
    ))}
  </ul>
</div>


  );
}
