'use client'

import { useEffect, useState } from 'react'
import { Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SystemCheck {
  id: string
  label: string
  status: 'pending' | 'checking' | 'success' | 'error'
}

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [checks, setChecks] = useState<SystemCheck[]>([
    { id: 'gps', label: 'GPS Permission', status: 'pending' },
    { id: 'internet', label: 'Internet Connectivity', status: 'pending' },
    { id: 'database', label: 'Emergency Database Sync', status: 'pending' },
  ])

  useEffect(() => {
    const runChecks = async () => {
      // Check GPS
      setChecks(prev => prev.map(c => c.id === 'gps' ? { ...c, status: 'checking' } : c))
      await new Promise(resolve => setTimeout(resolve, 800))
      setChecks(prev => prev.map(c => c.id === 'gps' ? { ...c, status: 'success' } : c))

      // Check Internet
      setChecks(prev => prev.map(c => c.id === 'internet' ? { ...c, status: 'checking' } : c))
      await new Promise(resolve => setTimeout(resolve, 600))
      setChecks(prev => prev.map(c => c.id === 'internet' ? { ...c, status: 'success' } : c))

      // Sync Database
      setChecks(prev => prev.map(c => c.id === 'database' ? { ...c, status: 'checking' } : c))
      await new Promise(resolve => setTimeout(resolve, 1000))
      setChecks(prev => prev.map(c => c.id === 'database' ? { ...c, status: 'success' } : c))

      // Complete after all checks
      await new Promise(resolve => setTimeout(resolve, 500))
      onComplete()
    }

    runChecks()
  }, [onComplete])

  const StatusIcon = ({ status }: { status: SystemCheck['status'] }) => {
    switch (status) {
      case 'pending':
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
      case 'checking':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background safe-area-inset">
      {/* Logo Section */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary">
            <Shield className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Smart Emergency
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Emergency Response Platform
          </p>
        </div>
      </div>

      {/* System Checks */}
      <div className="w-full max-w-xs space-y-3 px-8">
        {checks.map((check, index) => (
          <div
            key={check.id}
            className={cn(
              'flex items-center gap-3 rounded-lg bg-card px-4 py-3 transition-all duration-300',
              check.status === 'checking' && 'ring-2 ring-primary/20'
            )}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <StatusIcon status={check.status} />
            <span className={cn(
              'text-sm font-medium transition-colors',
              check.status === 'success' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground">
          Version 1.0.0
        </p>
      </div>
    </div>
  )
}
