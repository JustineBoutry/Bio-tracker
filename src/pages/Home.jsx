import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">BioTracker</h1>
      <p className="mb-4">Manage biological experiments</p>
      <Button onClick={() => navigate(createPageUrl("Experiments"))}>
        Start
      </Button>
    </div>
  );
}