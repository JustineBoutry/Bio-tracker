import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { useExperiment } from "../components/ExperimentContext";
import { format } from "date-fns";

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
      });
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteText(note.note || "");
    setShowNoteForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this note?')) {
      deleteNoteMutation.mutate(id);
    }
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
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      {note.title && (
                        <CardTitle className="mb-1">{note.title}</CardTitle>
                      )}
                      <p className="text-sm text-gray-600">
                        {format(new Date(note.timestamp), 'MMM d, yyyy - HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(note)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(note.id)}
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