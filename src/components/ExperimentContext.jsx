import React, { createContext, useContext, useState, useEffect } from 'react';

const ExperimentContext = createContext();

export const useExperiment = () => {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiment must be used within ExperimentProvider');
  }
  return context;
};

export const ExperimentProvider = ({ children }) => {
  const [activeExperimentId, setActiveExperimentId] = useState(() => {
    return localStorage.getItem('activeExperimentId') || null;
  });

  const selectExperiment = (experimentId) => {
    setActiveExperimentId(experimentId);
    localStorage.setItem('activeExperimentId', experimentId);
  };

  const exitExperiment = () => {
    setActiveExperimentId(null);
    localStorage.removeItem('activeExperimentId');
  };

  return (
    <ExperimentContext.Provider value={{ activeExperimentId, selectExperiment, exitExperiment }}>
      {children}
    </ExperimentContext.Provider>
  );
};