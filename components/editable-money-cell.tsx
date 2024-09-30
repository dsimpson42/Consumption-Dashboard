import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EditableMoneyCellProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
  icon?: React.ReactNode;
  tooltip?: string;
}

export function EditableMoneyCell({ value, onChange, label, className, icon, tooltip }: EditableMoneyCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const formatMoney = (val: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(val);
  };

  const handleSave = () => {
    const newValue = parseFloat(tempValue) || 0;
    onChange(newValue);
    setIsEditing(false);
  };

  return (
    <div className={`flex items-center justify-between p-2 bg-gray-700 rounded-md ${className}`}>
      <div className="flex items-center space-x-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover open={isEditing} onOpenChange={setIsEditing}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="p-1 h-auto font-normal text-gray-200">
                  {formatMoney(value)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-gray-800 border-gray-700">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none text-gray-200">{label || 'Edit Value'}</h4>
                    <p className="text-sm text-gray-400">
                      Enter the new value (in dollars).
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Input
                      ref={inputRef}
                      id="value"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      className="bg-gray-700 text-gray-200"
                    />
                    <Button onClick={handleSave}>Save</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}