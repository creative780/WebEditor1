import React from "react";
import { ChromePicker, CirclePicker } from "react-color";

interface ColorPickerEditorProps {
  value: string;    // Current color value
  onColorChange: (color: string) => void; // Callback when color changes
}

function ColorPickerEditor({ value, onColorChange }:ColorPickerEditorProps) {
  return (
    <div className="space-y-4">
      <ChromePicker
        color={value}
        onChange={(e) => onColorChange(e.hex)}
        className=""
      />

      <CirclePicker color={value} onChange={(e) => onColorChange(e.hex)} />
    </div>
  );
}

export default ColorPickerEditor;
