"use client";

import { useState } from "react";
import { Listbox } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";

export default function RoleSelect({
  options = [],
  initialValue = "viewer",
  inputName = "role",
  inputId,
  ariaLabel = "Seleccionar rol",
  className = "",
}) {
  const [selected, setSelected] = useState(initialValue);
  return (
    <div className={className}>
      <input type="hidden" id={inputId} name={inputName} value={selected} />
      <Listbox value={selected} onChange={setSelected}>
        <div className="relative">
          <Listbox.Button
            aria-label={ariaLabel}
            className="h-10 w-48 rounded-lg border border-border bg-background text-foreground px-3 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          >
            <span>{selected}</span>
            <ChevronUpDownIcon
              className="h-5 w-5 opacity-70"
              aria-hidden="true"
            />
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-md ring-1 ring-black/5 dark:ring-white/10">
            {options.map((opt) => (
              <Listbox.Option
                key={opt}
                value={opt}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-3 pr-10 text-sm ${
                    active ? "bg-black/5 dark:bg-white/10" : ""
                  }`
                }
              >
                {({ selected: isSelected }) => (
                  <>
                    <span className="block truncate">{opt}</span>
                    {isSelected ? (
                      <span className="absolute inset-y-0 right-2 flex items-center">
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}
