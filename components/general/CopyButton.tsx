"use client"

import { useState, ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  textToCopy: string
  className?: string
  onCopy?: (success: boolean) => void
  children: ReactNode
  successContent?: ReactNode
}

export default function CopyButton({ textToCopy, className, onCopy, children, successContent }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      onCopy?.(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      onCopy?.(false)
    }
  }

  return (
    <button onClick={handleCopy} className={className} aria-label="Copy to clipboard">
      {copied ? (successContent || <Check size={16} className="text-emerald-400" />) : children}
    </button>
  )
}