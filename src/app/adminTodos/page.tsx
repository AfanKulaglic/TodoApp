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
  due_at?: string | null;
};

type ChangedData = {
  title?: string;
  description?: string;
  status?: "pending" | "in_progress" | "done" | "deleted";
  user_id?: string;
  due_at?: string | null;
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
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingDueTime, setEditingDueTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);

  const [tasksByDate, setTasksByDate] = useState<{ [date: string]: Task[] }>({});
  const [currentSlide, setCurrentSlide] = useState(0);

  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [currentRevisions, setCurrentRevisions] = useState<Revision[]>([]);
  const [currentTaskTitle, setCurrentTaskTitle] = useState("");

  
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
        .order("due_at", { ascending: true });
  
      if (taskError) console.error(taskError);
      else {
        const grouped = groupTasksByDate(taskData || []);
        setTasksByDate(grouped);
  
        const allDates = Object.keys(grouped).sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );
  
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
  
        // prvo tražimo današnji datum
        let closestIndex = allDates.findIndex(d => d === todayStr);
  
        if (closestIndex === -1 && allDates.length > 0) {
          // ako danas ne postoji, tražimo najbliži datum
          let minDiff = Infinity;
          allDates.forEach((dateStr, idx) => {
            const diff = Math.abs(new Date(dateStr).getTime() - today.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = idx;
            }
          });
        }
  
        setCurrentSlide(closestIndex >= 0 ? closestIndex : 0);
      }
  
      // fetch revisions
      const { data: revData, error: revError } = await supabase
        .from("revisions")
        .select("*")
        .eq("profile_id", profileIdFromUrl)
        .order("created_at", { ascending: true });
  
      if (revError) {
        console.error(revError);
        setRevisions([]);
        return;
      }
  
      const { data: allProfiles } = await supabase.from("profiles").select("id, username");
  
      const revWithUsername: Revision[] = (revData || []).map((r) => {
        const prof = allProfiles?.find((p) => p.id === r.profile_id);
        return { ...r, profile_username: prof?.username || "Nepoznat" };
      });
  
      setRevisions(revWithUsername);
    };
  
    fetchTasksAndRevisions();
  }, [profileIdFromUrl]);
  

  const groupTasksByDate = (tasks: Task[]) => {
    const groups: { [date: string]: Task[] } = {};
    tasks.forEach((task) => {
      if (!task.due_at) return;
      const date = new Date(task.due_at).toISOString().split("T")[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    });
    return groups;
  };

  const goPrev = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  const goNext = () => {
    if (currentSlide < Object.keys(tasksByDate).length - 1) setCurrentSlide(currentSlide + 1);
  };

  const handleAddTask = async () => {
    if (!newTitle.trim() || !profileIdFromUrl) return;
    setLoading(true);

    const due_datetime = newDueDate && newDueTime ? new Date(`${newDueDate}T${newDueTime}`) : null;

    const { data, error } = await supabase
      .from("tasks")
      .insert([{
        profile_id: profileIdFromUrl,
        title: newTitle,
        description: newDescription,
        due_at: due_datetime
      }])
      .select();

    setLoading(false);

    if (error) console.error(error);
    else if (data && data[0]) {
      setTasks([...tasks, data[0]]);

      
      await supabase.from("revisions").insert([{
        task_id: data[0].id,
        profile_id: profileIdFromUrl,
        action: "create",
        changed_data: { title: newTitle, description: newDescription, due_at: due_datetime?.toISOString() }
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
      setTasksByDate(prev => {
        const newGroups = { ...prev };
        for (const date in newGroups) {
          newGroups[date] = newGroups[date].map(t =>
            t.id === task.id ? { ...t, status: newStatus } : t
          );
        }
        return newGroups;
      });

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
    setEditingDueDate(task.due_at ? task.due_at.split("T")[0] : "");
    setEditingDueTime(task.due_at ? task.due_at.split("T")[1]?.substring(0, 5) : "");
    setShowModal(true);
  };

  const saveEditing = async () => {
    if (!editingTaskId) return;

    const due_datetime = editingDueDate && editingDueTime ? new Date(`${editingDueDate}T${editingDueTime}`) : null;

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editingTitle,
        description: editingDescription,
        due_at: due_datetime,
        updated_at: new Date()
      })
      .eq("id", editingTaskId);

    if (!error) {
      setTasks(tasks.map(t =>
        t.id === editingTaskId ? { ...t, title: editingTitle, description: editingDescription, due_at: due_datetime?.toISOString() } : t
      ));

      await supabase.from("revisions").insert([{
        task_id: editingTaskId,
        profile_id: profileIdFromUrl,
        action: "update",
        changed_data: { title: editingTitle, description: editingDescription, due_at: due_datetime?.toISOString() }
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
      setNewDueDate("");
      setNewDueTime("");
      setEditingDueDate("");
      setEditingDueTime("");
    }, 300);
  };

  const openRevisionsModal = (task: Task) => {
    const filteredRevisions = revisions.filter(r => r.task_id === task.id);
    setCurrentRevisions(filteredRevisions);
    setCurrentTaskTitle(task.title);
    setShowRevisionsModal(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = date.toLocaleDateString("bs-BA", { weekday: "long" });
    const monthName = date.toLocaleDateString("bs-BA", { month: "long" });
    return `${weekday}, ${day}. ${monthName} ${date.getFullYear()}`;
  };
  

  return (
    <div className="task-section">
      <div className="task-card">
        <h1>Admin - Zadaci za profil: {profile?.username || "Nepoznat profil"}</h1>

        <div className="slider-container">
          <div className="slider-actions" style={{ marginTop: '2vh' }}>
            <button onClick={goPrev} disabled={currentSlide === 0} className="slider-btn">◀</button>
            <p>
            {formatDate(Object.keys(tasksByDate)[currentSlide])}
            </p>
            <button onClick={goNext} disabled={currentSlide === Object.keys(tasksByDate).length - 1} className="slider-btn">▶</button>
          </div>

          {Object.keys(tasksByDate).length > 0 && (
            <div className="task-slide active">
              <ul className="task-list">
                {tasksByDate[Object.keys(tasksByDate)[currentSlide]]?.map((task) => (
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
                      <button onClick={() => startEditingWithModal(task)} className="button button-small">Uredi</button>
                      <button onClick={() => handleDeleteTask(task.id)} className="button button-small button-danger">Izbriši</button>
                      <span onClick={() => openRevisionsModal(task)} className="revisions-toggle">📊</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button onClick={() => setShowModal(true)} className="add-button">➕</button>
      </div>

      {/* Modal za zadatke */}
      {showModal && (
        <div className={`modal-overlay ${modalClosing ? "fade-out" : "fade-in"}`}>
          <div className={`modal-content ${modalClosing ? "slide-down" : "slide-up"}`}>
            <h2>{editingTaskId ? "Uredi Zadatak" : "Novi Zadatak"}</h2>
            <input type="text" placeholder="Naslov zadatka"
              value={editingTaskId ? editingTitle : newTitle}
              onChange={(e) => editingTaskId ? setEditingTitle(e.target.value) : setNewTitle(e.target.value)}
              className="input"
            />
            <input type="text" placeholder="Opis zadatka"
              value={editingTaskId ? editingDescription : newDescription}
              onChange={(e) => editingTaskId ? setEditingDescription(e.target.value) : setNewDescription(e.target.value)}
              className="input"
            />
            <input type="date"
              value={editingTaskId ? editingDueDate : newDueDate}
              onChange={(e) => editingTaskId ? setEditingDueDate(e.target.value) : setNewDueDate(e.target.value)}
              className="input"
            />
            <input type="time"
              value={editingTaskId ? editingDueTime : newDueTime}
              onChange={(e) => editingTaskId ? setEditingDueTime(e.target.value) : setNewDueTime(e.target.value)}
              className="input"
            />

            <div className="modal-buttons">
              <button onClick={editingTaskId ? saveEditing : handleAddTask} disabled={loading} className="button">
                {loading ? "Spremanje..." : "Potvrdi"}
              </button>
              <button onClick={closeModal} className="button button-danger">Zatvori</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal za revizije */}
      {showRevisionsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: '20px', marginBottom: 'auto', marginTop: 'auto', color: 'black' }}>
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
              <button onClick={() => setShowRevisionsModal(false)} className="button button-danger">Zatvori</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
