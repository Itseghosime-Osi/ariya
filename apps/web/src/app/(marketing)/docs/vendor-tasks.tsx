"use client";

import { useState } from "react";

const TASKS = [
  {
    id: "dt_cake",
    name: "Taste and confirm the cake",
    vendor: "Sweet Crumbs · Cake",
    due: "5 Dec",
  },
  {
    id: "dt_sound",
    name: "Confirm sound and lights",
    vendor: "Lagos Sound Co · Sound",
    due: "28 Nov",
  },
  {
    id: "dt_gele",
    name: "Final gele fitting",
    vendor: "Adire Studio · Styling",
    due: "8 Dec",
  },
];

const DONE_AT_START = ["dt_sound"];

export function VendorTasks() {
  const [done, setDone] = useState(() => new Set(DONE_AT_START));

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <ul className="tasks" aria-label="Sample vendor tasks">
        {TASKS.map((task) => {
          const checked = done.has(task.id);
          return (
            <li key={task.id} className={checked ? "done" : undefined}>
              <input
                type="checkbox"
                id={task.id}
                checked={checked}
                onChange={() => toggle(task.id)}
              />
              <label className="t-name" htmlFor={task.id}>
                {task.name}
              </label>
              <span className="t-meta">{task.vendor}</span>
              <span className="due">
                {task.due}
                <br />
                <span className={`pill ${checked ? "yes" : "wait"}`}>
                  {checked ? "Done" : "To do"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="progressbar" aria-hidden="true">
        <b style={{ transform: `scaleX(${done.size / TASKS.length})` }} />
      </div>
      <p style={{ marginTop: 10, fontWeight: 600 }} aria-live="polite">
        {done.size} of {TASKS.length} vendor tasks done
      </p>
    </>
  );
}
