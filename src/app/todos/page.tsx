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

  // za edit
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);

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

  // --- TVOJE POSTOJEĆE FUNKCIJE ---
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
    closeModal();
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
      await supabase.from("revisions").insert([{
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

  const startEditingWithModal = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description || "");
    setShowModal(true);
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

      closeModal();
    } else console.error(error);
  };

  const closeModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setModalClosing(false);
      setEditingTaskId(null);
      setEditingTitle("");
      setEditingDescription("");
      setNewTitle("");
      setNewDescription("");
    }, 300); // trajanje animacije
  };

  return (
    <div className="task-section">
      <div className="task-card">
        <h1>Moji Zadaci</h1>

        {userEmail && <p className="user-email"><strong>{userEmail}</strong></p>}

        <div className="profile-select">
          <label>
            Odaberite profil:{" "}
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="input"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
            </select>
          </label>
        </div>

        <button onClick={() => setShowModal(true)} className="add-button">
          ➕ 
        </button>

        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <input
                type="checkbox"
                checked={task.status === "done"}
                onChange={() => toggleTaskStatus(task)}
                className="task-checkbox"
              />
              <span className={`task-info ${task.status === "done" ? "task-done" : ""}`}>
                <strong>{task.title}</strong>: {task.description}
              </span>

              <div className="task-actions">
                <button
                  onClick={() => startEditingWithModal(task)}
                  className="button button-small"
                >
                  Uredi
                </button>
                <button
                  onClick={() => handleDeleteTask(task)}
                  className="button button-small button-danger"
                >
                  Izbriši
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={`modal-overlay ${modalClosing ? "fade-out" : "fade-in"}`}>
          <div className={`modal-content ${modalClosing ? "slide-down" : "slide-up"}`}>
            <h2>{editingTaskId ? "Uredi Zadatak" : "Novi Zadatak"}</h2>
            <input
              type="text"
              placeholder="Naslov zadatka"
              value={editingTaskId ? editingTitle : newTitle}
              onChange={(e) => editingTaskId ? setEditingTitle(e.target.value) : setNewTitle(e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Opis zadatka"
              value={editingTaskId ? editingDescription : newDescription}
              onChange={(e) => editingTaskId ? setEditingDescription(e.target.value) : setNewDescription(e.target.value)}
              className="input"
            />
            <div className="modal-actions">
              <button
                onClick={editingTaskId ? saveEditing : handleAddTask}
                disabled={loading}
                className="button"
              >
                {loading ? "Spremanje..." : "Potvrdi"}
              </button>
              <button onClick={closeModal} className="button button-danger">
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
