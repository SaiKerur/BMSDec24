import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
};

const cls: Record<Variant, string> = {
  primary: 'btn btn-primary',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-danger',
};

export function Button({ variant = 'primary', block, className = '', children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`${cls[variant]}${block ? ' btn-block' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
