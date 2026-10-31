'use client';

import React, { useState } from 'react'
import { FormControl, FormField, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Eye, EyeOff } from 'lucide-react'

import { Control, FieldPath } from 'react-hook-form'
import { z } from 'zod'
import { authFormSchema } from '@/lib/utils'

const formSchema = authFormSchema('sign-up')

interface CustomInput {
  control: Control<z.infer<typeof formSchema>>,
  name: FieldPath<z.infer<typeof formSchema>>,
  label: string,
  placeholder: string
}

const CustomInput = ({ control, name, label, placeholder }: CustomInput) => {
  const isPassword = name === 'password';
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : 'text';

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <div className="form-item flex-1">
          <FormLabel className="form-label">
            {label}
          </FormLabel>
          <div className="flex w-full flex-col gap-2">
            <FormControl>
              <div className="relative">
                <Input
                  placeholder={placeholder}
                  className={isPassword ? 'input-class pr-10' : 'input-class'}
                  type={inputType}
                  autoComplete={isPassword ? 'current-password' : undefined}
                  {...field}
                />
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="flex-center absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-md text-ink-3 transition-colors hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                )}
              </div>
            </FormControl>
            <FormMessage className="form-message" />
          </div>
        </div>
      )}
    />
  )
}

export default CustomInput
