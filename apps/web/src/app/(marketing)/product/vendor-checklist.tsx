"use client";

import Link from "next/link";
import { useState } from "react";
import { SAMPLE_VENDORS, formatDue, sortVendors } from "@/lib/site/sample";

export function VendorChecklist() {
  const [done, setDone] = useState(
    () => new Set(SAMPLE_VENDORS.filter((v) => v.done).map((v) => v.id))
  );

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const vendors = sortVendors(
    SAMPLE_VENDORS.map((v) => ({ ...v, done: done.has(v.id) }))
  );
  const finished = done.size;

  return (
    <div className="wrap vend">
      <div>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <span className="caps">Vendor checklist</span>
          <h2 id="vTitle">
            Caterer, gele, DJ, cake. <em>Nothing forgotten.</em>
          </h2>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Every vendor gets tasks with due dates counted back from the day.
          Overdue ones rise to the top.
        </p>
        <div className="progressbar" aria-hidden="true">
          <b
            style={{ transform: `scaleX(${finished / SAMPLE_VENDORS.length})` }}
          />
        </div>
        <p style={{ marginTop: 10, fontWeight: 600 }} aria-live="polite">
          {finished} of {SAMPLE_VENDORS.length} vendor tasks done
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ghost btn-small" href="/events">
            Edit the checklist
          </Link>
        </p>
      </div>

      <ul className="tasks" aria-label="Sample vendor tasks">
        {vendors.map((v) => (
          <li key={v.id} className={v.done ? "done" : undefined}>
            <input
              type="checkbox"
              id={`vt_${v.id}`}
              checked={v.done}
              onChange={() => toggle(v.id)}
            />
            <label className="t-name" htmlFor={`vt_${v.id}`}>
              {v.task}
            </label>
            <span className="t-meta">
              {v.name} · {v.category}
            </span>
            <span className="due">
              {formatDue(v.due)}
              <br />
              <span className={`pill ${v.done ? "yes" : "wait"}`}>
                {v.done ? "Done" : "To do"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
