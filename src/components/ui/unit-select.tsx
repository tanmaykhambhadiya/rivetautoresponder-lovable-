import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useUnits } from '@/hooks/useUnits';

interface UnitSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

export function UnitSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select unit...",
  disabled = false,
  allowCustom = false
}: UnitSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');
  const { activeUnits, isLoading } = useUnits();

  const selectedUnit = activeUnits.find(u => u.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between"
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput 
            placeholder="Search units..." 
            value={customValue}
            onValueChange={setCustomValue}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom && customValue ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    onValueChange(customValue);
                    setOpen(false);
                    setCustomValue('');
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use "{customValue}"
                </Button>
              ) : (
                "No units found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {activeUnits.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={unit.name}
                  onSelect={() => {
                    onValueChange(unit.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === unit.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <span>{unit.name}</span>
                    {unit.hospital && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({unit.hospital})
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface MultiUnitSelectProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiUnitSelect({
  values,
  onValuesChange,
  placeholder = "Select units...",
  disabled = false
}: MultiUnitSelectProps) {
  const [open, setOpen] = React.useState(false);
  const { activeUnits, isLoading } = useUnits();

  const toggleUnit = (unitName: string) => {
    if (values.includes(unitName)) {
      onValuesChange(values.filter(v => v !== unitName));
    } else {
      onValuesChange([...values, unitName]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between min-h-[40px] h-auto"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {values.length > 0 ? (
              values.map((val) => (
                <Badge key={val} variant="secondary" className="text-xs">
                  {val}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search units..." />
          <CommandList>
            <CommandEmpty>No units found.</CommandEmpty>
            <CommandGroup>
              {activeUnits.map((unit) => (
                <CommandItem
                  key={unit.id}
                  value={unit.name}
                  onSelect={() => toggleUnit(unit.name)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      values.includes(unit.name) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <span>{unit.name}</span>
                    {unit.hospital && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({unit.hospital})
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
