import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
  forwardRef,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface OptionData {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  wrapperClassName?: string;
  placeholder?: string;
}

const extractOptions = (children: ReactNode): OptionData[] => {
  const options: OptionData[] = [];
  const walk = (nodes: ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!child) return;
      if (React.isValidElement(child)) {
        if (child.type === 'option') {
          const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
          const value =
            props.value !== undefined
              ? String(props.value)
              : String(props.children ?? '');
          const label =
            typeof props.children === 'string' || typeof props.children === 'number'
              ? String(props.children)
              : (props.label || String(props.children ?? value));
          options.push({
            value,
            label,
            disabled: Boolean(props.disabled),
          });
        } else if (child.type === React.Fragment) {
          walk((child.props as { children?: ReactNode }).children);
        }
      }
    });
  };
  walk(children);
  return options;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      children,
      className,
      wrapperClassName = '',
      placeholder,
      value,
      defaultValue,
      onChange,
      disabled = false,
      required = false,
      name,
      id,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      ...restProps
    },
    forwardedRef
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const triggerId = selectId;
    const listboxId = `${selectId}-listbox`;

    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listboxRef = useRef<HTMLDivElement | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [position, setPosition] = useState<{
      top?: number;
      bottom?: number;
      left: number;
      width: number;
      maxHeight: number;
    }>({ left: 0, width: 0, maxHeight: 240 });

    const options = extractOptions(children);

    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState<string>(() => {
      if (defaultValue !== undefined) return String(defaultValue);
      return options.length > 0 ? options[0].value : '';
    });

    const currentValue = isControlled
      ? String(value ?? '')
      : uncontrolledValue;

    const selectedOption = options.find((opt) => opt.value === currentValue);
    const displayLabel = selectedOption
      ? selectedOption.label
      : (placeholder || currentValue || '');

    // Forward ref to hidden native select
    const setSelectRefs = useCallback(
      (node: HTMLSelectElement | null) => {
        hiddenSelectRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLSelectElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    // Keep hidden select DOM value in sync
    useEffect(() => {
      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = currentValue;
      }
    }, [currentValue]);

    // Calculate popup position based on trigger bounds & viewport space
    const updatePosition = useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      if (rect.bottom < 0 || rect.top > viewportHeight) {
        setIsOpen(false);
        return;
      }

      const margin = 4;
      const spaceBelow = viewportHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const preferredHeight = 240;

      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = openUp
        ? Math.min(preferredHeight, Math.max(100, spaceAbove))
        : Math.min(preferredHeight, Math.max(100, spaceBelow));

      const width = Math.max(rect.width, 140);
      let left = rect.left;
      if (left + width > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - 8 - width);
      }
      if (left < 8) {
        left = 8;
      }

      if (openUp) {
        setPosition({
          bottom: viewportHeight - rect.top + margin,
          left,
          width: Math.min(width, viewportWidth - 16),
          maxHeight,
        });
      } else {
        setPosition({
          top: rect.bottom + margin,
          left,
          width: Math.min(width, viewportWidth - 16),
          maxHeight,
        });
      }
    }, []);

    useLayoutEffect(() => {
      if (isOpen) {
        updatePosition();
      }
    }, [isOpen, updatePosition]);

    // Reposition on window scroll or resize (capture all scrollable ancestors)
    useEffect(() => {
      if (!isOpen) return;
      const handleScroll = (e: Event) => {
        if (listboxRef.current && listboxRef.current.contains(e.target as Node)) {
          return;
        }
        updatePosition();
      };
      const handleResize = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }, [isOpen, updatePosition]);

    // Close on outside pointerdown
    useEffect(() => {
      if (!isOpen) return;
      const handlePointerDown = (e: PointerEvent) => {
        const target = e.target as Node;
        if (
          triggerRef.current?.contains(target) ||
          listboxRef.current?.contains(target)
        ) {
          return;
        }
        setIsOpen(false);
      };
      document.addEventListener('pointerdown', handlePointerDown, true);
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown, true);
      };
    }, [isOpen]);

    // Capture Escape key to close dropdown before modal sheets catch it
    useEffect(() => {
      if (!isOpen) return;
      const handleCaptureKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      };
      document.addEventListener('keydown', handleCaptureKey, true);
      return () => {
        document.removeEventListener('keydown', handleCaptureKey, true);
      };
    }, [isOpen]);

    // Scroll active item into view
    useEffect(() => {
      if (isOpen && activeIndex >= 0 && listboxRef.current) {
        const el = listboxRef.current.querySelector<HTMLElement>(
          `[data-index="${activeIndex}"]`
        );
        el?.scrollIntoView({ block: 'nearest' });
      }
    }, [activeIndex, isOpen]);

    const selectOption = (optValue: string) => {
      if (disabled) return;
      if (!isControlled) {
        setUncontrolledValue(optValue);
      }
      const selectEl = hiddenSelectRef.current;
      if (selectEl) {
        const proto = window.HTMLSelectElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(selectEl, optValue);
        } else {
          selectEl.value = optValue;
        }

        // Fire controlled React onChange handler directly
        if (onChange) {
          const syntheticEvent = {
            target: selectEl,
            currentTarget: selectEl,
            persist: () => {},
            preventDefault: () => {},
            stopPropagation: () => {},
            nativeEvent: new Event('change'),
          } as unknown as React.ChangeEvent<HTMLSelectElement>;
          onChange(syntheticEvent);
        }

      }
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    const getNextIndex = (current: number, step: 1 | -1): number => {
      const len = options.length;
      if (len === 0) return -1;
      let next = current + step;
      while (next >= 0 && next < len) {
        if (!options[next].disabled) return next;
        next += step;
      }
      return current;
    };

    const handleTriggerClick = () => {
      if (disabled) return;
      if (!isOpen) {
        const currIdx = options.findIndex((o) => o.value === currentValue);
        const firstEnabled = options.findIndex((o) => !o.disabled);
        setActiveIndex(currIdx >= 0 && !options[currIdx].disabled ? currIdx : firstEnabled);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (!isOpen) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          const currIdx = options.findIndex((o) => o.value === currentValue);
          const firstEnabled = options.findIndex((o) => !o.disabled);
          setActiveIndex(currIdx >= 0 && !options[currIdx].disabled ? currIdx : firstEnabled);
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => getNextIndex(prev, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => getNextIndex(prev, -1));
          break;
        case 'Home':
          e.preventDefault();
          {
            const first = options.findIndex((o) => !o.disabled);
            if (first >= 0) setActiveIndex(first);
          }
          break;
        case 'End':
          e.preventDefault();
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i].disabled) {
              setActiveIndex(i);
              break;
            }
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < options.length) {
            const opt = options[activeIndex];
            if (!opt.disabled) {
              selectOption(opt.value);
            }
          }
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    };

    const activeOption = activeIndex >= 0 ? options[activeIndex] : null;

    // Separate wrapper layout classes vs trigger style classes
    const isChipSelect = className?.includes('chip-select');
    const isMaxWidth = className?.includes('max-w-');
    const isWAuto = className?.includes('w-auto');

    let wrapperClasses = 'edgelink-select-wrapper';
    if (isMaxWidth || isWAuto || isChipSelect) {
      if (className?.includes('max-w-[44%]')) wrapperClasses += ' w-[144px] max-w-[44%] shrink-0';
      if (isWAuto) wrapperClasses += ' w-auto';
    } else {
      wrapperClasses += ' w-full';
    }
    if (wrapperClassName) {
      wrapperClasses += ` ${wrapperClassName}`;
    }

    const triggerClasses = [
      'edgelink-select-trigger',
      (className || '').replace('max-w-[44%]', ''),
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {/* Real hidden select for form integration & FormData compatibility */}
        <select
          ref={setSelectRefs}
          id={`${selectId}-native`}
          name={name}
          disabled={disabled}
          required={required}
          value={currentValue}
          onChange={() => {}}
          {...restProps}
          hidden
          tabIndex={-1}
          onInvalid={(event) => {
            // Keep native validation focus on the visible control.
            event.preventDefault();
            triggerRef.current?.focus();
            restProps.onInvalid?.(event);
          }}
        >
          {children}
        </select>

        {/* Accessible interactive trigger */}
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            isOpen && activeOption ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-required={required}
          className={triggerClasses}
          onClick={handleTriggerClick}
          onKeyDown={handleKeyDown}
        >
          <span className="edgelink-select-label truncate">{displayLabel}</span>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            className="edgelink-select-arrow"
          />
        </button>

        {/* Fixed portal listbox detached from scroll containers */}
        {isOpen &&
          createPortal(
            <div
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby || triggerId}
              className="edgelink-select-listbox"
              style={{
                position: 'fixed',
                top: position.top !== undefined ? `${position.top}px` : undefined,
                bottom:
                  position.bottom !== undefined ? `${position.bottom}px` : undefined,
                left: `${position.left}px`,
                width: `${position.width}px`,
                maxHeight: `${position.maxHeight}px`,
                zIndex: 99999,
              }}
            >
              {options.map((opt, idx) => {
                const isSelected = opt.value === currentValue;
                const isActive = idx === activeIndex;

                let optClass = 'edgelink-select-option';
                if (isSelected) optClass += ' is-selected';
                if (isActive) optClass += ' is-active';
                if (opt.disabled) optClass += ' is-disabled';

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    data-index={idx}
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    className={optClass}
                    onMouseDown={(e) => {
                      // Prevent stealing focus from trigger button (preserves Sheet focus trap)
                      e.preventDefault();
                    }}
                    onMouseEnter={() => {
                      if (!opt.disabled) setActiveIndex(idx);
                    }}
                    onClick={() => {
                      if (!opt.disabled) selectOption(opt.value);
                    }}
                  >
                    <span className="edgelink-select-option-label truncate">
                      {opt.label}
                    </span>
                    {isSelected && (
                      <Check
                        size={14}
                        strokeWidth={1.75}
                        className="edgelink-select-check"
                      />
                    )}
                  </div>
                );
              })}
            </div>,
            document.body
          )}
      </div>
    );
  }
);

Select.displayName = 'Select';
