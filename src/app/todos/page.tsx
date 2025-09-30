"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
  status?: "pending" | "in_progress" | "done";
  user_id?: string;
};

type Revision = {
  id: string;
  task_id: string;
  profile_id: string;
  action: "create" | "update" | "delete";
  changed_data: ChangedData;
  created_at: string;
};

type Profile = {
  id: string;
  username: string;
};

export default function TodosPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  
  useEffect(() => {
    const fetchUserAndProfiles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email ?? null);
      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("account_id", user.id);

      if (error) console.error(error);
      else if (data && data.length > 0) {
        setProfiles(data);
        const savedProfileId = sessionStorage.getItem("selectedProfileId");
        const validProfile = data.find((p) => p.id === savedProfileId);
        setSelectedProfileId(validProfile ? validProfile.id : data[0].id);
      }
    };
    fetchUserAndProfiles();
  }, []);

  
  useEffect(() => {
    if (!selectedProfileId) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("profile_id", selectedProfileId)
        .order("created_at", { ascending: true });

      if (error) console.error(error);
      else setTasks(data || []);
    };

    fetchTasks();
  }, [selectedProfileId]);

  
  const handleAddTask = async () => {
    if (!newTitle.trim() || !selectedProfileId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("tasks")
      .insert([{ profile_id: selectedProfileId, title: newTitle, description: newDescription }])
      .select();

    if (data && data[0]) {
      await supabase.from("revisions").insert([{
        task_id: data[0].id,
        profile_id: selectedProfileId,
        action: "create",
        changed_data: { title: newTitle, description: newDescription, user_id: userId }
      }]);
    }

    setLoading(false);
    if (error) console.error(error);
    else setTasks([...tasks, ...(data || [])]);

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
        profile_id: selectedProfileId,
        action: "update",
        changed_data: { status: newStatus, user_id: userId }
      }]);
    } else console.error(error);
  };

  
  const handleDeleteTask = async (task: Task) => {
    if (!task) return;
  
    try {
      
      const { error: revError } = await supabase.from("revisions").insert([{
        task_id: task.id,           
        profile_id: task.profile_id, 
        action: "delete",
        changed_data: { 
          title: task.title, 
          description: task.description, 
          status: task.status, 
          user_id: userId 
        }
      }]);
  
      if (revError) {
        console.error("Greška pri spremanju revizije:", revError);
        return;
      }
  
      
      const { error: delError } = await supabase.from("tasks").delete().eq("id", task.id);
      if (delError) {
        console.error("Greška pri brisanju zadatka:", delError);
        return;
      }
  
      
      setTasks(tasks.filter(t => t.id !== task.id));
  
    } catch (err) {
      console.error("Neočekivana greška pri brisanju:", err);
    }
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
        profile_id: selectedProfileId,
        action: "update",
        changed_data: { title: editingTitle, description: editingDescription, user_id: userId }
      }]);

      setEditingTaskId(null);
      setEditingTitle("");
      setEditingDescription("");
    } else console.error(error);
  };

  return (<div className="admin-dashboard">
    <h1>Moji Zadaci</h1>
  
    {userEmail && <p className="user-email">Prijavljeni ste kao: <strong>{userEmail}</strong></p>}
  
    <div className="profile-select">
      <label>
        Odaberite profil:{" "}
        <select
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          className="input"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.username}
            </option>
          ))}
        </select>
      </label>
    </div>
  
    <div className="task-add-form">
      <input
        type="text"
        placeholder="Naslov zadatka"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        className="input"
      />
      <input
        type="text"
        placeholder="Opis zadatka"
        value={newDescription}
        onChange={(e) => setNewDescription(e.target.value)}
        className="input"
      />
      <button onClick={handleAddTask} disabled={loading} className="button">
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
          <span className={`task-info ${task.status === "done" ? "task-done" : ""}`}>
            <strong>{task.title}</strong>: {task.description} ({task.status})
          </span>
  
          <div className="task-actions">
            {editingTaskId === task.id ? (
              <>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="input"
                />
                <input
                  type="text"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  className="input"
                />
                <button onClick={saveEditing} className="button">
                  Spremi
                </button>
                <button onClick={() => setEditingTaskId(null)} className="button button-danger">
                  Odustani
                </button>
              </>
            ) : (
              <>
                <button onClick={() => startEditing(task)} className="button button-small">
                  Uredi
                </button>
                <button onClick={() => handleDeleteTask(task)} className="button button-small button-danger">
                  Izbriši
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  </div>
  

  );
}
