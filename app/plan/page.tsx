'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PlanRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/plans') }, [router])
  return null
}
