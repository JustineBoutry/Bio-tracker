import React from 'react';
import { useAccessibility } from './AccessibilityContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Eye } from 'lucide-react';

export default function AccessibilitySettings({ onClose }) {
  const { highContrast, setHighContrast } = useAccessibility();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <CardTitle>Accessibility Settings</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* High Contrast */}
          <div className="space-y-3">
            <label className="text-sm font-semibold block">High Contrast Mode</label>
            <p className="text-sm text-gray-600">
              Enhances text and interface contrast for better visibility
            </p>
            <div className="flex gap-2">
              <Button
                variant={!highContrast ? 'default' : 'outline'}
                onClick={() => setHighContrast(false)}
                className="flex-1"
              >
                Off
              </Button>
              <Button
                variant={highContrast ? 'default' : 'outline'}
                onClick={() => setHighContrast(true)}
                className="flex-1"
              >
                On
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}