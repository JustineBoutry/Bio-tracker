import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useExperiment } from "../components/ExperimentContext";
import { Upload } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectExperiment } = useExperiment();
  const [selectedExp, setSelectedExp] = useState(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [importing, setImporting] = useState(false);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
  });

  const enterExperiment = () => {
    if (selectedExp) {
      selectExperiment(selectedExp);
      navigate(createPageUrl("DataEntry"));
    }
  };

  const createExperiment = async () => {
    if (!name) return;
    const exp = await base44.entities.Experiment.create({
      experiment_name: name,
      start_date: startDate,
      individuals_generated: false,
      code_generation_mode: 'factor_based',
      code_prefix: 'ID-',
      code_starting_number: 1
    });
    selectExperiment(exp.id);
    navigate(createPageUrl("ExperimentSetup"));
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.experiment) {
        throw new Error('Invalid file format');
      }

      const importName = prompt(
        'Enter a name for the imported experiment:',
        `${data.experiment.experiment_name} - imported ${new Date().toISOString().split('T')[0]}`
      );
      
      if (!importName) {
        setImporting(false);
        return;
      }

      const expData = { ...data.experiment };
      delete expData.id;
      delete expData.created_date;
      delete expData.updated_date;
      delete expData.created_by;
      delete expData.created_by_id;
      delete expData.entity_name;
      delete expData.app_id;
      delete expData.is_sample;
      delete expData.is_deleted;
      delete expData.deleted_date;
      expData.experiment_name = importName;

      const newExp = await base44.entities.Experiment.create(expData);

      if (data.individuals && data.individuals.length > 0) {
        const individualsToCreate = data.individuals.map(ind => {
          const indData = { ...ind };
          delete indData.id;
          delete indData.created_date;
          delete indData.updated_date;
          delete indData.created_by;
          delete indData.created_by_id;
          delete indData.entity_name;
          delete indData.app_id;
          delete indData.is_sample;
          delete indData.is_deleted;
          delete indData.deleted_date;
          indData.experiment_id = newExp.id;
          return indData;
        });
        await base44.entities.Individual.bulkCreate(individualsToCreate);
      }

      if (data.reproduction_events && data.reproduction_events.length > 0) {
        const eventsToCreate = data.reproduction_events.map(event => {
          const eventData = { ...event };
          delete eventData.id;
          delete eventData.created_date;
          delete eventData.updated_date;
          delete eventData.created_by;
          delete eventData.created_by_id;
          delete eventData.entity_name;
          delete eventData.app_id;
          delete eventData.is_sample;
          delete eventData.is_deleted;
          delete eventData.deleted_date;
          eventData.experiment_id = newExp.id;
          return eventData;
        });
        await base44.entities.ReproductionEvent.bulkCreate(eventsToCreate);
      }

      if (data.lab_notes && data.lab_notes.length > 0) {
        const notesToCreate = data.lab_notes.map(note => {
          const noteData = { ...note };
          delete noteData.id;
          delete noteData.created_date;
          delete noteData.updated_date;
          delete noteData.created_by;
          delete noteData.created_by_id;
          delete noteData.entity_name;
          delete noteData.app_id;
          delete noteData.is_sample;
          delete noteData.is_deleted;
          delete noteData.deleted_date;
          noteData.experiment_id = newExp.id;
          return noteData;
        });
        await base44.entities.LabNote.bulkCreate(notesToCreate);
      }

      queryClient.invalidateQueries(['experiments']);
      alert(`Experiment "${importName}" imported successfully!`);
      event.target.value = '';
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('home.title')}</h1>
          <p className="text-gray-600">{t('home.selectOrCreate')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('home.enterExisting')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select 
              className="w-full border rounded p-3"
              value={selectedExp || ''}
              onChange={(e) => setSelectedExp(e.target.value)}
            >
              <option value="">{t('home.chooseExperiment')}</option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.experiment_name} ({t('home.started')} {exp.start_date})
                </option>
              ))}
            </select>
            <Button 
              className="w-full" 
              size="lg"
              onClick={enterExperiment}
              disabled={!selectedExp}
            >
              {t('home.enterThisExperiment')}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500">{t('common.or')}</div>

        <Card>
          <CardHeader>
            <CardTitle>{t('home.importFromFile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
              id="import-file"
              disabled={importing}
            />
            <label htmlFor="import-file">
              <Button 
                className="w-full"
                size="lg"
                disabled={importing}
                onClick={() => document.getElementById('import-file').click()}
                type="button"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? t('home.importing') : t('home.importFromFileButton')}
              </Button>
            </label>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500">{t('common.or')}</div>

        <Card>
          <CardHeader>
            <CardTitle>{t('home.createNewExperiment')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('home.experimentName')}</label>
              <Input
                placeholder={t('home.experimentName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('home.startDate')}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <Button 
              className="w-full"
              size="lg"
              onClick={createExperiment}
              disabled={!name}
            >
              {t('home.createNewExperimentButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}