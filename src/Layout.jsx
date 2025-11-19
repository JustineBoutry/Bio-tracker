import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useExperiment, ExperimentProvider } from "./components/ExperimentContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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

  const handleExit = () => {
    exitExperiment();
    navigate(createPageUrl("Home"));
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
              
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              
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