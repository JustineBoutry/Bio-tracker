import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Layout({ children }) {
  return (
    <div>
      <nav className="bg-white border-b p-4">
        <div className="flex gap-4">
          <Link to={createPageUrl("Home")} className="font-bold">BioTracker</Link>
          <Link to={createPageUrl("Experiments")}>Experiments</Link>
          <Link to={createPageUrl("DataEntry")}>Data Entry</Link>
          <Link to={createPageUrl("Dataset")}>Dataset</Link>
          <Link to={createPageUrl("IndividualHistory")}>Individual History</Link>
          <Link to={createPageUrl("Dashboard")}>Dashboard</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}