import { useState } from 'react'
import './PasswordField.css'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  inputClassName?: string
  labelClassName?: string
  disabled?: boolean
  required?: boolean
  minLength?: number
  describedBy?: string
  invalid?: boolean
}

function EyeIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
        <path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17.9 17.9 0 0 1-3.2 4.2" />
        <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.6 7 10 7c1.5 0 2.8-.3 4-.8" />
      </g>
    </svg>
  )
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  inputClassName,
  labelClassName,
  disabled = false,
  required = false,
  minLength,
  describedBy,
  invalid = false,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="password-field">
        <input
          id={id}
          className={`${inputClassName ?? ''} password-field__input`.trim()}
          type={isVisible ? 'text' : 'password'}
          name="password"
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setIsVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={isVisible}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </>
  )
}
