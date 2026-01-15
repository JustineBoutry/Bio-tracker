import React from 'react';
import { useAccessibility } from './AccessibilityContext';
import { X, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function AccessibilitySettings({ onClose }) {
  const { fontSize, setFontSize } = useAccessibility();
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Type className="w-5 h-5" />
            Text Size
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Adjust the text size for better readability
          </p>
          
          <div className="flex gap-3">
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

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p style={{ fontSize: fontSize === 'small' ? '14px' : fontSize === 'large' ? '20px' : '16px' }}>
              Sample text: The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}