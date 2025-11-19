import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Download, FileText } from "lucide-react";
import { useExperiment } from "../components/ExperimentContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function LabNotebook() {
  const queryClient = useQueryClient();
  const { activeExperimentId } = useExperiment();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ['lab-notes', activeExperimentId],
    queryFn: () => base44.entities.LabNote.filter({ experiment_id: activeExperimentId }),
    enabled: !!activeExperimentId,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.LabNote.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lab-notes']);
      setShowNoteForm(false);
      setNoteTitle("");
      setNoteText("");
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check if report already exists
      const existing = notes.filter(n => n.type === 'daily_report' && n.report_date === dateStr);
      if (existing.length > 0) {
        // Delete existing reports for this date
        for (const report of existing) {
          await base44.entities.LabNote.delete(report.id);
        }
      }

      // Get all individuals for this experiment
      const allIndividuals = await base44.entities.Individual.filter({ 
        experiment_id: activeExperimentId 
      });

      // Get all reproduction events for this date
      const reproEvents = await base44.entities.ReproductionEvent.filter({ 
        experiment_id: activeExperimentId,
        event_date: dateStr
      });

      // Created individuals
      const created = allIndividuals.filter(ind => 
        ind.created_date && ind.created_date.startsWith(dateStr)
      );

      // Deaths
      const deaths = allIndividuals.filter(ind => 
        ind.death_date === dateStr
      );

      // Edited individuals (updated on this date, but not created on this date)
      const edited = allIndividuals.filter(ind => 
        ind.updated_date && ind.updated_date.startsWith(dateStr) &&
        !(ind.created_date && ind.created_date.startsWith(dateStr))
      );

      // Infection updates (infected individuals updated on this date)
      const infections = allIndividuals.filter(ind => 
        ind.infected && 
        ind.updated_date && ind.updated_date.startsWith(dateStr)
      );

      // Manual notes created on this date
      const manualNotes = notes.filter(n => 
        n.type === 'manual' && 
        n.timestamp && n.timestamp.startsWith(dateStr)
      );

      // Build report
      let reportText = `Daily Report – ${format(date, 'MMM d, yyyy')}\n\n`;
      
      if (created.length > 0) {
        reportText += `• ${created.length} individuals created\n`;
        reportText += `  IDs: ${created.map(i => i.individual_id).join(', ')}\n\n`;
      }

      if (edited.length > 0) {
        reportText += `• ${edited.length} individuals edited\n`;
        reportText += `  IDs: ${edited.map(i => i.individual_id).join(', ')}\n\n`;
      }

      if (deaths.length > 0) {
        reportText += `• ${deaths.length} deaths recorded\n`;
        reportText += `  IDs: ${deaths.map(i => i.individual_id).join(', ')}\n\n`;
      }

      if (reproEvents.length > 0) {
        reportText += `• ${reproEvents.length} reproduction events\n`;
        reportText += `  IDs: ${reproEvents.map(e => e.individual_id).join(', ')}\n\n`;
      }

      if (infections.length > 0) {
        reportText += `• ${infections.length} infection updates\n`;
        reportText += `  IDs: ${infections.map(i => i.individual_id).join(', ')}\n\n`;
      }

      if (manualNotes.length > 0) {
        reportText += `• ${manualNotes.length} manual notes created\n\n`;
      }

      if (created.length === 0 && edited.length === 0 && deaths.length === 0 && 
          reproEvents.length === 0 && infections.length === 0 && manualNotes.length === 0) {
        reportText += 'No activity recorded for this day.\n';
      }

      // Create the report
      await base44.entities.LabNote.create({
        experiment_id: activeExperimentId,
        title: 'Daily Report',
        note: reportText,
        timestamp: new Date(dateStr + 'T23:59:59').toISOString(),
        type: 'daily_report',
        report_date: dateStr
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lab-notes']);
      alert('Daily report generated!');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.LabNote.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lab-notes']);
      setEditingNote(null);
      setNoteTitle("");
      setNoteText("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.LabNote.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lab-notes']);
    },
  });

  const handleSaveNote = () => {
    if (!noteText.trim()) return;

    if (editingNote) {
      updateNoteMutation.mutate({
        id: editingNote.id,
        data: {
          title: noteTitle.trim() || null,
          note: noteText.trim(),
        }
      });
    } else {
      createNoteMutation.mutate({
        experiment_id: activeExperimentId,
        title: noteTitle.trim() || null,
        note: noteText.trim(),
        timestamp: new Date().toISOString(),
        type: 'manual',
      });
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteText(note.note || "");
    setShowNoteForm(true);
  };

  const handleDelete = (note) => {
    const message = note.type === 'daily_report' 
      ? 'Delete this daily report?' 
      : 'Delete this note?';
    if (window.confirm(message)) {
      deleteNoteMutation.mutate(note.id);
    }
  };

  const handleGenerateReport = () => {
    const today = new Date();
    generateReportMutation.mutate(today);
  };

  const handleCancel = () => {
    setShowNoteForm(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteText("");
  };

  const exportToCSV = () => {
    if (notes.length === 0) return;

    const headers = ['Date & Time', 'Title', 'Note'];
    const rows = notes.map(note => [
      format(new Date(note.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      note.title || '',
      note.note
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-notebook-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!activeExperimentId) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Please select an experiment first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Lab Notebook</h1>
        <div className="flex gap-2">
          <Button onClick={handleGenerateReport} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Generate Daily Report
          </Button>
          <Button onClick={exportToCSV} variant="outline" disabled={notes.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowNoteForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      {showNoteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingNote ? 'Edit Note' : 'New Note'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title (optional)</label>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Short title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your note here..."
                rows={6}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveNote} disabled={!noteText.trim()}>
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              No notes yet. Add your first note!
            </CardContent>
          </Card>
        ) : (
          notes
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((note) => (
              <Card key={note.id} className={note.type === 'daily_report' ? 'bg-blue-50' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {note.title && (
                          <CardTitle>{note.title}</CardTitle>
                        )}
                        {note.type === 'daily_report' && (
                          <Badge variant="secondary">Auto-generated</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {format(new Date(note.timestamp), 'MMM d, yyyy - HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {note.type === 'manual' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(note)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(note)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{note.note}</p>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}