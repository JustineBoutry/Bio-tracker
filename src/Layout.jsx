import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useExperiment, ExperimentProvider } from "./components/ExperimentContext";
import { Button } from "@/components/ui/button";
import { LogOut, Download, Menu, X, Settings, Database, History, BarChart3, BookOpen, Trash2, PenLine } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { activeExperimentId, exitExperiment } = useExperiment();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: experiment } = useQuery({
    queryKey: ['experiment', activeExperimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: activeExperimentId });
      return exps[0];
    },
    enabled: !!activeExperimentId,
  });

  React.useEffect(() => {
    if (!activeExperimentId && currentPageName !== "Home") {
      navigate(createPageUrl("Home"));
    }
  }, [activeExperimentId, currentPageName, navigate]);

  const handleExit = () => {
    exitExperiment();
    navigate(createPageUrl("Home"));
  };

  const handleExport = async () => {
    try {
      const individuals = await base44.entities.Individual.filter({ experiment_id: activeExperimentId });
      const reproductionEvents = await base44.entities.ReproductionEvent.filter({ experiment_id: activeExperimentId });
      const labNotes = await base44.entities.LabNote.filter({ experiment_id: activeExperimentId });

      const exportData = {
        version: "1.0",
        export_date: new Date().toISOString(),
        experiment: experiment,
        individuals: individuals,
        reproduction_events: reproductionEvents,
        lab_notes: labNotes
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${experiment?.experiment_name || 'experiment'}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  if (!activeExperimentId || currentPageName === "Home") {
    return <div>{children}</div>;
  }

  const navItems = [
    { name: "ExperimentSetup", label: "Setup", icon: Settings },
    { name: "DataEntry", label: "Enter Data", icon: PenLine },
    { name: "Dataset", label: "Dataset", icon: Database },
    { name: "IndividualHistory", label: "Individual History", icon: History },
    { name: "Dashboard", label: "Dashboard", icon: BarChart3 },
    { name: "LabNotebook", label: "Lab Notebook", icon: BookOpen },
    { name: "CleanupData", label: "Cleanup", icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r shadow-sm
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="font-bold text-lg text-gray-900">BioTracker</div>
              <button 
                className="lg:hidden p-1 hover:bg-gray-100 rounded"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-gray-600 mt-1 truncate">
              {experiment?.experiment_name || 'Loading...'}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    currentPageName === item.name
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer actions */}
          <div className="p-3 border-t space-y-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Data
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExit}
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Exit Experiment
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b shadow-sm p-3 flex items-center gap-3">
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="font-semibold text-gray-900 truncate">
            {experiment?.experiment_name || 'Loading...'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ExperimentProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </ExperimentProvider>
  );
}