import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useExperiment, ExperimentProvider } from "./components/ExperimentContext";
import { Button } from "@/components/ui/button";
import { LogOut, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { activeExperimentId, exitExperiment } = useExperiment();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="font-bold text-lg text-gray-900">BioTracker</div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="text-sm text-gray-600">
                {experiment?.experiment_name || 'Loading...'}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Link 
                to={createPageUrl("ExperimentSetup")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "ExperimentSetup" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Setup
              </Link>
              <Link 
                to={createPageUrl("DataEntry")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "DataEntry" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Enter Data
              </Link>
              <Link 
                to={createPageUrl("Dataset")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "Dataset" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Dataset
              </Link>
              <Link 
                to={createPageUrl("IndividualHistory")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "IndividualHistory" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Individual History
              </Link>
              <Link 
                to={createPageUrl("Dashboard")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "Dashboard" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Dashboard
              </Link>
              <Link 
                to={createPageUrl("LabNotebook")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "LabNotebook" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Lab Notebook
              </Link>
              <Link 
                to={createPageUrl("CleanupData")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "CleanupData" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cleanup
              </Link>
              <Link 
                to={createPageUrl("MigrateInfectionData")} 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "MigrateInfectionData" 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Migrate
              </Link>

              <div className="h-6 w-px bg-gray-300 mx-2"></div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Data
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExit}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Exit Experiment
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto">
        {children}
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