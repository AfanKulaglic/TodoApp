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

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);

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
        profile_id: profileIdFromUrl,
        action: "update",
        changed_data: { title: editingTitle, description: editingDescription }
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
    }, 300);
  };

  // Revisions modal state
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [currentRevisions, setCurrentRevisions] = useState<Revision[]>([]);
  const [currentTaskTitle, setCurrentTaskTitle] = useState("");


  const openRevisionsModal = (task: Task) => {
    const filteredRevisions = revisions.filter(r => r.task_id === task.id);
    console.log("Otvaram revisions za task:", task.id, task.title);
    console.log("Filtered revisions:", filteredRevisions);

    setCurrentRevisions(filteredRevisions);
    setCurrentTaskTitle(task.title);
    setShowRevisionsModal(true);
  };




  return (
    <div className="task-section">
      <div className="task-card">
        <h1>Admin - Zadaci za profil: {profile?.username || "Nepoznat profil"}</h1>

        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <input
                type="checkbox"
                checked={task.status === "done"}
                onChange={() => toggleTaskStatus(task)}
                className="task-checkbox"
              />
              <span className="task-info">
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
                  onClick={() => handleDeleteTask(task.id)}
                  className="button button-small button-danger"
                >
                  Izbriši
                </button>
                <span
                  className="revisions-toggle"
                  onClick={() => openRevisionsModal(task)}
                >
                  📊
                </span>

              </div>

            </li>
          ))}
        </ul>

        <button onClick={() => setShowModal(true)} className="add-button">
          ➕
        </button>
      </div>

      {/* Modal */}

      {/* Revisions Modal */}
      {showRevisionsModal && (
        <div className="modal-overlay">
            <div className="modal-content" style={{borderRadius: '20px',marginBottom: 'auto',marginTop: 'auto',color:'black'}}>
              <h2>Revizija za zadatak: {currentTaskTitle}</h2>

              <table className="revisions-table">
                <thead>
                  <tr>
                    <th>Akcija</th>
                    <th>Vrijeme</th>
                    <th>Promjene</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRevisions.map((r) => (
                    <tr key={r.id}>
                      <td>{r.action}</td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td>
                        {Object.entries(r.changed_data).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}</strong>: {value?.toString() || "–"}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="modal-buttons">
                <button
                  onClick={() => setShowRevisionsModal(false)}
                  className="button button-danger"
                >
                  Zatvori
                </button>
              </div>
            </div>
        </div>
      )}





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
            <div className="modal-buttons">
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
