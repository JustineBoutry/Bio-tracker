import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Microscope, FlaskConical, Database, BarChart3 } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: FlaskConical,
      title: "Manage Experiments",
      description: "Create and configure experiments with custom factors and categories",
      action: () => navigate(createPageUrl("Experiments")),
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Database,
      title: "Data Entry",
      description: "Record measurements in batch mode - reproduction, deaths, infection, and more",
      action: () => navigate(createPageUrl("DataEntry")),
      color: "from-green-500 to-green-600"
    },
    {
      icon: BarChart3,
      title: "Dashboard & Analytics",
      description: "View real-time statistics and track experiment progress",
      action: () => navigate(createPageUrl("Dashboard")),
      color: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <Microscope className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4">BioTracker</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Manage biological experiments, track individuals, and record measurements with ease
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title}
                className="hover:shadow-2xl transition-all duration-300 cursor-pointer border-slate-200 bg-white/80 backdrop-blur-sm group"
                onClick={feature.action}
              >
                <CardHeader>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-center">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-700 mb-6">
              Start by creating your first experiment and setting up experimental factors
            </p>
            <Button 
              size="lg"
              onClick={() => navigate(createPageUrl("Experiments"))}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            >
              <FlaskConical className="w-5 h-5 mr-2" />
              Create Experiment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}