"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  SAMPLE_GUESTS,
  SAMPLE_TABLES,
  STATUS_LABEL,
  guestCounts,
  seatsUsed,
  tableById,
} from "@/lib/site/sample";

const SHOWN = 7;

export function GuestBoard() {
  const [query, setQuery] = useState("");
  const counts = useMemo(() => guestCounts(SAMPLE_GUESTS), []);

  const q = query.trim().toLowerCase();
  const rows = SAMPLE_GUESTS.filter(
    (g) =>
      !q ||
      g.name.toLowerCase().includes(q) ||
      STATUS_LABEL[g.status].text.toLowerCase().includes(q)
  );
  const shown = rows.slice(0, SHOWN);

  return (
    <div className="tools">
      <div className="board">
        <h3>
          Guest list <Link href="/events">Open the planner</Link>
        </h3>
        <div className="stats">
          <div className="stat">
            <b>{counts.yes}</b>
            <span>Confirmed · {counts.people} people</span>
          </div>
          <div className="stat">
            <b>{counts.pending}</b>
            <span>Pending</span>
          </div>
          <div className="stat">
            <b>{counts.no}</b>
            <span>Declined</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="gSearch">Search guests</label>
          <input
            className="input"
            id="gSearch"
            type="search"
            placeholder="Try “Okafor” or “pending”"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table className="gtable">
            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col" className="hide-sm">
                  Party
                </th>
                <th scope="col">Status</th>
                <th scope="col">Table</th>
              </tr>
            </thead>
            <tbody>
              {shown.length ? (
                shown.map((g) => {
                  const t = tableById(g.tableId);
                  return (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td className="hide-sm">{g.party}</td>
                      <td>
                        <span className={`pill ${STATUS_LABEL[g.status].pill}`}>
                          {STATUS_LABEL[g.status].text}
                        </span>
                      </td>
                      <td>
                        {t ? t.name : g.status === "yes" ? "Not seated" : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="muted">
                    No guests match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="hint">
          {rows.length > shown.length
            ? `Showing ${shown.length} of ${rows.length} guests.`
            : `${rows.length} guest${rows.length === 1 ? "" : "s"} shown.`}
        </p>
      </div>

      <div className="board">
        <h3>
          Seating <Link href="/events">Assign tables</Link>
        </h3>
        <div className="tables-mini">
          {SAMPLE_TABLES.map((t) => {
            const used = seatsUsed(SAMPLE_GUESTS, t.id);
            const full = used >= t.capacity;
            const dash = ((used / t.capacity) * 157).toFixed(1);
            return (
              <div key={t.id} className={full ? "tmini full" : "tmini"}>
                <svg viewBox="0 0 62 62" aria-hidden="true">
                  <circle
                    cx="31"
                    cy="31"
                    r="25"
                    fill="none"
                    stroke="#e3d8c4"
                    strokeWidth="6"
                  />
                  <circle
                    cx="31"
                    cy="31"
                    r="25"
                    fill="none"
                    stroke={full ? "#7d2139" : "#c9a256"}
                    strokeWidth="6"
                    strokeDasharray={`${dash} 157`}
                    transform="rotate(-90 31 31)"
                  />
                </svg>
                <b>{t.name}</b>
                <span>
                  {used} of {t.capacity}
                  {full ? " · full" : " seats"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="hint">
          Pick a guest, choose a table. A table never takes more people than it
          has chairs.
        </p>
      </div>
    </div>
  );
}
