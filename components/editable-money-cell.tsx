import React, { useState } from 'react';
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface EditableMoneyCellProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export function EditableMoneyCell({ value, onChange, label, className }: EditableMoneyCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  const formatMoney = (val: number): string => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `$${(val / 1000).toFixed(0)}K`;
    } else {
      return `$${val.toFixed(0)}`;
    }
  };

  const handleSave = () => {
    const newValue = parseFloat(tempValue) || 0;
    onChange(newValue);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between">
      {label && <span className="text-sm text-gray-400">{label}</span>}
      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className={`p-1 h-auto font-normal ${className}`}>
            {formatMoney(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">{label || 'Edit Value'}</h4>
              <p className="text-sm text-muted-foreground">
                Enter the new value (in dollars).
              </p>
            </div>
            <div className="grid gap-2">
              <Input
                id="value"
                value={tempValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempValue(e.target.value)}
                className="bg-gray-700 text-gray-100"
              />
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}