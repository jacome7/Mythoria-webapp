import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type StoryTextFieldProps = Omit<ComponentPropsWithoutRef<'textarea'>, 'onChange'> & {
  label: ReactNode;
  onChange: (value: string) => void;
};

export default function StoryTextField({
  label,
  onChange,
  className,
  ...textareaProps
}: StoryTextFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-medium text-base-content">{label}</span>
      <textarea
        {...textareaProps}
        className={`textarea textarea-bordered w-full ${className ?? ''}`}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
