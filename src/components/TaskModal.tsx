"use client";

import React from "react";
import type { Task } from "../app/lib/types";

type TaskModalProps = {
  show: boolean;
  closing: boolean;
  editingTaskId: string | null;
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  loading: boolean;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeDueDate: (value: string) => void;
  onChangeDueTime: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  modalTitle?: string; // npr. "Novi Zadatak" ili "Uredi Zadatak"
};

export default function TaskModal({
  show,
  closing,
  editingTaskId,
  title,
  description,
  dueDate,
  dueTime,
  loading,
  onChangeTitle,
  onChangeDescription,
  onChangeDueDate,
  onChangeDueTime,
  onConfirm,
  onClose,
  modalTitle,
}: TaskModalProps) {
  if (!show) return null;

  return (
    <div className={`modal-overlay ${closing ? "fade-out" : "fade-in"}`}>
      <div className={`modal-content ${closing ? "slide-down" : "slide-up"}`}>
        <h2>{modalTitle || (editingTaskId ? "Uredi Zadatak" : "Novi Zadatak")}</h2>
        <input
          type="text"
          placeholder="Naslov zadatka"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="input"
        />
        <input
          type="text"
          placeholder="Opis zadatka"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          className="input"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => onChangeDueDate(e.target.value)}
          className="input"
        />
        <input
          type="time"
          value={dueTime}
          onChange={(e) => onChangeDueTime(e.target.value)}
          className="input"
        />
        <div className="modal-buttons">
          <button onClick={onConfirm} disabled={loading} className="button">
            {loading ? "Spremanje..." : "Potvrdi"}
          </button>
          <button onClick={onClose} className="button button-danger">
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}
