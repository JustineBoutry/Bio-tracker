import React from 'react';
import { useAccessibility } from './AccessibilityContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Eye } from 'lucide-react';

export default function AccessibilitySettings({ onClose }) {
  const { fontSize, setFontSize, colorMode, setColorMode, highContrast, setHighContrast } = useAccessibility();

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
          {/* Font Size */}
          <div>
            <label className="text-sm font-semibold mb-3 block">Font Size</label>
            <div className="flex gap-2">
              <Button
                variant={fontSize === 'small' ? 'default' : 'outline'}
                onClick={() => setFontSize('small')}
                className="flex-1"
              >
                Small
              </Button>
              <Button
                variant={fontSize === 'medium' ? 'default' : 'outline'}
                onClick={() => setFontSize('medium')}
                className="flex-1"
              >
                Medium
              </Button>
              <Button
                variant={fontSize === 'large' ? 'default' : 'outline'}
                onClick={() => setFontSize('large')}
                className="flex-1"
              >
                Large
              </Button>
            </div>
          </div>

          {/* Color Mode for Colorblindness */}
          <div>
            <label className="text-sm font-semibold mb-3 block">Color Mode</label>
            <div className="space-y-2">
              <Button
                variant={colorMode === 'normal' ? 'default' : 'outline'}
                onClick={() => setColorMode('normal')}
                className="w-full"
              >
                Normal
              </Button>
              <Button
                variant={colorMode === 'protanopia' ? 'default' : 'outline'}
                onClick={() => setColorMode('protanopia')}
                className="w-full"
              >
                Protanopia (Red-Blind)
              </Button>
              <Button
                variant={colorMode === 'deuteranopia' ? 'default' : 'outline'}
                onClick={() => setColorMode('deuteranopia')}
                className="w-full"
              >
                Deuteranopia (Green-Blind)
              </Button>
              <Button
                variant={colorMode === 'tritanopia' ? 'default' : 'outline'}
                onClick={() => setColorMode('tritanopia')}
                className="w-full"
              >
                Tritanopia (Blue-Blind)
              </Button>
            </div>
          </div>

          {/* High Contrast */}
          <div className="flex items-center gap-3 p-3 border rounded">
            <Checkbox
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={setHighContrast}
            />
            <label htmlFor="high-contrast" className="text-sm font-medium cursor-pointer flex-1">
              High Contrast Mode
            </label>
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