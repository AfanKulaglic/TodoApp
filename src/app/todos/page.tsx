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
  due_at?: string | null; // novi atribut
};

type ChangedData = {
  title?: string;
  description?: string;
  status?: "pending" | "in_progress" | "done";
  user_id?: string;
  due_at?: string | null; // dodaj za revizije
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

  const [newDueDate, setNewDueDate] = useState(""); // yyyy-mm-dd
  const [newDueTime, setNewDueTime] = useState(""); // HH:MM

  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingDueTime, setEditingDueTime] = useState("");



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
        .order("due_at", { ascending: true });

      if (error) console.error(error);
      else {
        const grouped = groupTasksByDate(data || []);
        setTasksByDate(grouped);

        const allDates = Object.keys(grouped).sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        // pokušaj prvo naći današnji datum
        let closestIndex = allDates.findIndex(d => d === todayStr);

        if (closestIndex === -1 && allDates.length > 0) {
          // ako danas ne postoji, pronađi najbliži datum
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
    };

    fetchTasks();
  }, [selectedProfileId]);





  const handleAddTask = async () => {
    if (!newTitle.trim() || !selectedProfileId) return;
    setLoading(true);
  
    const due_datetime = newDueDate && newDueTime ? new Date(`${newDueDate}T${newDueTime}`) : null;
  
    // UI instant update
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      id: tempId,
      profile_id: selectedProfileId,
      title: newTitle,
      description: newDescription,
      status: "pending",
      created_at: new Date().toISOString(),
      due_at: due_datetime?.toISOString() || null,
    };
    setTasks(prev => [...prev, newTask]);
    setTasksByDate(prev => {
      const dateKey = due_datetime ? due_datetime.toISOString().split("T")[0] : "no-date";
      return {
        ...prev,
        [dateKey]: prev[dateKey] ? [...prev[dateKey], newTask] : [newTask],
      };
    });
  
    // asinhrono insert u tasks i revisions
    try {
      const { data: insertedTasks, error: taskError } = await supabase
        .from("tasks")
        .insert([{
          profile_id: selectedProfileId,
          title: newTitle,
          description: newDescription,
          due_at: due_datetime
        }])
        .select();
  
      if (taskError || !insertedTasks || !insertedTasks[0]) throw taskError;
  
      const savedTask = insertedTasks[0];
  
      // update UI sa stvarnim ID-em
      setTasks(prev => prev.map(t => t.id === tempId ? savedTask : t));
      setTasksByDate(prev => {
        const dateKey = due_datetime ? due_datetime.toISOString().split("T")[0] : "no-date";
        return {
          ...prev,
          [dateKey]: prev[dateKey].map(t => t.id === tempId ? savedTask : t),
        };
      });
  
      // **insert u revisions**
      const { error: revError } = await supabase.from("revisions").insert([{
        task_id: savedTask.id,
        profile_id: selectedProfileId,
        action: "create",
        changed_data: {
          title: newTitle,
          description: newDescription,
          due_at: due_datetime?.toISOString()
        },
        created_at: new Date().toISOString()
      }]);
      if (revError) console.error("Revision error:", revError);
  
    } catch (err) {
      console.error("Greška pri dodavanju zadatka i revision:", err);
    }
  
    setLoading(false);
    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setNewDueTime("");
    closeModal();
  };
  

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "pending" : "done";
  
    // UI instant update
    setTasksByDate(prev => {
      const newGroups = { ...prev };
      for (const date in newGroups) {
        newGroups[date] = newGroups[date].map(t =>
          t.id === task.id ? { ...t, status: newStatus } : t
        );
      }
      return newGroups;
    });
  
    try {
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date() })
        .eq("id", task.id);
      if (taskError) throw taskError;
  
      // insert revision
      const { error: revError } = await supabase.from("revisions").insert([{
        task_id: task.id,
        profile_id: selectedProfileId,
        action: "update",
        changed_data: { status: newStatus },
        created_at: new Date().toISOString()
      }]);
      if (revError) console.error("Revision error:", revError);
  
    } catch (err) {
      console.error("Greška pri update zadatka i revision:", err);
    }
  };
  


  const handleDeleteTask = async (task: Task) => {
    // UI instant remove
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setTasksByDate(prev => {
      const dateKey = task.due_at ? task.due_at.split("T")[0] : "no-date";
      return {
        ...prev,
        [dateKey]: prev[dateKey]?.filter(t => t.id !== task.id) || [],
      };
    });
  
    try {
      const { error: taskError } = await supabase.from("tasks").delete().eq("id", task.id);
      if (taskError) throw taskError;
  
      const { error: revError } = await supabase.from("revisions").insert([{
        task_id: task.id,
        profile_id: selectedProfileId,
        action: "delete",
        changed_data: {
          title: task.title,
          description: task.description,
          status: task.status
        },
        created_at: new Date().toISOString()
      }]);
      if (revError) console.error("Revision error:", revError);
  
    } catch (err) {
      console.error("Greška pri brisanju zadatka i revision:", err);
    }
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
        profile_id: selectedProfileId,
        action: "update",
        changed_data: { title: editingTitle, description: editingDescription, due_at: due_datetime?.toISOString(), user_id: userId }
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


  const [tasksByDate, setTasksByDate] = useState<{ [date: string]: Task[] }>({});
  const [currentSlide, setCurrentSlide] = useState(0);

  const dates = Object.keys(tasksByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const goPrev = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  const goNext = () => {
    if (currentSlide < dates.length - 1) setCurrentSlide(currentSlide + 1);
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

        <div className="slider-container">
          <div className="slider-actions">
            <button onClick={goPrev} disabled={currentSlide === 0} className="slider-btn">
              ◀
            </button>
            <p>
              {formatDate(dates[currentSlide])}
            </p>
            <button
              onClick={goNext}
              disabled={currentSlide === dates.length - 1}
              className="slider-btn"
            >
              ▶
            </button>
          </div>

          {dates.length > 0 && (
            <div className="task-slide active">
              <ul className="task-list">
                {tasksByDate[dates[currentSlide]].map((task) => (
                  <li key={task.id} className="task-item">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() => toggleTaskStatus(task)}
                      className="task-checkbox"
                    />
                    <span
                      className={`task-info ${task.status === "done" ? "task-done" : ""
                        }`}
                    >
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
          )}
        </div>



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
