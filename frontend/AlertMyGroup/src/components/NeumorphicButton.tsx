import type { ReactNode } from 'react';

type Variant = 'default' | 'accent' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const variantClass: Record<Variant, string> = {
  default: 'nm-btn',
  accent:  'nm-btn border-2 border-nm-accent',
  success: 'nm-btn-success',
  danger:  'nm-btn-danger',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-5 py-3 text-base rounded-2xl',
  lg: 'px-6 py-4 text-lg rounded-2xl',
};

const textColor: Record<Variant, string> = {
  default: 'text-nm',
  accent:  'text-nm-accent',
  success: 'text-nm-success',
  danger:  'text-nm-danger',
};

export default function NeumorphicButton({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = '',
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        variantClass[variant],
        sizeClass[size],
        textColor[variant],
        fullWidth ? 'w-full' : '',
        'font-semibold focus:outline-none',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
