import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FlaskConical, Edit, Database } from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();

  const links = [
    { name: "Experiments", url: createPageUrl("Experiments"), icon: FlaskConical },
    { name: "Data Entry", url: createPageUrl("DataEntry"), icon: Edit },
    { name: "Dataset", url: createPageUrl("Dataset"), icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">BioTracker</h1>
            <div className="flex gap-4">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.url;
                return (
                  <Link
                    key={link.name}
                    to={link.url}
                    className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}